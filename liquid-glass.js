// Browser approximation, not a port of UIKit's proprietary UIGlassEffect.
// A rounded-rectangle normal map bends the sampled backdrop at the glass rim.
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden';
  const defs = document.createElementNS(ns, 'defs');
  svg.append(defs);
  document.body.append(svg);
  // SVG backdrop filters currently use the Chromium path. Other engines keep
  // the CSS blur/highlight material, rather than losing the backdrop entirely.
  const refractive = /Chrome|Chromium|Edg\//.test(navigator.userAgent)
    && !/OPR\//.test(navigator.userAgent)
    && CSS.supports('backdrop-filter', 'url("#glass-test")');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = document.querySelectorAll('.glass, .experience, .play-button, .card-content, .card-arrow');
  const entries = new WeakMap();

  function buildMap(element, index) {
    const width = Math.round(element.clientWidth);
    const height = Math.round(element.clientHeight);
    if (!width || !height || width * height > 2000000) return;
    const radiusValue = getComputedStyle(element).borderTopLeftRadius;
    const radius = Math.min(width / 2, height / 2, radiusValue.includes('%')
      ? Math.min(width, height) * parseFloat(radiusValue) / 100 : parseFloat(radiusValue));
    const previous = entries.get(element);
    const key = `${width}:${height}:${radius}`;
    if (previous?.key === key) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(width, height);
    const highlight = context.createImageData(width, height);
    const rim = Math.min(20, Math.min(width, height) * .22);
    const thickness = rim * .9;
    const displacementScale = thickness * 2;
    // A small precomputed profile avoids trigonometry for every map pixel.
    const profile = Array.from({ length: 513 }, (_, i) => GlassOptics.sample(i / 512 * rim, rim, thickness));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = x + .5 - width / 2;
        const py = y + .5 - height / 2;
        const qx = Math.abs(px) - (width / 2 - radius);
        const qy = Math.abs(py) - (height / 2 - radius);
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        const length = Math.hypot(ox, oy);
        const distance = length + Math.min(Math.max(qx, qy), 0) - radius;
        let nx = 0, ny = 0;
        if (length > 0) { nx = ox / length * Math.sign(px); ny = oy / length * Math.sign(py); }
        else if (qx > qy) nx = Math.sign(px);
        else ny = Math.sign(py);
        const depth = Math.max(0, -distance);
        const optics = distance <= 0 && depth < rim ? profile[Math.min(512, Math.round(depth / rim * 512))] : profile[512];
        const i = (y * width + x) * 4;
        pixels.data[i] = Math.round(128 + nx * optics.offset / displacementScale * 255);
        pixels.data[i + 1] = Math.round(128 + ny * optics.offset / displacementScale * 255);
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
        // Fresnel rim + soft bevel lobe. The interior is fully transparent.
        // Lighting direction is applied in CSS so pointer motion never rebuilds maps.
        const coverage = Math.max(0, Math.min(1, .5 - distance));
        const crest = Math.exp(-(((depth - 1.2) / 1.05) ** 2));
        const bevel = Math.min(1, optics.slope) * Math.exp(-depth / (rim * .32));
        const reflection = Math.min(.95, optics.fresnel * .65 + crest * .64 + bevel * .22);
        highlight.data[i] = highlight.data[i + 1] = highlight.data[i + 2] = 255;
        highlight.data[i + 3] = Math.round(reflection * coverage * 255);
      }
    }
    context.putImageData(pixels, 0, 0);
    const filter = document.createElementNS(ns, 'filter');
    const filterId = `liquid-rim-${index}`;
    for (const [name, value] of Object.entries({id:filterId, x:'0', y:'0', width:String(width), height:String(height), filterUnits:'userSpaceOnUse', 'color-interpolation-filters':'sRGB'})) filter.setAttribute(name, value);
    const map = document.createElementNS(ns, 'feImage');
    map.setAttribute('href', canvas.toDataURL());
    map.setAttribute('width', width);
    map.setAttribute('height', height);
    map.setAttribute('result', 'rim');
    // 128/255 is not 0.5. Correct it so the plateau never shifts the backdrop.
    const neutral = document.createElementNS(ns, 'feComponentTransfer');
    neutral.setAttribute('in', 'rim');
    neutral.setAttribute('result', 'neutral-rim');
    for (const channel of ['R', 'G']) {
      const fn = document.createElementNS(ns, `feFunc${channel}`);
      fn.setAttribute('type', 'linear');
      fn.setAttribute('slope', '1');
      fn.setAttribute('intercept', String(.5 - 128 / 255));
      neutral.append(fn);
    }
    const displacement = document.createElementNS(ns, 'feDisplacementMap');
    for (const [name, value] of Object.entries({in:'SourceGraphic', in2:'neutral-rim', scale:String(displacementScale), xChannelSelector:'R', yChannelSelector:'G'})) displacement.setAttribute(name, value);
    filter.append(map, neutral, displacement);
    if (previous) previous.filter.replaceWith(filter);
    else defs.append(filter);
    entries.set(element, {key, filter});
    element.style.setProperty('--glass-filter', `url("#${filterId}")`);
    context.putImageData(highlight, 0, 0);
    element.style.setProperty('--glass-rim-map', `url("${canvas.toDataURL()}")`);
    element.classList.add('glass-optical-rim');
    if (refractive) element.classList.add('glass-refractive');
  }

  surfaces.forEach((element, index) => {
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    element.classList.add('liquid-surface');
    {
      const observer = new ResizeObserver(() => buildMap(element, index));
      observer.observe(element);
    }
    let frame;
    element.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        element.style.setProperty('--glass-x', `${x * 100}%`);
        element.style.setProperty('--glass-y', `${y * 100}%`);
        element.style.setProperty('--glass-angle', `${Math.atan2(y - .5, x - .5) * 180 / Math.PI + 90}deg`);
        element.classList.add('glass-lit');
      });
    });
    element.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      element.classList.remove('glass-lit');
      element.style.removeProperty('--glass-angle');
    });
  });
})();
