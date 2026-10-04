# Real device benchmark reports

Authenticated reports are created here as `YYYY/MM/<random-session-uuid>.json`.
The UUID identifies a recording, not a device. Every file is immutable; historical
results are never replaced. Session `kind` separates `gameplay` and `scripted`.

No iPhone benchmark data has been recorded as part of implementing this system.
Synthetic unit-test clocks and cloud-browser checks belong in `tests/` or `docs/`,
never here. Neither cloud-browser FPS nor a desktop mobile viewport is iPhone FPS.

Read `docs/BENCHMARK.md` for one-time setup, definitions and comparisons. Later,
ChatGPT can list this directory through GitHub, retrieve reports, and compare
individual recordings without transferring files through the conversation.
