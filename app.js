// Simple WebMIDI MTC quarter-frame decoder and fullscreen timecode display

const statusEl = document.getElementById('status');
const timeEl = document.getElementById('timecode');
const fsBtn = document.getElementById('fsBtn');
const showFpsCheckbox = document.getElementById('showFps');
const themeSelect = document.getElementById('themeSelect');
const themeColor = document.getElementById('themeColor');
const fontSelect = document.getElementById('fontSelect');
const fontCustom = document.getElementById('fontCustom');

let midiAccess = null;
let inputs = [];

// store last 8 nibbles from MTC quarter-frame messages
const nibbles = new Array(8).fill(null);
let lastUpdate = 0;

// state for smoother fractional frame display
let baseTotalFrames = null; // number of frames since 00:00:00 at last full update
let baseFps = 24;
let lastReceivedAt = 0;

// animation loop id
let rafId = null;
const STOP_THRESHOLD_MS = 1500; // freeze display if no MTC received for this long

function updateStatus(txt){ statusEl.textContent = txt }

function parseAndDisplay(){
  // ensure we have at least one value
  if (nibbles.every(n => n === null)) return;

  // we'll only format when we have at least the core values
  // try to compute even if some nibbles are missing
  const f0 = nibbles[0] ?? 0;
  const f1 = nibbles[1] ?? 0;
  const s0 = nibbles[2] ?? 0;
  const s1 = nibbles[3] ?? 0;
  const m0 = nibbles[4] ?? 0;
  const m1 = nibbles[5] ?? 0;
  const h0 = nibbles[6] ?? 0;
  const h1 = nibbles[7] ?? 0;

  const frames = (f0 & 0x0f) | ((f1 & 0x01) << 4);
  const seconds = (s0 & 0x0f) | ((s1 & 0x03) << 4);
  const minutes = (m0 & 0x0f) | ((m1 & 0x03) << 4);
  const hours = (h0 & 0x0f) | ((h1 & 0x01) << 4);
  const fpsCode = (h1 >> 1) & 0x03;
  const fpsMap = {0:24,1:25,2:29.97,3:30};
  const fps = fpsMap[fpsCode] ?? 30;

  // compute absolute total frames at this snapshot (since 00:00:00)
  const totalFrames = (((hours * 60 + minutes) * 60) + seconds) * fps + frames;
  baseTotalFrames = totalFrames;
  baseFps = fps;
  lastReceivedAt = Date.now();
  lastUpdate = lastReceivedAt;

  // immediate update (start animation loop if not running)
  if (!rafId) rafId = requestAnimationFrame(renderFrame);

  if (showFpsCheckbox.checked) updateStatus(`FPS: ${fps} — last ${new Date().toLocaleTimeString()}`);
}

function renderFrame(nowTs){
  // nowTs unused; use Date.now() for consistent timing
  if (baseTotalFrames === null) return;
  // if no recent MTC message, stop advancing and cancel RAF (freeze display)
  const sinceLast = Date.now() - lastUpdate;
  if (sinceLast > STOP_THRESHOLD_MS){
    if (rafId){
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    updateStatus('Stopped — no recent MTC');
    return;
  }

  const elapsedSec = (Date.now() - lastReceivedAt) / 1000;
  const totalFrames = baseTotalFrames + elapsedSec * baseFps;
  const frameIdx = Math.floor(totalFrames % baseFps);
  const framesSinceMidnight = Math.floor(totalFrames);
  const totalSeconds = Math.floor(framesSinceMidnight / baseFps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;

  const hh = String(hours).padStart(2,'0');
  const mm = String(minutes).padStart(2,'0');
  const ss = String(seconds).padStart(2,'0');
  const ff = String(frameIdx).padStart(2,'0');

  // emphasize the final frame digits
  timeEl.innerHTML = `${hh}:${mm}:${ss}:<em>${ff}</em>`;

  // schedule next frame
  rafId = requestAnimationFrame(renderFrame);
}

function handleMIDIMessage(ev){
  const [status, data1, data2] = ev.data;
  // Quarter Frame messages: status 0xF1 and one data byte
  if (status === 0xF1){
    const byte = data1;
    const msgType = (byte >> 4) & 0x07;
    const value = byte & 0x0f;
    nibbles[msgType] = value;
    lastUpdate = Date.now();
  parseAndDisplay();
  } else {
    // ignore other messages; could extend to SysEx full-frame later
  }
}

function onMIDISuccess(access){
  midiAccess = access;
  inputs = [];
  for (let input of midiAccess.inputs.values()){
    inputs.push(input);
    input.onmidimessage = handleMIDIMessage;
  }
  if (inputs.length) updateStatus(`Listening on ${inputs.length} MIDI input(s)`);
  else updateStatus('No MIDI inputs found — create a virtual MIDI port (loopMIDI) and enable MTC in Reaper.');

  midiAccess.onstatechange = e => {
    // device connect/disconnect
    for (let input of midiAccess.inputs.values()){
      if (!inputs.includes(input)){
        inputs.push(input);
        input.onmidimessage = handleMIDIMessage;
      }
    }
    updateStatus(`MIDI inputs: ${midiAccess.inputs.size}`);
  };
}

function onMIDIFailure(err){
  updateStatus('WebMIDI not available: ' + err);
}

async function initMIDI(){
  if (!navigator.requestMIDIAccess) return updateStatus('WebMIDI API not supported in this browser.');
  try{
    const access = await navigator.requestMIDIAccess({ sysex: false });
    onMIDISuccess(access);
  }catch(err){
    onMIDIFailure(err);
  }
}

// Fullscreen toggle
fsBtn.addEventListener('click', async ()=>{
  if (!document.fullscreenElement){
    await document.documentElement.requestFullscreen();
    fsBtn.textContent = 'Exit Fullscreen';
  } else {
    await document.exitFullscreen();
    fsBtn.textContent = 'Enter Fullscreen';
  }
});

// double click to fullscreen
timeEl.addEventListener('dblclick', ()=> fsBtn.click());



// Theme handling
function applyTheme(name, customColor){
  const root = document.documentElement.style;
  if (name === 'cyan'){
    root.setProperty('--fg', 'rgb(14,238,255)');
    root.setProperty('--bg', '#000');
  } else if (name === 'red'){
    root.setProperty('--fg', 'rgb(250,0,0)');
    root.setProperty('--bg', '#000');
    // make timecode look like a countdown
    document.getElementById('timecode').classList.add('orbitron','countdown-red');
  } else if (name === 'green'){
    root.setProperty('--fg', '#0f0');
    root.setProperty('--bg', '#000');
    document.getElementById('timecode').classList.remove('orbitron','countdown-red');
  } else if (name === 'light'){
    root.setProperty('--fg', '#000');
    root.setProperty('--bg', '#fff');
    document.getElementById('timecode').classList.remove('orbitron','countdown-red');
  } else if (name === 'custom' && customColor){
    root.setProperty('--fg', customColor);
    document.getElementById('timecode').classList.remove('orbitron','countdown-red');
  }
}

themeSelect.addEventListener('change', ()=>{
  if (themeSelect.value === 'custom'){
    themeColor.style.display = '';
    themeColor.focus();
  } else {
    themeColor.style.display = 'none';
    applyTheme(themeSelect.value);
  }
});
themeColor.addEventListener('input', ()=>{
  applyTheme('custom', themeColor.value);
});

// Font selection and application
function applyFont(name, custom){
  const root = document.documentElement.style;
  if (name === 'orbitron'){
    // prepend Orbitron to the stable base-font fallback
    root.setProperty('--font-family', "'Orbitron', var(--base-font)");
    document.getElementById('timecode').classList.add('orbitron');
  } else if (name === 'sharetech'){
    root.setProperty('--font-family', "'Share Tech Mono', var(--base-font)");
    document.getElementById('timecode').classList.remove('orbitron');
  } else if (name === 'robotoslab'){
    root.setProperty('--font-family', "'Roboto Slab', var(--base-font)");
    document.getElementById('timecode').classList.remove('orbitron');
  } else if (name === 'system'){
    root.setProperty('--font-family', "var(--base-font)");
    document.getElementById('timecode').classList.remove('orbitron');
  } else if (name === 'custom' && custom){
    // allow full custom CSS font-family string from the user
    root.setProperty('--font-family', custom);
    document.getElementById('timecode').classList.remove('orbitron');
  }
  // persist
  try{ localStorage.setItem('fst_font', name); if (custom) localStorage.setItem('fst_font_custom', custom); }catch(e){}
}

fontSelect.addEventListener('change', ()=>{
  if (fontSelect.value === 'custom'){
    fontCustom.style.display = '';
    fontCustom.focus();
  } else {
    fontCustom.style.display = 'none';
    applyFont(fontSelect.value);
  }
});
fontCustom.addEventListener('change', ()=>{
  applyFont('custom', fontCustom.value);
});

// restore saved font
try{
  const saved = localStorage.getItem('fst_font');
  const savedCustom = localStorage.getItem('fst_font_custom');
  if (saved){
    fontSelect.value = saved;
    if (saved === 'custom' && savedCustom){ fontCustom.value = savedCustom; fontCustom.style.display = ''; }
    applyFont(saved, savedCustom);
  } else {
    // default to orbitron for deadly countdown vibe
    fontSelect.value = 'orbitron';
    applyFont('orbitron');
  }
}catch(e){}

// Update loop: if messages stop, show a warning
setInterval(()=>{
  const now = Date.now();
  if (lastUpdate && (now - lastUpdate) > 3000){
    updateStatus('No recent MTC — last received >3s ago');
  }
}, 1000);

// Kick off
updateStatus('Requesting MIDI access...');
initMIDI();
