const scenes = {
  dusk: { title: 'Alpine dusk', subtitle: 'Soft wind · A slower state of mind', cutoff: 420, rate: 0.12 },
  ocean: { title: 'Ocean air', subtitle: 'Rolling waves · Room to breathe', cutoff: 900, rate: 0.18 },
  forest: { title: 'Forest rain', subtitle: 'Gentle rainfall · Ground yourself', cutoff: 2400, rate: 0.07 },
};
let selected = 'dusk';
let playing = false;
let audio;
const favorites = new Set();
const playButton = document.querySelector('#play');

// Generate a continuous ambient sound locally; no audio downloads or autoplay.
function createAudio() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.025 * white) / 1.025;
    samples[i] = last * 4;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = scenes[selected].cutoff;
  const swell = context.createGain();
  swell.gain.value = 0.65;
  const oscillator = context.createOscillator();
  oscillator.frequency.value = scenes[selected].rate;
  const modulation = context.createGain();
  modulation.gain.value = 0.3;
  oscillator.connect(modulation).connect(swell.gain);
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(swell).connect(gain).connect(context.destination);
  source.start();
  oscillator.start();
  return { context, gain, filter, oscillator };
}

function updatePlayer() {
  const scene = scenes[selected];
  const favorite = document.querySelector('#favorite');
  favorite.setAttribute('aria-pressed', String(favorites.has(selected)));
  favorite.setAttribute('aria-label', `${favorites.has(selected) ? 'Unsave' : 'Save'} ${scene.title}`);
  document.querySelector('.hero').dataset.scene = selected;
  document.querySelector('#track-title').textContent = scene.title;
  document.querySelector('#track-subtitle').textContent = scene.subtitle;
  document.querySelectorAll('.scene').forEach(button => {
    const active = button.dataset.scene === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('.player').classList.toggle('playing', playing);
  playButton.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${scene.title}`);
  playButton.setAttribute('aria-pressed', String(playing));
  playButton.innerHTML = playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m9 5 11 7-11 7z"/></svg>';
  document.querySelector('#audio-status').textContent = playing ? 'SOUND ON · TAKE YOUR TIME' : 'SOUND OFF · WORLD ON PAUSE';
  if (audio) {
    audio.filter.frequency.setTargetAtTime(scene.cutoff, audio.context.currentTime, 0.6);
    audio.oscillator.frequency.setTargetAtTime(scene.rate, audio.context.currentTime, 0.6);
    audio.gain.gain.setTargetAtTime(playing ? document.querySelector('#volume').value / 100 : 0, audio.context.currentTime, 0.2);
  }
}

playButton.addEventListener('click', async () => {
  try {
    audio ??= createAudio();
    await audio.context.resume();
    playing = !playing;
    updatePlayer();
  } catch {
    document.querySelector('#audio-status').textContent = 'AUDIO UNAVAILABLE IN THIS BROWSER';
  }
});
document.querySelector('#volume').addEventListener('input', updatePlayer);
document.querySelector('#favorite').addEventListener('click', () => {
  if (favorites.has(selected)) favorites.delete(selected);
  else favorites.add(selected);
  updatePlayer();
});
for (const [id, direction] of [['previous', -1], ['next', 1]]) {
  document.querySelector(`#${id}`).addEventListener('click', () => {
    const keys = Object.keys(scenes);
    selected = keys[(keys.indexOf(selected) + direction + keys.length) % keys.length];
    updatePlayer();
  });
}
document.querySelectorAll('[data-scene].scene, [data-select]').forEach(button => {
  button.addEventListener('click', () => {
    selected = button.dataset.select || button.dataset.scene;
    updatePlayer();
    if (button.dataset.select) document.querySelector('#home').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
});
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) document.querySelectorAll('.nav a').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  }
}, { threshold: 0.35 });
document.querySelectorAll('main > section').forEach(section => observer.observe(section));
document.querySelector('#year').textContent = new Date().getFullYear();
updatePlayer();
