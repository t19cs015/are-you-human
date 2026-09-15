# AI TOWN — Hackathon Submission

[One-minute English demo · v9](https://github.com/user-attachments/assets/7579595f-eb28-4ede-bc77-58cb868f7f98) · [Code repository](https://github.com/t19cs015/are-you-human) · [Setup and screenshots](../README.md)

Copy the answer beneath each numbered heading into the corresponding form field. Each answer is under 200 words. The supporting references at the end are separate from the submission answers.

## 1. Project description

AI TOWN is a first-person game about joining a miniature society of AI residents. It is for players who enjoy expressive characters, cozy exploration, and discovering how their experiments change an encounter.

Central keeps the town running by selecting the active memories its residents receive at each synchronization. Work continues, but a personal promise can disappear from someone's current context.

You inhabit a similar robot body, with one crucial freedom: you choose your own memories. Drag cartridges into three slots, rearrange their priorities, or rewrite them in ordinary language. OpenAI turns those memories into your character's words. Each resident independently decides how to respond and where to go.

The opening makes the stakes personal: Tomo forgets your promise. Invite him again, spend time together, and try carrying that shared experience into the next synchronization.

Beyond this first encounter, explore windmills, waterways, musical objects, and a city with houses waiting in the mist. Discoveries become memories for new conversations. Under the town's warm appearance is a playable question: who decides what tomorrow remembers?

## 2. Meaningful use of OpenAI tools — 30%

OpenAI models make AI TOWN's memory system playable. The Responses API, configured with gpt-5.6-luna, first turns selected, ordered memories into the player's utterance. A separate call gives the resident that utterance and its own current context to choose a reply and action. Unspoken player memories stay outside the resident's input; structured outputs and server validation connect decisions to real movement and sharing.

Text-to-speech with gpt-4o-mini-tts makes the effect audible: change a memory, then hear the words it produces. Central's holographic presence uses gpt-realtime-mini over WebRTC, with tools to inspect the town and pause or resume modernization. In the community-building mode, gpt-image-2.5-flare turns an agreed public proposal into a sketch displayed in the town while residents build with authored 3D components.

We used Codex with gpt-6-astra to develop interactively: discuss an idea, turn it into a playable revision, try it, and refine it. This workflow covered game systems, custom Blender modeling scripts, and the complete demo production pipeline. It helped us discover the memory mechanic through working prototypes.

## 3. Originality — 25%

AI TOWN makes AI context a physical game mechanic. A promise, a passing impression, or a sentence you invent becomes a cartridge inside your robot body. Moving it to the first slot changes its influence on your next encounter.

This creates a different kind of dialogue puzzle: form a hypothesis about your memories, hear the resulting invitation, and discover what another character chooses. Rewriting your recollection changes your perspective; the actual event record remains intact. Residents encounter your words through their own limited memories, and can accept an invitation, listen, return to work, or choose a detour.

Central makes the same mechanism part of the world. Synchronization can remove a promise from a resident's active context; an experience they agree to preserve can return next time. Keeping a small moment becomes a concrete goal with social and visual consequences.

The concept emerged through playable conversations with Codex, moving from observing an autonomous town to experimenting with the memories inside your own body. Game design and implementation evolved together.

## 4. Playability / Utility — 25%

The opening is designed for a short first visit: reconnect with a friend who has forgotten your promise, then help a shared experience survive an update. A three-part guide shows one next action, with a direction marker and highlighted memory blocks. Players can also explore freely.

Mouse look, walking, jogging, and a short dash support exploration. E handles nearby interactions; Q opens the memory drawer. Large text, short instructions, and tactile cartridges support dragging, swapping, and natural-language editing, with click and keyboard alternatives. Once memories are equipped, talking does not require typing a new sentence every time.

Four residents inhabit six connected districts with 39 interaction points and nine collectible memory types. Turn a waterwheel, launch a lantern boat, play a musical object, or invite someone to join a detour. Sound, movement, dialogue, and changing lights make consequences visible.

English is the default, with Japanese selectable before play. Saves preserve progress and edited memories. The game runs locally in a browser; a clearly labeled scripted mode works without an API key, while live dialogue, Realtime conversation, and generated sketches use the configured OpenAI connection.

## 5. Execution and craft — 20%

We built the town in Three.js with editable Blender assets and a Node.js simulation server. Using Codex with gpt-6-astra, we created and refined custom models, including a robot body with an opening memory hatch, and integrated interactive objects, lighting, animated water, character gestures, and sound.

We produced the one-minute English demo through Codex, from scene scripting and camera choreography to browser rendering, OpenAI speech generation, synthesized music, Foley editing, captions, audio mixing, and MP4 encoding. Refinements included calmer gestures, a corrected boat waterline, varied building growth, clear camera views, and complete spoken phrases fitted with pitch-preserving speed changes.

The film uses the real memory drawer and recorded live Responses API decisions replayed through game rules, with authored staging and condensed travel. Editable Blender sources and production scripts are retained in the repository.

The implementation separates frame-by-frame simulation from model decisions, validates actions before applying them, isolates sessions, and saves atomically. All 108 automated tests pass, covering memory boundaries, consent, synchronization, onboarding, persistence, language behavior, navigation, assets, and HTTP handling. The result is a playable prototype with a reproducible production workflow.

## 6. Pre-existing code, open-source components, datasets, or third-party tools

- Starting material: our initial town prototype and original resident designs. We extended that foundation; the repository has no project-wide open-source license declared.
- JavaScript dependencies: Three.js 0.170.0, polygon-clipping 0.15.7, and splaytree 3.2.3 (MIT); robust-predicates 3.0.3 (Unlicense).
- Environment assets: Tiny Treats Homely House and Pretty Park by Isa Lousberg; KayKit Furniture Bits and City Builder Bits by Kay Lousberg. All four packs are CC0-1.0. The asset manifest records 29 imported models, source revisions, and hashes.
- Sound effects: Kenney Impact Sounds and RPG Audio (CC0-1.0); selected files and hashes are recorded. The demo's music and environmental ambiences are synthesized by project scripts.
- Tools: Node.js (MIT), Python (PSF-2.0), NumPy (BSD-3-Clause), Blender (GNU GPL), FFmpeg (GPL-3.0-or-later for the production build), and Google Chrome (Google terms). Bundled third-party notices also apply. These tools are not shipped as binaries in the repository.
- OpenAI APIs and Codex are proprietary services used under applicable OpenAI terms. Speech and proposal sketches are AI-generated. We use no external training dataset or custom model training; Central's learning is a game progression system.

---

## Supporting references — separate from form answers

These references document the scope of the claims above. Verification date: September 15, 2026.

| Claim | Repository evidence |
| --- | --- |
| Ordered memories generate speech; residents decide from their own context | [Memory chapter design](MEMORY_GAME.md), [memory rules and separate model calls](../server/memory-game.mjs), [Responses integration](../server/provider.mjs) |
| Central's Realtime conversation and validated tools | [Central server integration](../server/central.mjs), [WebRTC client](../src/central-voice.js) |
| Image generation is part of community-building mode | [Implementation and recorded playtest](COMMUNITY_PLAYTEST.md), [image generation](../server/community-art.mjs) |
| Speech and configured runtime models | [Speech generation](../server/speech.mjs), [model defaults](../server/config.mjs) |
| Explorable scope and consequences | [Town interactions](A_TOWN_TO_TOUCH.md), [the unrestored shore](THE_UNRESTORED_SHORE.md), [controls and setup](../README.md) |
| Custom modeling with editable sources | [Resident modeling](RESIDENT_MODELS.md), [player generator](../scripts/build-player.py), [infrastructure generator](../scripts/build-infrastructure.py), [character sources](../art/characters/), [infrastructure sources](../art/infrastructure/) |
| Complete demo production and the boundary between recording and staging | [v9 production notes](../art/demo-v9/README.md), [live-decision preparation](../scripts/prepare-demo-v9.mjs), [renderer](../scripts/render-demo-v9.mjs), [speech timing](../scripts/build-demo-v9-audio.mjs), [music and sound mix](../scripts/mix-demo-v9-audio.py), [MP4 assembly](../scripts/finish-demo-v9.mjs) |
| 108 passing automated checks | [Test suite](../tests/); `npm test` passed all 108 tests on the verification date. These tests do not make live API calls. |
| Incorporated assets and dependency licenses | [Package lock](../package-lock.json), [environment manifest](../assets/cafe/manifest.json), [sound manifest](../assets/sound/manifest.json), [original asset licenses](licenses/) |

### Production and scope notes

- The linked GitHub recording retains the previous title card. The retitled **AI TOWN** master is ready locally at `exports/ai-town-demo-v9.mp4`, with the same 60-second sequence and original audio.
- The team identifies the Codex development model as **gpt-6-astra**. This is the team's development-session attribution: source files and Git commits document the work, but do not independently record which model performed each historical action. The runtime dialogue model is separately configured as **gpt-5.6-luna**.
- The Codex workflow covered the demo's complete production pipeline using the listed tools, models, and incorporated assets. We developed the concept through successive playable prototypes and refined the film through visual and audio review. Custom modeling scripts and imported CC0 assets are documented separately in the repository.
- The v9 video is an edited in-engine demonstration. Its preparation accepts a recorded live invitation that leads to the filmed meeting; it does not establish that every prompt produces that outcome. The opening, camera cuts, skyline timing, and some dialogue are authored. Realtime microphone conversation and runtime image generation are implemented elsewhere in the game and are not demonstrated in this take.
- The chapter and available actions are designed game rules. Rewriting a memory does not rewrite historical facts or grant control over other residents. Community sketches accompany three authored kinds of 3D construction; there is no arbitrary generated 3D world or LLM weight training.

### Tool-license references

The imported models and Foley are covered by the original CC0 notices linked above. For development and runtime tools, see the [Node.js license and bundled notices](https://raw.githubusercontent.com/nodejs/node/main/LICENSE), [Python license](https://docs.python.org/3/license.html), [NumPy license](https://numpy.org/doc/stable/license.html), [Blender licensing](https://www.blender.org/about/license/), [FFmpeg licensing](https://ffmpeg.org/legal.html), and [Google Chrome terms](https://www.google.com/chrome/terms/). The local FFmpeg production build reports GPL version 3 or later via `ffmpeg -L`.

OpenAI use is subject to the applicable account and service terms; see the [OpenAI Services Agreement](https://openai.com/policies/services-agreement/) for API services. These service terms are distinct from the CC0 licenses of the imported asset packs.
