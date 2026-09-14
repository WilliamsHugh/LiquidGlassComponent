const assert = require('node:assert/strict');
const { sample } = require('../glass-optics.js');
for (const bezel of [4, 10, 20]) {
  for (let d = 0; d < bezel; d += .01) {
    const result = sample(d, bezel, bezel * .9);
    assert.ok(Object.values(result).every(Number.isFinite), 'no singularities at the rim');
    assert.ok(result.fresnel >= 0 && result.fresnel <= 1, 'reflection energy bounded');
    assert.ok(result.offset <= 0 && result.offset >= -bezel, 'inward, bounded refraction');
  }
  assert.equal(sample(bezel, bezel, bezel).offset, 0, 'flat plateau is neutral');
  assert.ok(Math.abs(sample(bezel - .001, bezel, bezel).offset) < .001, 'smooth plateau transition');
  assert.ok(sample(.001, bezel, bezel).fresnel > sample(bezel / 2, bezel, bezel).fresnel, 'grazing angles reflect more');
  assert.ok(Math.abs(sample(bezel / 2, bezel, bezel, 1).offset) < 1e-12, 'matching media do not refract');
}
console.log('Optical invariants passed.');
