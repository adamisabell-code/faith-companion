# App Store listing

Copy-paste into App Store Connect → your app → App Store tab. Limits are Apple's; every field below fits.

## Name (30 max)
```
Amen Buddy
```
A web search found no app with this exact name (Nov 2026), but App Store Connect is the real test. Create the app there soon to reserve the name; it says right away if it's taken. Also run a quick trademark search at the USPTO before you commit. If the name changes, update `apps/companion/app.json` (`name`) and `apps/companion/src/lib/config.ts` (`APP_NAME`).

## Subtitle (30 max)
```
Prayer & accountability buddy
```

## Promotional text (170 max, can change anytime without review)
```
Meet Pip, Bram, Sola and Lumi: four companions who pray with you, quote real Scripture, and check in every morning and evening so your faith habits actually stick.
```

## Description (4,000 max)
```
A friend for your walk with God.

Pick a companion, tell them what's on your heart, and they'll pray with you, point you to Scripture, and check in every morning and evening. They remember your prayer requests and ask how things went, so you're never carrying it alone.

MEET THE CAST
• Pip, a tiny mustard seed. Faith that starts small. Pip grows as your daily habit grows.
• Bram, a talking donkey (yes, like the one in Numbers 22). Honest, funny, and always asks if you did what you said.
• Sola, a little sparrow. Gentle and attentive for worried, anxious seasons.
• Lumi, a lost lamb. Soft and patient for grief, hard seasons, and coming back to faith.

WHAT YOUR COMPANION DOES
• Lives on your home screen and grows as your streak grows (Pip literally sprouts new leaves)
• Prays with you in plain, personal words
• Morning: helps you set one small, doable commitment
• Evening: checks in on exactly what you said you'd do
• Remembers prayer requests, follows up, and keeps a list of the prayers God answered
• Finds Bible passages for what you're going through

REAL SCRIPTURE, NOT MADE-UP VERSES
Every verse comes word-for-word from a published translation with its reference: Berean Standard, King James, World English or Douay-Rheims. Your companion never quotes from memory.

RESPECTS YOUR TRADITION
Non-denominational, Baptist, Catholic and more. Your companion follows your church's teaching and is upfront when Christians see things differently, and encourages you to talk with your pastor or priest.

HONEST ABOUT WHAT IT IS
Your companion is an AI. It points you to God; it isn't God, a pastor, or a counselor. If you're ever in crisis, it will point you to real help right away.

PRIVATE BY DESIGN
No ads. We never sell your data. Delete your account and everything in it anytime from Settings.
```

## Keywords (100 bytes max, comma-separated, no spaces after commas)
```
prayer,bible,christian,devotional,faith,accountability,scripture,prayer journal,jesus,church,habit
```

## Category
- Primary: **Lifestyle**
- Secondary: **Reference** (where most Bible apps sit)

## URLs
Deploy the web app first (see submission-guide.md); these pages are part of it.
- Support URL: `https://<your-domain>/support`
- Marketing URL (optional): `https://<your-domain>`
- Privacy Policy URL: `https://<your-domain>/privacy`

## Copyright
```
2026 Isabell Holdings AI
```
(Use your exact legal entity name.)

## Screenshots
`screenshots/` has five 1320 × 2868 PNGs, the 6.9" iPhone size, which App Store Connect scales down for smaller iPhones. Upload in this order:
1. `1-welcome.png`: meet the cast
2. `2-home.png`: Pip's home, with today's commitment, streak, prayer list and verse
3. `3-pick-companion.png`: choosing Sola, with her story
4. `4-chat-bram-checkin.png`: Bram's evening accountability check-in with real Scripture
5. `5-chat-lumi-comfort.png`: Lumi comforting someone on a hard anniversary

They're rendered from the real app screens with demo conversations. Once you have a TestFlight build, real device screenshots are a nice upgrade, but these are valid.
