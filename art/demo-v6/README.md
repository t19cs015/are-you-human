# Are You Human? — v6

Standalone English MP4, 60 seconds, 1920 × 1080, 30 fps. The camera stays at the visitor's eye height throughout. The visitor is never identified as human. The final question addresses the viewer.

The film opens with Haruna's residents noticing a newcomer. Quick interactions take in the windmills, the river machinery and the fountain in the new city. Tomo's forgotten promise leads into the actual memory drawer: drag a cartridge, flip it, append a sentence in English, and save it. A recorded OpenAI conversation turns the selected memory into the body's invitation and Tomo's independent decision. Tomo follows a path computed against the current scene's colliders; the game's arrival check creates the next shared memory. The music stop, drifting lantern, mist gate, changing skyline, Central's face, the city heart and the northern shore complete the journey. A shared memory reaches the residents through the next synchronization and the existing world rule restores a window.

## v6 changes

The approved v5 structure and every spoken performance are retained. At 44.1–46.3 seconds, the current city's six architectural families develop from low buildings into a varied skyline, timed to “Their choices shape the town.” The eye-height camera tilts gently upward as floors appear. This is a new directed time-lapse using the current scene, not reused v3 footage or an additional recorded AI decision. Existing floors retain their proportions, and the normal game world remains fully built.

Credits now read **Haruna & Ilya**. The river wheel's old solid paddle boards were removed from underneath its detailed planks, resolving coincident geometry. Its interaction speed was reduced to keep the timber wheel readable. These wheel fixes also apply to the game.

The development check covers all 18 buildings over 31 steps: heights increase monotonically, transforms stay finite, and the completed scene exactly matches the normal game skyline. Switching back to the normal update also restores every instance. The focused discovery and city/navigation suite passes 21 tests. All 16 spoken clips and their measured timing match v5.

`exports/are-you-human-demo-v5.mp4` is preserved. The source used for that export is retained under ignored `data/film-v4/production-source-v5/`; earlier v4 build products remain under `data/film-v4/`.

## Output

- `exports/are-you-human-demo-v6.mp4`
- `exports/are-you-human-demo-v6.srt`
- `exports/demo-v6-narration.md`

The studio HTML is a local production tool, not a video landing page. No video was added to the game or published to a website.

## Reproduce

```sh
node scripts/serve-demo-v6.mjs
```

In another terminal:

```sh
node --experimental-websocket scripts/render-demo-v6.mjs --preview
node scripts/build-demo-v6-audio.mjs
python3 scripts/mix-demo-v6-audio.py
node --experimental-websocket scripts/render-demo-v6.mjs
node scripts/finish-demo-v6.mjs
node scripts/verify-demo-v6.mjs
```

Requires the installed Google Chrome, FFmpeg, Python with NumPy, Three.js dependencies, and the existing server OpenAI configuration. The renderer starts its own disposable headless Chrome profile on port 9236; the production server uses port 4180. It never controls the user's open browser or reads the user's game save. Build products and voice caches live in ignored `data/film-v6/`; exports are also ignored.

## What was recorded, and what was staged

- The drawer uses `createMemoryView` and `memory.css` from the game. Chrome pointer and keyboard events perform the real drag, double-click, typing and Enter save. The normal `editMemoryGame` function validates both edits in a separate disposable society. English display labels and larger text are applied for the demo; the main game's UI is unchanged.
- `prepare-demo-v6.mjs` calls the normal `talkMemoryGame` flow with an English translation of the speaking instructions. The selected memories generate the body's utterance, which becomes the resident's actual heard input. OpenAI selects the response and action. A take that falls back, does not speak English or does not lead to the filmed meeting is rejected rather than relabeled as live.
- Tomo's entire recorded response is voiced, including “I can’t recall the promise, but I’m here now.” The voice continues across the travel and reunion cuts. Both inputs/outputs remain in `data/film-v6/replay.json`. Tomo's journey, new experience and the later shared-memory delivery use the actual game rules. Travel and waiting are condensed.
- The opening greetings, the translated introductory promise and forgotten greeting, the closing question, other residents' background staging, camera cuts and UI emphasis are authored direction. This is an edited in-engine demo, not an uninterrupted gameplay recording.
- Voices use `gpt-4o-mini-tts`. The score and water/wind ambiences are original synthesis. Footsteps, cloth, wood, glass and mechanical Foley combine [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) and [RPG Audio](https://kenney.nl/assets/rpg-audio), both CC0. Selected source files and hashes are in `assets/sound/manifest.json`; original licenses are in `docs/licenses/`. Tuned chimes use damped resonant modes with felt-like attacks and restrained upper harmonics. The main spoken sequence is independently transcribed to check the completed sound mix. Neither Realtime microphone input nor runtime image generation is portrayed as part of this take.

Checks include real drawer state after drag and after typing, live decision mode, actual arrival, synchronization delivery, first-person camera samples, 1800 encoded frames, exact 60-second duration, stereo audio and a full MP4 decode. Diagnostic frames, the drawer edit log and the transcription report are under `data/film-v6/`.

The final sound is normalized in two passes for comfortable playback. Filming also exposed a transparent-water sorting issue: the lantern now writes depth while solid, and switches to transparency only as it fades into the mist. This small rendering fix is shared with the game; its movement and story conditions are unchanged.

## Retained audio and object polish

Speech is generated as lossless WAV with connected conversational direction. Only outside silence is shortened, with 90 ms of lead and 240 ms of release retained around the detected signal; internal pauses and breaths are preserved. Every phrase is processed in full with pitch-preserving `atempo`, then measured to ensure it fits. There is no time-based speech truncation. Most clips remain at 1×; the longest lines are about 1.08–1.16×. The manifest records source retention bounds, actual rendered duration and final-tail levels. Captions and mouth animation follow those measured durations.

The mix separates music, material Foley, tuned chimes, ambience, direct dialogue and short stereo reflections. Smooth duck envelopes protect consonants; chimes are quieter under narration, and a gentle shelf softens their upper frequencies. Sound tails continue across picture cuts. Two-pass loudness normalization uses a linear gain when the measured headroom permits, preserving the performances' dynamics.

Shared game objects were polished alongside the film: turned and glazed fountain bowl with arcing water and animated droplets, timber skiffs with glass lanterns and aligned hulls, fitted waterwheel rims and flume, detailed chimes, the core's panels and fasteners, a projector base, city window sills and transoms, and gabled houses in the unreconstructed area. Blender infrastructure models add roof seams, sail frames, pressure gauges, pipe collars, porch fittings and dome ribs. The mill entrance remains clear. Residents and Haruna's original art are preserved.

The Blender exports join geometry by material and animation parent; the animated `Rotor` and `UpperWorks` nodes remain intact. Repeated procedural details are instanced without adding collision footprints or changing story triggers. Rendering checks cover the actual memory drag/edit/save, first-person views, full dialogue text, 1800 frames and full MP4 decode. The focused asset, infrastructure, discovery and surface suite passes 27 tests.
