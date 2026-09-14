/* Optical model for a stylized UI lens; not Apple's proprietary material. */
((root) => {
  function sample(depth, bezel, thickness, ior = 1.5) {
    if (depth < 0 || depth >= bezel) return { offset: 0, fresnel: 0, slope: 0, height: 1 };
    const t = Math.max(.0001, depth / bezel);
    // Superellipse cross-section: steep lip, smooth flat interior (zero slope).
    const u = 1 - t;
    const height = Math.pow(1 - u ** 4, .25);
    const slope = thickness / bezel * u ** 3 / height ** 3;
    const incident = Math.atan(slope);
    const ci = Math.cos(incident);
    const transmitted = Math.asin(Math.sin(incident) / ior);
    const ct = Math.cos(transmitted);
    const rs = ((ci - ior * ct) / (ci + ior * ct)) ** 2;
    const rp = ((ior * ci - ct) / (ior * ci + ct)) ** 2;
    const fresnel = (rs + rp) / 2;
    const offset = -Math.tan(incident - transmitted) * thickness * height * (1 - fresnel);
    return { offset, fresnel, slope, height };
  }
  const api = { sample };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GlassOptics = api;
})(globalThis);
