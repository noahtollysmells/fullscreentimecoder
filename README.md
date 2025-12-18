# Fullscreen Timecode Viewer

This is a small static web app that displays MIDI Time Code (MTC) in a fullscreen, single large readout suitable for using on a projector or second screen. The frontend uses the browser WebMIDI API to listen for MTC quarter-frame messages (0xF1) and reconstructs HH:MM:SS:FF.

Files
- `index.html` — main page
- `styles.css` — minimal styling for large fullscreen display
- `app.js` — WebMIDI setup and MTC quarter-frame decoder

Branding / Logo
- Place your provided logo image at `assets/logo.png` (create an `assets` folder at the repo root). The page will load that image and display it above the timecode. Recommended size: around 1200×800 or a tall image that fits a 4:3 or portrait crop; CSS will scale it down for fullscreen display.

If you want me to embed the exact image you uploaded into the repository, tell me and I will add it as `assets/logo.png` (I can create the file here if you confirm).

Fonts and look
- This project includes a scary "deadly countdown" look by default using the Google Font "Orbitron". You can change the site font using the Font selector in the controls — options include Orbitron, Share Tech Mono, Roboto Slab, System UI, or you can enter a custom CSS font-family string.
- If you want additional font choices, tell me which Google Font(s) to add and I'll wire them in.

How it works
- The page requests WebMIDI permission in the browser.
- It listens to MIDI input(s) and looks for status byte `0xF1` (MTC quarter-frame). It collects the 8 nibbles and reconstructs timecode.

Quick setup (Windows)
1. Install a virtual MIDI port such as loopMIDI: https://www.tobias-erichsen.de/software/loopmidi.html
2. In Reaper, enable MIDI output to the virtual port and enable "Send MIDI Timecode (MTC)" or similar in the transport/MIDI output settings. (Reaper has options to send MTC to a MIDI output.)
3. Open this page in Chrome/Edge (they support WebMIDI). When prompted, allow MIDI access and select the virtual MIDI input if asked.

Notes on browsers and security
- WebMIDI requires secure context (HTTPS). GitHub Pages serves over HTTPS, so hosting here works for permission prompts.
- If you open the file locally (file://) WebMIDI won't work. Publish to GitHub Pages or host via a local HTTPS server.

Deploy to GitHub Pages
- Option A: Create repository on GitHub and push these files to `gh-pages` branch or use GitHub Pages from `main` using `/docs` folder.
- Option B: Put this repo's files in `docs/` and enable GitHub Pages from repository settings.

Fallback / alternative
- If WebMIDI is not an option, you can run a small local bridge that listens to your OS MIDI and exposes the decoded timecode over WebSocket. The static page can then connect to `ws://localhost:PORT` to receive JSON timecode messages. Tools/libraries: `python-rtmidi`, `websockets` (Python) or `easymidi`/`midi` and `ws` in Node.js. This repo intentionally does not include a bridge, but it's a documented option.

Troubleshooting
- If you see "No MIDI inputs found": ensure you created/started a virtual MIDI port (loopMIDI) and that Reaper is sending MTC to that port.
- If the timecode is incorrect or jittery: check Reaper's frame rate configuration and ensure the FPS mapping matches (the page attempts to detect common FPS values: 24, 25, 29.97, 30).

Next steps you might want
- Add support for full-frame SysEx MTC messages.
- Add a small local WebSocket bridge example for cases where WebMIDI isn't available or permitted.

If you'd like, I can add the optional local bridge script (Node or Python) and wire the page to connect to it as a fallback. Tell me which language you prefer and I'll add it.
