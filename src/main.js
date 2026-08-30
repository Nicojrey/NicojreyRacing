const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');

const SAVE_KEY = 'nicojrey-racing-save-v1';
const TRACKS = [
  { name: 'Neon Bay GP', laps: 3, length: 4300, scenery: '#0ff', grip: 1, curves: [0, .7, -.4, .9, 0, -1.1, .45, 0], weather: 'clear', time: 'night' },
  { name: 'Storm Valley', laps: 4, length: 3900, scenery: '#7dd3fc', grip: .82, curves: [.4, -.8, 1.1, -.2, -1.0, .65], weather: 'rain', time: 'day' },
  { name: 'Sunset Speedway', laps: 5, length: 5200, scenery: '#fb923c', grip: .94, curves: [-.3, -.9, 0, .8, .35, -1.2, .5], weather: 'wind', time: 'sunset' },
  { name: 'Moonlit Marina', laps: 3, length: 4700, scenery: '#c084fc', grip: .9, curves: [1.0, -.3, -.75, .9, 0, -.4], weather: 'fog', time: 'night' }
];
const CARS = [
  { name: 'NJR Falcon', speed: 1.0, accel: 1.0, handling: 1.0, color: '#00e5ff' },
  { name: 'NJR Viper', speed: 1.12, accel: .92, handling: .9, color: '#ff2bd6' },
  { name: 'NJR Comet', speed: .94, accel: 1.14, handling: 1.08, color: '#ffe45c' }
];
const DEFAULT_SAVE = { njc: 750, car: 0, track: 0, livery: '#00e5ff', upgrades: { engine: 0, turbo: 0, grip: 0 }, highscores: [], music: true, sfx: true, assists: true, championship: { points: 0, round: 0 } };
let save = loadSave();
let keys = {}, pads = {}, pointer = { left: false, right: false, gas: false, brake: false, nitro: false };
let scene = 'intro', last = 0, audio, race;

function loadSave(){ try { return { ...DEFAULT_SAVE, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { return structuredClone(DEFAULT_SAVE); } }
function persist(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
function resize(){ canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
addEventListener('resize', resize); resize();
addEventListener('keydown', e => { keys[e.code] = true; if(e.code === 'Enter' && scene !== 'race') startRace(false); });
addEventListener('keyup', e => keys[e.code] = false);

class AudioRig {
  constructor(){ this.ctx = null; this.music = null; this.engine = null; }
  init(){ if(this.ctx) return; this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.gain.value = .18; this.master.connect(this.ctx.destination); }
  start(){ if(!save.music && !save.sfx) return; this.init(); this.stop(); const now = this.ctx.currentTime; if(save.music){ this.music = this.ctx.createOscillator(); const g = this.ctx.createGain(); this.music.type='sawtooth'; this.music.frequency.value=110; g.gain.value=.035; this.music.connect(g).connect(this.master); this.music.start(now); } if(save.sfx){ this.engine = this.ctx.createOscillator(); this.engine.type='square'; this.engine.frequency.value=80; const eg=this.ctx.createGain(); eg.gain.value=.06; this.engine.connect(eg).connect(this.master); this.engine.start(now); } }
  update(rpm){ if(this.engine) this.engine.frequency.setTargetAtTime(70 + rpm * 280, this.ctx.currentTime, .04); }
  crash(){ if(!save.sfx) return; this.init(); const n=this.ctx.createBufferSource(), b=this.ctx.createBuffer(1, this.ctx.sampleRate*.25, this.ctx.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length); const g=this.ctx.createGain(); g.gain.value=.25; n.buffer=b; n.connect(g).connect(this.master); n.start(); }
  stop(){ ['music','engine'].forEach(k => { try{ this[k]?.stop(); }catch{} this[k]=null; }); }
}
audio = new AudioRig();

function startRace(championship){
  const track = TRACKS[save.track], car = CARS[save.car];
  race = { track, car, championship, z:0, speed:0, lane:0, lap:1, nitro:1, drs:0, time:0, shake:0, sparks:[], rivals:Array.from({length:5},(_,i)=>({z: -650 - i*340, lane:(i%3-1)*.45, color:['#f43','#7c3','#38f','#fc0','#fff'][i], name:`AI ${i+1}`})), place:6, finished:false };
  scene='race'; audio.start();
}
function finishRace(){
  if(race.finished) return; race.finished=true; const reward = Math.max(80, Math.round(650 - race.time*7 + (6-race.place)*120)); save.njc += reward; save.highscores.push({ track: race.track.name, car: race.car.name, time: race.time.toFixed(2), place: race.place, date: new Date().toISOString().slice(0,10) }); save.highscores = save.highscores.sort((a,b)=>a.time-b.time).slice(0,8); if(race.championship){ save.championship.points += [25,18,15,12,10,8][race.place-1] || 4; save.championship.round = (save.championship.round + 1) % TRACKS.length; save.track = save.championship.round; } persist(); scene='results'; audio.stop(); }
function input(){
  const gp = navigator.getGamepads?.()[0];
  return { left: keys.ArrowLeft||keys.KeyA||pointer.left||(gp?.axes[0] < -.25), right: keys.ArrowRight||keys.KeyD||pointer.right||(gp?.axes[0] > .25), gas: keys.ArrowUp||keys.KeyW||pointer.gas||gp?.buttons[7]?.pressed, brake: keys.ArrowDown||keys.KeyS||pointer.brake||gp?.buttons[6]?.pressed, nitro: keys.Space||keys.ShiftLeft||pointer.nitro||gp?.buttons[0]?.pressed };
}
function update(dt){
  if(scene !== 'race') return; const I=input(), up=save.upgrades, grip=race.track.grip + up.grip*.04, max=(265 + up.engine*22)*race.car.speed, acc=(95+up.turbo*12)*race.car.accel;
  race.time += dt; if(I.gas) race.speed += acc*dt; else race.speed -= 45*dt; if(I.brake) race.speed -= 160*dt; if(I.nitro && race.nitro>0){ race.speed += 230*dt; race.nitro -= .28*dt; race.drs=.25; } else { race.nitro = Math.min(1, race.nitro + .035*dt); race.drs=Math.max(0,race.drs-dt); }
  race.speed = Math.max(0, Math.min(max + race.drs*55, race.speed)); const curve = race.track.curves[Math.floor((race.z/race.track.length)*race.track.curves.length)%race.track.curves.length];
  race.lane += (I.right-I.left)*dt*1.9*race.car.handling*grip + curve*dt*(race.speed/310); race.z += race.speed*dt*18; if(Math.abs(race.lane)>1.25){ race.speed*=.965; race.shake=.2; race.sparks.push({x: innerWidth/2+race.lane*240,y:innerHeight*.78,t:.35}); audio.crash(); }
  if(race.z > race.track.length){ race.z-=race.track.length; race.lap++; if(race.lap>race.track.laps) finishRace(); }
  race.rivals.forEach((r,i)=>{ r.z += (210+i*7)*dt*18; if(r.z > race.track.length) r.z-=race.track.length; r.lane += Math.sin(race.time+i)*dt*.25; });
  race.place = 1 + race.rivals.filter(r => r.z + (race.lap-1)*race.track.length > race.z + (race.lap-1)*race.track.length).length; race.sparks = race.sparks.filter(s=>(s.t-=dt)>0); race.shake=Math.max(0,race.shake-dt); audio.update(race.speed/max);
}
function roadPoint(i){ const h=innerHeight,w=innerWidth,p=i/36, y=h*(.52+p*.48), width=w*(.08+p*p*.92), curve=Math.sin((race.z/420)+p*4)*110*p; return { y, left:w/2-width/2+curve-race.lane*260*p, right:w/2+width/2+curve-race.lane*260*p, mid:w/2+curve-race.lane*260*p, p }; }
function drawRace(){
  const w=innerWidth,h=innerHeight,t=race.track; ctx.fillStyle = t.time==='night'?'#050716':t.time==='sunset'?'#281018':'#77b8ff'; ctx.fillRect(0,0,w,h); const grad=ctx.createLinearGradient(0,0,0,h*.55); grad.addColorStop(0,t.time==='night'?'#071022':'#87ceeb'); grad.addColorStop(1,t.time==='sunset'?'#fb923c':'#dbeafe'); ctx.fillStyle=grad; ctx.fillRect(0,0,w,h*.55);
  ctx.fillStyle=t.scenery; for(let i=0;i<28;i++){ const x=(i*173-race.z*.04)% (w+220)-110; ctx.globalAlpha=.35; ctx.fillRect(x,h*.42-((i%5)+1)*18,70,((i%5)+1)*18); } ctx.globalAlpha=1;
  for(let i=35;i>=0;i--){ const a=roadPoint(i), b=roadPoint(i+1); ctx.fillStyle=i%2?'#1f2937':'#111827'; poly(a.left,a.y,a.right,a.y,b.right,b.y,b.left,b.y); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.globalAlpha=.7; if(i%3===0) line(a.mid,a.y,b.mid,b.y); ctx.globalAlpha=1; ctx.fillStyle=t.scenery; poly(a.left-22,a.y,a.left,a.y,b.left,b.y,b.left-35,b.y); poly(a.right,a.y,a.right+22,a.y,b.right+35,b.y,b.right,b.y); }
  drawWeather(t.weather); race.rivals.forEach(drawRival); drawCar(w/2, h*.80, save.livery, 1.25); race.sparks.forEach(s=>{ ctx.fillStyle='#fffb87'; ctx.globalAlpha=s.t/.35; for(let i=0;i<8;i++) ctx.fillRect(s.x+Math.random()*80-40,s.y+Math.random()*30,8,3); ctx.globalAlpha=1; });
  ui.innerHTML = hud();
}
function drawRival(r){ let dz=(r.z-race.z+race.track.length)%race.track.length; if(dz>2200) return; const p=Math.max(.05,1-dz/2200), y=innerHeight*(.52+p*.32), x=innerWidth/2+r.lane*360*p-race.lane*260*p; drawCar(x,y,r.color,p); }
function drawCar(x,y,c,s){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0,30,58,16,0,0,7); ctx.fill(); ctx.fillStyle=c; round(-42,-38,84,78,12); ctx.fillStyle='#0b1020'; round(-25,-25,50,28,8); ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.fillText('NJR',0,12); ctx.fillStyle='#111'; [-34,34].forEach(xx=>{round(xx,-28,18,28,5);round(xx,18,18,30,5)}); ctx.restore(); }
function drawWeather(w){ if(w==='rain'){ ctx.strokeStyle='#bfdbfe'; for(let i=0;i<90;i++) line(Math.random()*innerWidth,Math.random()*innerHeight,Math.random()*innerWidth-10,Math.random()*innerHeight+25); } if(w==='fog'){ ctx.fillStyle='rgba(220,220,255,.16)'; for(let i=0;i<5;i++) ctx.fillRect(0,innerHeight*(.25+i*.12),innerWidth,42); } if(w==='wind'){ ctx.strokeStyle='rgba(255,255,255,.35)'; for(let i=0;i<25;i++) line(Math.random()*innerWidth,innerHeight*.2+Math.random()*innerHeight*.5,Math.random()*innerWidth+80,innerHeight*.2+Math.random()*innerHeight*.5); } }
function poly(...p){ ctx.beginPath(); ctx.moveTo(p[0],p[1]); for(let i=2;i<p.length;i+=2) ctx.lineTo(p[i],p[i+1]); ctx.closePath(); ctx.fill(); }
function line(x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function round(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); }
function hud(){ return `<div class="hud"><b>${race.track.name}</b><span>Lap ${Math.min(race.lap,race.track.laps)}/${race.track.laps}</span><span>P${race.place}</span><span>${Math.round(race.speed)} km/h</span><span>Nitro ${(race.nitro*100)|0}%</span><span>NJC ${save.njc}</span></div><div class="mobile"><button data-k="left">◀</button><button data-k="right">▶</button><button data-k="brake">Brake</button><button data-k="gas">Gas</button><button data-k="nitro">⚡</button></div>`; }
function drawMenu(){ ctx.fillStyle='#050714'; ctx.fillRect(0,0,innerWidth,innerHeight); ctx.fillStyle='#0ff'; ctx.font='900 56px system-ui'; ctx.textAlign='center'; ctx.fillText('NicoJrey Racing', innerWidth/2, 110); ctx.font='18px system-ui'; ctx.fillStyle='#fff'; ctx.fillText('3D-ish circuits • weather • day/night • AI • upgrades • NJC • saves', innerWidth/2, 146); ui.innerHTML = menuHtml(); }
function menuHtml(){ const track=TRACKS[save.track], car=CARS[save.car]; return `<main class="panel"><button onclick="game.start(false)">Quick Race</button><button onclick="game.start(true)">Championship</button><section><h2>Garage</h2><p>${car.name} · <input type="color" value="${save.livery}" onchange="game.livery(this.value)"> NJC ${save.njc}</p><button onclick="game.prevCar()">Prev car</button><button onclick="game.nextCar()">Next car</button><button onclick="game.buy('engine')">Engine + (${cost('engine')} NJC)</button><button onclick="game.buy('turbo')">Turbo + (${cost('turbo')} NJC)</button><button onclick="game.buy('grip')">Grip + (${cost('grip')} NJC)</button></section><section><h2>Circuit</h2><p>${track.name} · ${track.weather} · ${track.time}</p><button onclick="game.prevTrack()">Prev</button><button onclick="game.nextTrack()">Next</button></section><section><h2>Settings</h2><label><input type="checkbox" ${save.music?'checked':''} onchange="game.toggle('music')"> Music</label><label><input type="checkbox" ${save.sfx?'checked':''} onchange="game.toggle('sfx')"> Engine/SFX</label><label><input type="checkbox" ${save.assists?'checked':''} onchange="game.toggle('assists')"> Steering assist</label></section><section><h2>Leaderboard</h2>${save.highscores.map((s,i)=>`<p>#${i+1} ${s.track}: ${s.time}s P${s.place}</p>`).join('') || '<p>No laps yet.</p>'}</section><p class="hint">Keyboard WASD/Arrows, Space nitro. Gamepads supported. Touch controls appear in-race.</p></main>`; }
function cost(k){ return 350 + save.upgrades[k]*300; }
window.game = { start:startRace, livery(v){save.livery=v;persist();}, nextCar(){save.car=(save.car+1)%CARS.length;persist();}, prevCar(){save.car=(save.car+CARS.length-1)%CARS.length;persist();}, nextTrack(){save.track=(save.track+1)%TRACKS.length;persist();}, prevTrack(){save.track=(save.track+TRACKS.length-1)%TRACKS.length;persist();}, toggle(k){save[k]=!save[k];persist();}, buy(k){ const c=cost(k); if(save.njc>=c){save.njc-=c;save.upgrades[k]++;persist();} } };
ui.addEventListener('pointerdown', e=>{ if(e.target.dataset.k) pointer[e.target.dataset.k]=true; }); ui.addEventListener('pointerup', e=>{ if(e.target.dataset.k) pointer[e.target.dataset.k]=false; }); ui.addEventListener('pointercancel',()=> pointer={left:false,right:false,gas:false,brake:false,nitro:false});
function loop(ts){ const dt=Math.min(.033,(ts-last)/1000||0); last=ts; update(dt); scene==='race'?drawRace():drawMenu(); if(scene==='results') ui.querySelector('main')?.insertAdjacentHTML('afterbegin','<h2>Race complete — rewards saved!</h2>'); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
