// Run against a local Chromium with --remote-debugging-port=9225.
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:9225/json')).json();
const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, {once:true}));
const pending = new Map();
const errors = [];
let id = 0;
ws.addEventListener('message', ({data}) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(message.error) : request.resolve(message.result);
  }
});
function send(method, params={}) { return new Promise((resolve,reject) => { pending.set(++id,{resolve,reject}); ws.send(JSON.stringify({id,method,params})); }); }
async function evaluate(expression) {
  const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause = ms => new Promise(r=>setTimeout(r,ms));
const artifacts = new URL('../artifacts/',import.meta.url);
await mkdir(artifacts,{recursive:true});
async function shot(name,clip) {
  const result = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,...(clip ? {clip} : {})});
  await writeFile(new URL(name,artifacts),Buffer.from(result.data,'base64'));
  return result.data;
}
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
for (const version of ['v1','v2']) {
  const url = new URL(version === 'v1' ? '../milestones/v1/index.html' : '../index.html',import.meta.url).href;
  await send('Page.navigate',{url}); await pause(500);
  for (const width of [1440,390,320,768]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false}); await pause(250);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),`${version} ${width} overflow`);
    await shot(`${version}-${width}.png`);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.querySelector('.header').style.background='repeating-linear-gradient(90deg,#332533 0 4px,#f8eaf3 4px 16px)';document.querySelector('.nav').style.setProperty('--glass-blur','0px');scrollTo(0,0)`);
  await pause(300);
  const withLens = await shot(`${version}-rim-on.png`,{x:500,y:0,width:450,height:114,scale:2});
  await evaluate(`document.querySelector('.nav').classList.remove('glass-refractive')`); await pause(150);
  const withoutLens = await shot(`${version}-rim-off.png`,{x:500,y:0,width:450,height:114,scale:2});
  assert.notEqual(withLens,withoutLens,`${version} displacement must affect pixels`);
  if (version === 'v2') {
    assert.equal(await evaluate(`document.querySelectorAll('.glass-optical-rim').length`),15);
    const checks = await evaluate(`(async()=>{
      const checks={};
      document.querySelector('#next').click();checks.next=document.querySelector('#track-title').textContent==='Ocean air';
      document.querySelector('#previous').click();checks.previous=document.querySelector('#track-title').textContent==='Alpine dusk';
      document.querySelector('#favorite').click();checks.favorite=document.querySelector('#favorite').getAttribute('aria-pressed')==='true';
      document.querySelector('#play').click();await new Promise(r=>setTimeout(r,200));checks.play=document.querySelector('#play').getAttribute('aria-pressed')==='true';
      document.querySelector('#play').click();await new Promise(r=>setTimeout(r,100));checks.pause=document.querySelector('#play').getAttribute('aria-pressed')==='false';
      return checks;
    })()`);
    assert.ok(Object.values(checks).every(Boolean),JSON.stringify(checks));
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await evaluate(`document.querySelector('.nav').dispatchEvent(new PointerEvent('pointermove',{clientX:600,clientY:50,pointerType:'mouse'}))`); await pause(100);
    assert.equal(await evaluate(`document.querySelector('.nav').classList.contains('glass-lit')`),false);
    console.log('Interaction and reduced-motion checks passed.',checks);
  }
}
assert.equal(errors.length,0,JSON.stringify(errors));
console.log('V1/V2 rendered at 4 widths; actual refraction verified. Screenshots in artifacts/.');
await send('Browser.close');
ws.close();
