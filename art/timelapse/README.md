# Are You Human? — Demo v2

The delivered artifact is `exports/are-you-human-demo-v2.mp4`: 60 seconds,
1920×1080, 30 fps, H.264 video, stereo AAC, English voices and burned-in captions.
The user requested an MP4 file, not an HTML viewing page.

## Story

| Time | Scene |
| --- | --- |
| 0–8s | A human walks into the little town. Residents notice the visitor in succession, turn, and react. |
| 8–16s | Every AI has a visible connection to Central. The human has none. Individual minds, a shared network. |
| 16–40s | A fixed-view timelapse. Central gains storeys, 24 residential towers rise, the river narrows, and power, water and words move inward. Warm music gradually acquires a subdued machine hum. |
| 40–55s | Return to the residents at street level, with the new skyline looming behind them. Working with Central or opposing it shapes trust, cooperation and the community. |
| 55–60s | “Are You Human?” / “A community shaped by you.” |

The little world and resident assets supplied by Hina remain the visual basis.
The human visitor is an original procedural model, distinct from the residents'
screen faces. Additional towers reuse the existing Blender `city-house.glb`.
Central's new floors are modeled in Three.js. The scene uses the original café,
planting, lighting, resident expressions and gestures.

## What the film represents

This is an **in-engine concept film with authored cinematic staging**, disclosed
in the picture and MP4 metadata. The arrival, visible network connections,
extended skyline, narrowing river and final gathering express the requested
direction. They are not a recorded gameplay run, an autonomous live decision,
or evidence that the full community branching system has been implemented.

The playable prototype already contains resident memories, individual decisions,
cooperation, resource and conversation-log delivery, three modernization stages,
and a Realtime conversation with Central. This film's English character dialogue
and narration use `gpt-4o-mini-tts`; they are not a Realtime microphone capture.
There is no runtime Image Generation integration in this film or the prototype.
The words that drift into Central are authored examples, not a user's private log.

The studio never opens or resets a gameplay session and does not alter saved towns.
Rendering runs locally. API credentials stay in the server-side `.env` configuration.

## Reproduce

1. `node scripts/build-timelapse-audio.mjs` prepares the 24-second source cut's
   narration manifest. Its shared Central voice clips are reused by v2.
2. `node scripts/build-timelapse-audio.mjs --arrival` generates the remaining v2
   English clips and assembles a fixed-length, 60-second narration track.
3. `python3 scripts/mix-timelapse-audio.py --arrival` adds an original synthesized
   score, resident murmurs and restrained machine ambience. Requires NumPy.
4. `ffmpeg -y -v error -i data/arrival-film/mix.wav -t 60 -af loudnorm=I=-17:TP=-1.5:LRA=8 -ar 48000 data/arrival-film/master.wav`
5. `node scripts/serve-town-timelapse.mjs`; open the internal authoring studio at
   `http://127.0.0.1:4175/demo-studio`, inspect the timeline, and select Render 1080p.
   The browser sends exactly 1,800 frames to FFmpeg, independently of preview speed.
6. `node scripts/finish-demo-v2.mjs` muxes audio, checks duration/frame count/codecs,
   decodes the complete film to detect corruption, and outputs the MP4, SRT and script.

Intermediate frames, narration caches and format checks are under ignored
`data/arrival-film/`; the exported files are under ignored `exports/`.
The original Mia episode film remains separate and unchanged.
