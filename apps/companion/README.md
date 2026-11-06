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
| `/sign-in` | Email + password sign up / sign in, password reset |
| `/onboarding/about` → `companion` → `focus` → `times`, then `/consent` | The 4-step setup plus AI-data consent. Saves the profile at the end |
| `/home` | Main screen: companion (grows with the streak), today's commitment, week, prayer list, verse for today |
| `/chat` | The conversation. On open, the server adds the first greeting or a due check-in |
| `/settings` | Companion, tradition, translation, check-in times, reminders, legal, sign out, delete account |
| `/privacy`, `/terms`, `/support` | Legal pages, also the App Store URLs |

Shared pieces: `src/components/` (characters, picker, UI kit), `src/lib/` (Supabase client, session, API calls, push, theme).

## Launch

See `../../docs/app-store/submission-guide.md`. Search for `TODO(launch)` for the values to fill in.
