# Original sound design

`build_audio.py` renders deterministic, original PCM from layered pressure
transients, filtered noise, action mechanisms, granular foley and acoustic tails.
It masters each clip and uses FFmpeg to encode AAC-LC in M4A containers. There
are no sampled commercial weapons or sounds extracted from other games.
`weapons.json` records the existing weapon categories and action timings.

```sh
npm run assets:audio
node scripts/release.mjs 59
```

Requirements: Python with NumPy/SciPy and FFmpeg. The output is 286 recordings
in two segmented sound-bank files, plus per-clip offsets, durations and mastering
metrics. Three unsuppressed and two suppressed variations exist for every weapon;
reload, seat and rack actions accompany them. Boots cover seven surface families,
impacts cover five, and explosions have three variations. The melee weapon keeps
its own swing/action treatment.

Safari decodes M4A natively. The loader performs two decoder jobs at a time and
publishes clips incrementally. Legacy short synthesis remains a responsive
startup fallback. Playback uses 24 total voices, a 16-voice ambient limit, player
priority, positional stereo cues, distance/wall filtering and two shared short-room/warehouse
responses selected from roof geometry. Outdoors remains dry; destroyed roofs
stop selecting the indoor response. These are designed sounds, not field recordings. Hardware audio
latency and loudspeaker response still require physical device listening.
