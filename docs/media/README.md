# README demo

The top of the repository README embeds the [MP4 demo v9](https://github.com/user-attachments/assets/7579595f-eb28-4ede-bc77-58cb868f7f98) using GitHub’s native video player. This existing attachment retains the previous title card. The retitled **AI TOWN** preview is prepared locally at `exports/ai-town-demo-v9-readme.mp4`: 60 seconds, 1280 × 720, 30 fps, 9,409,207 bytes. Its AAC audio packets are identical to the 1080p master. The README attachment has not been replaced.

The following GIF remains available as an optional silent preview.

`ai-town-demo-v9.gif` is the full 60-second **AI TOWN** demo v9, with English captions and no audio. It loops continuously at 544 × 306, 6 fps, using a 128-color palette. The file is under 10 MB and is committed here so the GitHub README can display it directly.

Generate it from the completed MP4 at the repository root:

```sh
ffmpeg -hide_banner -loglevel error -y \
  -i exports/ai-town-demo-v9.mp4 \
  -filter_complex '[0:v]fps=6,scale=544:-1:flags=lanczos,split[v][p];[p]palettegen=max_colors=128:stats_mode=diff[pal];[v][pal]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle' \
  -loop 0 docs/media/ai-town-demo-v9.gif
```

The original 1920 × 1080 MP4 with English voices and music remains in the ignored `exports/` directory.

Create the MP4 preview with two-pass H.264 encoding, retaining the original audio:

```sh
ffmpeg -hide_banner -loglevel error -y \
  -i exports/ai-town-demo-v9.mp4 \
  -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -preset slow -b:v 1000k \
  -pass 1 -passlogfile /tmp/ai-town-readme-mp4 \
  -an -f null /dev/null

ffmpeg -hide_banner -loglevel error -y \
  -i exports/ai-town-demo-v9.mp4 \
  -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -preset slow -b:v 1000k \
  -pass 2 -passlogfile /tmp/ai-town-readme-mp4 \
  -c:a copy -movflags +faststart exports/ai-town-demo-v9-readme.mp4
```
