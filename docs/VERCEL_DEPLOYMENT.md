# Deploy AI TOWN on Vercel

Players use the team's OpenAI connection automatically. The regular API key stays in the Node.js function; it is never sent to the browser, included in game saves, or copied into the public build.

Production: [ai-town-ashen.vercel.app](https://ai-town-ashen.vercel.app). The current project was deployed with the Vercel CLI. Automatic deployments from GitHub require a GitHub Login Connection on the Vercel account; until that is connected, publish updates with `vercel deploy --prod --scope aming4mit-5956`.

## Project settings

Import this repository into Vercel. `vercel.json` selects the **Other** framework preset, runs `npm run build`, serves `dist`, and routes `/api/*` to a Node.js function. The function runs in Tokyo (`hnd1`). Enable Fluid compute and use Node.js 22 or later.

Only explicitly allowed game files are copied to `dist`. `.env`, `.vercel`, local configuration, saves, Blender sources, documentation, and tests are excluded from deployment uploads. The build rejects public files containing an apparent OpenAI secret key.

## Server environment variables

In **Settings → Environment Variables**, add these for **Production**. Store credentials as **Secret** (formerly **Sensitive**), not public frontend variables. Do not use `VITE_` or `NEXT_PUBLIC_` prefixes, and do not commit `.env`.

| Variable | Value |
| --- | --- |
| `OPENAI_API_KEY` | The team's project API key, stored as a Secret |
| `OPENAI_MODEL` | `gpt-5.6-luna` |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-mini` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-flare` |

Vercel does not read your computer's `.env`. Enter the value in the dashboard, or pipe it to `vercel env add OPENAI_API_KEY production --sensitive`. Avoid putting its value in a command argument or sharing it in screenshots.

## Shared saves

Connect **Upstash for Redis** from the Vercel Marketplace to the project. For a small playtest, select **Free**, use the **Tokyo / hnd1** primary region, and disable automatic plan upgrades. Keep eviction disabled so a full database reports an error instead of silently removing saves.

The application accepts either pair of server environment variables:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`

The integration can supply these automatically. Use its full-access token, not a read-only token. Redeploy after connecting the database or changing environment variables.

Each tab holds a random session handle. Gameplay, usage counters, and voice-call metadata survive function restarts. Redis locks prevent concurrent requests from overwriting each other's saves. Generated speech and sketches are kept in Redis rather than the function's temporary filesystem. Session records expire after seven days without a request; generated media expires seven days after creation. Production and preview use separate key prefixes. `AI_TOWN_STORAGE_PREFIX` can override the prefix when multiple projects share a database.

Local `npm start` continues to use `data/sessions/` and needs no Redis connection. Hosted requests fail closed when Redis is unconfigured or unavailable; they do not silently reset a player's progress or bypass the shared usage limits.

## Shared-key controls

Hosted players cannot change API keys or models, restore a different connection, or reset the usage allowance through the settings endpoint. Graphics and mouse settings remain available. Cross-site API calls are rejected, request bodies are size-limited, and provider errors do not reveal credentials or raw response bodies.

These daily request limits apply to all players together in each environment. Production overrides give judges and repeat playtests more room for image generation and voice connections:

| Variable | Default | Current production |
| --- | ---: | ---: |
| `AI_TOWN_DAILY_TEXT_LIMIT` | 1,000 Responses requests | 1,000 |
| `AI_TOWN_DAILY_SPEECH_LIMIT` | 500 speech generations | 500 |
| `AI_TOWN_DAILY_IMAGE_LIMIT` | 12 image generations | 50 |
| `AI_TOWN_DAILY_VOICE_LIMIT` | 30 Realtime calls | 100 |

The daily allowance resets at 00:00 UTC (09:00 Japan time). Set a limit to `0` to disable that live feature. The limits count attempts, including failed provider requests. Redeploy after changing a production override.

Each saved session also permits 120 text-generation requests, usually enough for 60 memory-based exchanges, and 40 new speech generations (32 in the café episode). Prerecorded and cached audio does not consume a new speech generation. Starting a new night does not reset the text or speech allowance. Each community run permits up to three generated images. Reaching the text limit uses fallback dialogue; it does not end the game.

New sessions are limited to 20 per IP per hour and 100 total per hour. These are request limits, not a dollar spending cap. An API key that stays private can still incur usage through a public game URL, so share the playtest URL with the intended participants and adjust these limits as needed.

Realtime audio connects directly between the browser and OpenAI over WebRTC. Vercel exchanges SDP on the server without returning a project key or an ephemeral API token. Hosted calls last up to **four minutes**; a bounded `waitUntil` cleanup hangs up the call within the function's five-minute execution limit. Players can reconnect afterward; the game itself has no playtime limit. Local calls retain their five-minute limit. The browser also closes its microphone and call when the panel closes or the tab is hidden.

For previews, add credentials only if live AI testing is needed. Keep Vercel's preview deployment protection enabled. A preview without the database connection cannot start a session.

## Verify the deployment

1. Open the production URL and start a game without entering a key.
2. Rearrange a memory, reload, and continue the saved town.
3. Talk to a resident; test Central's voice connection if a microphone is available.
4. Confirm that `/.env`, `/server/config.mjs`, `/server/local-config.mjs`, and `/data/` return 404.
5. Confirm that API responses show connection status and model names, never the key.

Run `npm test` and `npm run build` before deployment. `tests/hosted.test.mjs` covers independent server instances, session isolation, locked configuration, usage limits, saved media, and the public-file boundary.

References: [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel Secret environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables), [Redis integrations](https://vercel.com/docs/redis), and [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
