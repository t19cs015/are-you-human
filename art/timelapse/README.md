# Are You Human? — Demo v3

The current deliverable is `exports/are-you-human-demo-v3.mp4`: 60 seconds,
1920×1080, 30 fps, H.264 video, stereo AAC, English narration, character voices
and burned-in captions. Delivery is a standalone MP4.

## V3 story and changes

| Time | Scene |
| --- | --- |
| 0–8s | The visitor's own eyes. Four residents turn in succession, react, and speak over one another from different directions. There is no player avatar or connection-status explanation. |
| 8–14s | At Central: power, water, and the stories people tell feed the city AI. |
| 14–22s | A street-level view tilts upward as the skyline grows. The previous 24-second transformation now takes 8 seconds. |
| 22–32.8s | One dilemma within the wider town: Mia needs warmth and Tomo needs Central's update. The player proposes reusing waste heat in their own words. |
| 32.8–40.5s | Recorded OpenAI replies: Shell chooses Ren, and Ren agrees to help. |
| 40.5–49s | Ren travels and works; the recovered-heat line activates, and the actual episode resource meters improve. Gameplay time is condensed. |
| 49–60s | Residents return to the café. The wider question remains: work with Central, or push back? A community shaped by the player. |

Every camera stays at human eye height (1.67 world units, with slight opening
head movement). `firstperson.js` does not import or create v2's human model.
The render loop checks camera height for all 1,800 frames.

`skyline-variety.js` replaces v2's identical repeated towers with six architectural
families: terraced apartments, round towers, unequal twin towers, glazed offices,
stepped crowns, and low civic buildings with greenhouse roofs. Heights, roofs,
window layouts and muted ceramic colors vary. Hina's café, shops, planting and
resident assets remain the basis of the little world.

## V3 implementation boundaries

The arrival and larger skyline are authored in-engine cinematics. The cooperation
section reuses `data/film/replay.json`, the original v1 recording of real OpenAI
decisions, navigation, work and episode results. The two spoken resident replies
are excerpts from that recording, checked against it when the film loads. It is
a new camera edit of recorded decisions, not a fresh live API conversation.
The larger skyline is a cinematic backdrop, not a recorded result of that episode.

Character voices and narration are synthesized with `gpt-4o-mini-tts`; the opening
deliberately overlaps three spatially panned reactions. Music and ambience are
original synthesized audio. This film does not capture Realtime microphone input
or demonstrate runtime Image Generation. The playable prototype's separate
Realtime conversation with Central remains available in the game.

## Reproduce v3

Use the recorded v1 replay described in [the original film notes](../demo/README.md).

1. `node scripts/build-timelapse-audio.mjs --v3` creates cached English clips,
   a 60-second stereo voice track, the manifest, and the SRT.
2. `python3 scripts/mix-timelapse-audio.py --v3` adds the score and ambience.
3. `ffmpeg -y -v error -i data/film-v3/mix.wav -t 60 -af loudnorm=I=-17:TP=-1.5:LRA=8 -ar 48000 data/film-v3/master.wav`
4. `node scripts/serve-town-timelapse.mjs`; open the internal authoring studio at
   `http://127.0.0.1:4175/v3-studio`, inspect the shots, and select Render MP4 frames.
   An optional `?t=42` opens a precise preview time without changing the render.
5. `node scripts/finish-demo-v3.mjs` combines picture and sound, checks the complete
   frame count and format, decodes the full file, and exports the MP4 and script.
6. `node scripts/verify-demo-v3-audio.mjs` independently transcribes 8.4–60 seconds
   for comparison with the script. Opening voices intentionally overlap and are
   excluded from this exact-text check; inspect any reported differences.

Intermediate files and sample frames are under ignored `data/film-v3/`.
API credentials stay in server configuration. Rendering does not open or reset
a gameplay session. V1 and v2 exports are preserved.

---

# Earlier version: Demo v2

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
