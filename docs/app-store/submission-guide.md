# Launch guide: web app, then App Store

Work through these in order. Each step says where you do it, and what you should see when it worked.

---

## Part 1: Update the backend (Supabase), about 15 minutes

1. **Run the two new database migrations, in order.** In Supabase → **SQL Editor**, paste and run `supabase/migrations/20261106020000_app.sql`, then `supabase/migrations/20261106030000_hardening.sql`. They add onboarding and AI-consent fields, check-in de-duplication, reply reports, time zone and check-in time safeguards, and safe push-token handling. Expect "Success." each time. If you connected GitHub in Supabase, check Table Editor first; they may already be applied.
2. **Deploy all three server functions** from the repo folder in PowerShell:
   ```powershell
   git pull
   npm install
   npm run deploy-functions
   ```
   Expect "Deployed Functions … chat, delete-account, send-checkins."
3. **Add the cron secret.** Supabase → **Edge Functions → Secrets** → add `CRON_SECRET` with any long random string (a password generator works).
4. **Turn on scheduling.** Supabase → **Integrations** (or **Database → Extensions**): enable **pg_cron** and **pg_net**.
5. **Schedule check-ins.** Open `supabase/cron.sql`, replace `<PROJECT-REF>` and `<CRON_SECRET>`, then run it in the SQL Editor. It calls the sender every 10 minutes.
6. **Auth settings.** Supabase → **Authentication → URL Configuration**: set Site URL to your web app address (from Part 2), and add `https://<your-web-address>/reset-password` under Redirect URLs so password-reset links work. Under **Sign In / Providers → Email**, decide whether to require email confirmation. Off is easiest for testing; turn it on before real users.

## Part 2: Put the web app online (Vercel), about 15 minutes

1. **Find the public key.** Supabase → **Project Settings → API Keys** → copy the **publishable** key (`sb_publishable_…`). It's safe to ship inside the app. Never use the secret key in the app.
2. **Try it on your computer first:**
   ```powershell
   cd apps\companion
   npm install
   copy .env.example .env
   notepad .env          # paste your Supabase URL and publishable key
   npx expo start --web
   ```
   A browser opens on the welcome screen. Create an account and go through onboarding, and your companion greets you.
3. **Deploy to Vercel.** On vercel.com → **Add New → Project** → import `faith-companion`. Set **Root Directory** to `apps/companion`. Under **Environment Variables**, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then Deploy. Settings come from `apps/companion/vercel.json`.
4. Optional: add a custom domain in Vercel. Either way, your Privacy, Terms and Support pages are now live at `/privacy`, `/terms` and `/support`. Put this address into Supabase's Site URL (Part 1, step 6).

## Part 3: Fill in the launch details, about 10 minutes

Search the repo for `TODO(launch)`:
- `apps/companion/src/lib/config.ts`: app name, **support email** (must be a real inbox), legal entity name, and `WEB_URL` (your web app address, used by password-reset emails).
- `apps/companion/app.json`: `name` (shown under the icon). The bundle ID `com.amenbuddy.app` is permanent after the first App Store upload, so change it now if you want something else.
- Read the Privacy Policy and Terms at `/privacy` and `/terms`. A quick review by a lawyer before public launch is wise.

Commit and push. Vercel redeploys on its own.

## Part 4: Build the iPhone app (Expo), about 45 minutes, mostly waiting

You don't need a Mac. Expo builds the app in the cloud and signs it with your Apple Developer account.

1. Create a free account at **expo.dev**.
2. In PowerShell, from `apps\companion`:
   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   `init` links the app to your Expo account and writes a `projectId` into `app.json`. Push notifications need it. Commit that change.
3. Open `apps/companion/eas.json` and replace the two placeholder values under `base.env` with your Supabase URL and publishable key.
4. **Build:**
   ```powershell
   npx eas-cli@latest build --platform ios --profile production
   ```
   - Sign in with your Apple Developer account when asked.
   - Say **yes** to letting Expo manage certificates and provisioning.
   - Say **yes** to setting up a push notification key.

   The build runs in the cloud for about 15–30 minutes and ends with a link.
5. **Send it to App Store Connect / TestFlight:**
   ```powershell
   npx eas-cli@latest submit --platform ios --latest
   ```
   If the app doesn't exist in App Store Connect yet, this creates it. About 10–20 minutes later the build appears under TestFlight.
6. **Test on your phone.** Install TestFlight from the App Store, accept the invite to your own app, and go through everything:
   - Sign up and onboarding.
   - Allow notifications.
   - Chat.
   - Change your evening time in Settings to 30 minutes from now, close the app, and wait for Bram's check-in notification.
   - Report a reply.
   - Delete a test account.

## Part 5: Submit for review, about 30 minutes

In App Store Connect → your app:
1. **App Information**: category (Lifestyle; secondary Reference), age rating (see `privacy-and-rating.md`), and the Privacy Policy URL.
2. **App Privacy**: answer exactly as in `privacy-and-rating.md`.
3. **Pricing and Availability**: Free, and the countries you want. Start with the US, since crisis resources are US-specific.
4. **Version page**:
   - Screenshots from `screenshots/`.
   - Text from `listing.md`.
   - Support URL.
   - Select the TestFlight build.
5. **App Review Information**: the demo account and notes from `review-notes.md`.
6. **Add for Review → Submit.** Review usually takes 1–3 days. If they reject something, the message says exactly which guideline; send it to me and we'll fix it.

## Before real users (not required for review)
- Have a pastor or priest review each tradition profile (`content/traditions/`), and write Methodist, Pentecostal and Orthodox.
- Turn on email confirmation in Supabase.
- Watch `message_reports` and `safety_events` in the Supabase Table Editor during the first weeks.
- Paid plans: App Store subscriptions must use Apple's in-app purchase (usually via RevenueCat). Not built yet; the app launches free.
