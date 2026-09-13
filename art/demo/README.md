# One Warm Light — English submission film

60-second, 1920×1080, 30 fps, English narrated demo of **Are You Human?**.

## Story and timing

| Time | What the viewer learns |
| --- | --- |
| 0–8s | Mia saved a seat for the player, but the café may lose its future. |
| 8–16s | The central upgrade takes power from the café. |
| 16–23s | Tomo needs the upgrade to repair his voice. Keep both futures alive. |
| 23–31s | The player notices that the data center wastes heat. |
| 31–39s | A natural-language proposal becomes two residents' decisions. |
| 39–47s | Residents walk to their jobs, work, and redirect heat. |
| 47–54s | The update finishes; the café stays warm; everyone returns. |
| 54–60s | Title and promise: “Conversation becomes cooperation.” |

This is an **in-engine cinematic edit**, with gameplay time condensed. It uses the same Three.js world, resident models, navigation, and server episode rules as the playable prototype. Explanatory graphics, camera cuts, the opening line, and narration are authored for the film. The English dialogue displayed in the cooperation scene comes from actual OpenAI calls, recorded in the replay. Success is reached through the game's movement and resource rules. This is not represented as an unedited screen recording.

The live capture selected Shell + Ren. These roles are read from the saved replay, not hardcoded to imply an AI decision that did not happen. The replay preparation fails if the live API falls back to a demo response or the simulated game cannot reach its ending.

## Outputs

- `exports/are-you-human-60s-en.mp4` — final film, with burned-in English captions, English narration, and a quiet original score.
- `exports/are-you-human-60s-en.srt` — standalone English subtitle file.
- `exports/english-narration.md` — timed script for review.
- `exports/are-you-human-poster.png` — frame from the final title scene.
- `exports/video-specs.json` — verified technical format.

The local studio is http://127.0.0.1:4174/ . “Watch final MP4” plays the finished file. This address is local, not a public submission URL. The MP4 can be uploaded to the team's chosen video host; public publishing and form submission are separate steps.

## Rebuild

1. With the existing `.env`, run `node scripts/build-demo-audio.mjs`. It caches the TTS clips and reuses unchanged ones.
2. Run `node scripts/serve-demo-film.mjs` and open http://127.0.0.1:4174/ . “Prepare live AI replay” records model decisions using the loaded world geometry. Cached replays are reused.
3. Use the visible timeline to inspect shots, then “Render 1080p film”. The browser sends exactly 1800 composite frames to the local FFmpeg process.
4. Run `python3 scripts/mix-demo-audio.py`. Requires NumPy. The music is synthesized here, without external recordings or music samples.
5. Master `data/film/mix.wav` to `data/film/master.wav` with FFmpeg loudness normalization at -16 LUFS / -1.5 dBTP, keeping exactly 60 seconds.
6. Run `node scripts/finish-demo-film.mjs` to mux, validate, and package the files.

Narration: OpenAI `gpt-4o-mini-tts` (Coral for Mia, Cedar for the narrator). Runtime decisions: `gpt-5.6-luna`. AI-generated voices and the condensed cinematic presentation are disclosed in the video. Existing character assets and the town's licensed CC0 kit are reused; source records remain in `assets/` and `docs/licenses/`.

Keys stay on the server and are not placed in the film, replay, or subtitle files. The film studio runs only on localhost and has a narrow static-file allowlist. It does not reset a player's saved town.
