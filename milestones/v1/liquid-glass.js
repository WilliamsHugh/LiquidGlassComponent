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
    if (!width || !height) return;
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
    const rim = Math.min(14, Math.min(width, height) * .2);
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
        // Convex circular rim: Snell's law gives the inward sample offset.
        // The flat interior has zero slope and therefore no displacement.
        let bend = 0;
        if (distance <= 0 && depth < rim) {
          const t = Math.max(.001, depth / rim);
          const height = Math.sqrt(1 - (1 - t) ** 2);
          const incident = Math.atan((1 - t) / height);
          const transmitted = Math.asin(Math.sin(incident) / 1.5);
          bend = -Math.tan(incident - transmitted) * height * .95;
        }
        const i = (y * width + x) * 4;
        pixels.data[i] = Math.round(128 + nx * bend * 115);
        pixels.data[i + 1] = Math.round(128 + ny * bend * 115);
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
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
    const displacement = document.createElementNS(ns, 'feDisplacementMap');
    for (const [name, value] of Object.entries({in:'SourceGraphic', in2:'rim', scale:String(rim * 1.7), xChannelSelector:'R', yChannelSelector:'G'})) displacement.setAttribute(name, value);
    filter.append(map, displacement);
    if (previous) previous.filter.replaceWith(filter);
    else defs.append(filter);
    entries.set(element, {key, filter});
    element.style.setProperty('--glass-filter', `url("#${filterId}")`);
    element.classList.add('glass-refractive');
  }

  surfaces.forEach((element, index) => {
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    element.classList.add('liquid-surface');
    if (refractive) {
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
