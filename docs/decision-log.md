# Decision log

Major product and engineering decisions, newest first, with the reason. Keep entries short.

## November 11, 2026: the "breakout" pass

**Meet your buddy before creating an account.** Welcome now goes buddy → what you want help with → your name → *then* the account, framed as "Save your walk with Bram". Reason: the account form was the first thing a new person saw, before any reason to care. Answers are kept on the device so a refresh or an email confirmation doesn't lose them. Check-in times and AI consent stay after sign-up because they belong to an account.

**The share card carries Scripture only.** Today's words of Jesus, the reference, the buddy's world, the app name. Never prayers, commitments, counts or names. Reason: sharing has to be safe by construction, not by a setting someone could get wrong. The user's own world (their tree, their lamps) is on it so it feels like theirs.

**Our own analytics, no third-party trackers.** Events go to our database; they never contain anything the user typed. Reason: trust is the product, App Store privacy answers stay simple, and it costs nothing. The privacy policy and App Store privacy answers were updated to say so.

**Everything grows from what the user does.** (Carried over from the Journal decision.) No counts of answered prayers anywhere.

**Prayer and Scripture are never paywalled.** Plus meters long AI conversation because that is what costs money, and the app says that in plain words. Reason: charging for prayer would be exploiting faith; charging for compute is honest. This is a promise made in the app ("free, and always will be"); change the copy in `src/lib/plus.ts` and `src/app/plus.tsx` if you don't want to make it.

**Nobody is cut off near a crisis.** If a safety concern was logged in the last 24 hours, the free limit doesn't apply. Reason: obvious.

**The paywall ships switched off.** `PAYWALL_ENABLED` (server) defaults to off and `PURCHASES_LIVE` (app) is false. Until both change, nothing is limited and no money can be taken. The Plus screen records "I'd want this" taps so there's demand data before charging.

**RevenueCat for purchases (when approved).** Reason: one integration covers App Store and Play, handles receipts and renewals, free until meaningful revenue. Only the webhook is written; the app-side SDK is deliberately not installed yet because it needs a new native build and store products.

**Prompt caching with an automatic fallback.** The unchanging part of the prompt (rules, tradition, character) is marked cacheable. If the AI provider ever rejects that form, the server retries the plain way and stays that way. Reason: lower cost with no risk to the conversation.

**Prices to test: $49.99 a year (7-day trial) and $7.99 a month.** See `docs/strategy.md` section 4.

**Assumptions made without asking**
- The 12-messages-a-day free allowance (change with the `FREE_DAILY_MESSAGES` server setting).
- AI token prices in `supabase/dashboard.sql` query 8 come from a third-party page; confirm in the Anthropic console.
- The two "coming soon" Plus features (Sunday letter, reading a book together) are the plan of record.
