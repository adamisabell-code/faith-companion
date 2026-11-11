# Amen Buddy app

One Expo (React Native) codebase that runs as a **web app** (deployed on Vercel) and builds into the **iPhone app** (via Expo's cloud builds). The server side (chat, check-ins, account deletion) lives in `../../supabase/functions`.

## Run it

```bash
npm install
cp .env.example .env     # Supabase URL + publishable key (public values only)
npx expo start --web     # web
npx expo start           # scan the QR code with Expo Go on a phone (push needs a real build)
```

Before committing: `npx tsc --noEmit`.

## Screens (`src/app/`)

| Route | What it is |
|---|---|
| `/welcome` | Meet the cast |
| `/onboarding/companion` → `focus` → `about` | Pick a buddy, what you want help with, your name. **No account needed yet**; answers are kept on the device |
| `/sign-in` | Email + password sign up ("Save your walk with Bram") / sign in, password reset |
| `/onboarding/times`, then `/consent` | Check-in times and AI-data consent. Saves the profile at the end |
| `/plus` | Amen Buddy Plus offer. Takes no money while `PURCHASES_LIVE` is false; records interest |
| `/home` | Main screen: words of Jesus, the companion's world (`components/Scene.tsx`, light by day and dark after 6pm), latest message with quick replies, today's commitment, prayer list |
| `/chat` | The conversation. On open, the server adds the first greeting or a due check-in |
| `/journal` | Journal: what God has done (answered prayers, newest first), every finished chapter with its date, naming Lumi's constellations. No counts or totals on purpose |
| `/settings` | Companion, tradition, translation, check-in times, reminders, legal, sign out, delete account |
| `/privacy`, `/terms`, `/support` | Legal pages, also the App Store URLs |

Shared pieces: `src/components/` (characters, picker, UI kit), `src/lib/` (Supabase client, session, API calls, push, theme).

### What makes the buddies feel alive
- `LivingBuddy.tsx`: breathing, blinking (slower at night), sway, a morning stretch, per-character tap reactions (Pip hops, Bram double-takes, Sola hops twice, Lumi puffs), an easter-egg line every 4th tap, `celebrate()` and the Amen `bow()`. Haptics on iOS/Android. Respects Reduce Motion.
- `SceneStage.tsx`: the world (`Scene.tsx`) with the living buddy standing in it, plus a glow burst where the world just grew (new flower, lamp, twig, star).
- Chapters (`lib/chapters.ts`): worlds never fill up or reset. Pip's bed holds 30 flowers and every full bed grows the mustard tree (then birds come); Bram's road lights 8 lamps per stretch and reaches the well, the olive grove, a house, then the town on a hill; Sola finishes a 16-twig nest and starts the next one higher; every world grows from kept days, never from a count of answered prayers; Lumi's sky gets a star per kept day and every 7 become a constellation, which the user names (`constellation_names` table). Finishing a chapter opens `ChapterMoment.tsx`.
- `PrayerPause.tsx`: "Pause and pray". A breath prayer with the buddy breathing along, your prayer list under "Bringing to God", and the Amen bow.

### Growth plumbing
- `lib/analytics.ts`: `track(name, props)` writes to our own `events` table. Never pass anything the user typed.
- `components/ShareCard.tsx` + `ShareSheet.tsx` + `lib/shareImage(.web).ts`: today's words of Jesus as a 1080×1350 picture in the buddy's world. Scripture only, nothing personal.
- `lib/plus.ts`: the Plus offer, prices, and `usePlus()`. Server side: `subscriptions` table, `is_plus()`, the free limit in `_shared/engine.ts` (off unless `PAYWALL_ENABLED=true`), and `functions/revenuecat-webhook`.
- `../../supabase/dashboard.sql`: the growth dashboard queries. `../../docs/strategy.md` and `../../docs/decision-log.md`: the plan and the reasons.

## Launch

See `../../docs/app-store/submission-guide.md`. Search for `TODO(launch)` for the values to fill in.
