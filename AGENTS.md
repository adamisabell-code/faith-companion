# Working in this repo (for Claude, ChatGPT, Muse and any other AI tool)

Amen Buddy is a Christian prayer and accountability companion app. Read `README.md`, `docs/strategy.md` and `docs/decision-log.md` before changing anything. App code has its own rules in `apps/companion/AGENTS.md`; follow those too.

This repo is Amen Buddy only. Rumble Co. lives in `rumble-co`. Never copy code, copy, art or plans between the two.

## Lanes

One tool owns a lane at a time. If a task crosses lanes, stop and ask Adam.

| Lane | Files | Default owner |
| --- | --- | --- |
| App | `apps/companion/` | Whichever tool Adam started the task in. Only one tool edits the app per branch. |
| Backend | `supabase/`, `scripts/` | Same rule, and never the same branch as an app change unless the task needs both |
| Companion content | `content/`, `evals/` | Adam approves every change to a companion's voice, the shared rules or a tradition profile |
| Docs and launch | `docs/` | Any tool, on its own branch |

## Rules

1. **Never commit to `main`.** Work on a branch named `<tool>/<short-task>`, for example `claude/sunday-letter`. Adam merges.
2. **Pull before you start, and list the files you touched in the commit message.**
3. **Record every product decision in `docs/decision-log.md`,** newest first, with the reason.
4. **Do not weaken the safety rules.** Scripture only from the database, never from memory. Crisis handling overrides personality. The companion is never God, a pastor or a counselor. If a task seems to need a change to `content/shared-rules.md`, stop and ask.
5. **Do not turn on payments.** `PURCHASES_LIVE` and `PAYWALL_ENABLED` change only when Adam says so in writing.
6. **Prayer and Scripture stay free.** Do not put either behind Plus.
7. **No third-party analytics or trackers.** Events go to our own database and never contain what a user typed.
8. **Never put secrets in the repo.** Only the Supabase publishable key belongs in app code.
9. **Run lint and typecheck in `apps/companion` before you say a task is done.**
