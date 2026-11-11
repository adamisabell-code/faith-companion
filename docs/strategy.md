# Amen Buddy: audit, plan and the path to $15K a month

Written November 11, 2026. Plain-language summary of where the product stands, what was changed in this pass, and what to do next. Numbers marked **(estimate)** are assumptions to be replaced by real data from `supabase/dashboard.sql`. The app has no real users yet, so there is no performance data to report.

## 1. The audit

**What it does today.** You pick one of four companions (Pip, Bram, Sola, Lumi). It checks in each morning and evening, helps you set one small commitment, remembers your prayer requests and follows up, quotes real Scripture from a database in your translation, and lives in a small world that grows as you keep your word. There's a 30-second "Pause and pray", a journal, and words of Jesus on the home screen.

**Most likely paying customer.** A Christian adult, 25 to 45, who believes daily prayer and Scripture matter but is inconsistent, and who has tried a Bible app and a reading plan and dropped both. They don't need more content. They need someone to notice whether they showed up. Second audience: people in a hard season (grief, worry) who want company at 11pm, which is who Sola and Lumi are for.

**The problem it solves.** Not "access to the Bible" (free everywhere). It solves *follow-through and company*: being asked "did you do what you said?" and "how did the test results come back?" by something that remembers.

**Why open it daily.** The check-in is addressed to you, about your commitment, from a character you chose. The world grows. The prayer list is yours.

**What's different.** Hallow, Glorify and YouVersion are content libraries. Generic AI chat forgets you and has no rhythm. Amen Buddy is the only one built around a *relationship with accountability*: a named character, your tradition's beliefs respected, real Scripture only, and a twice-daily rhythm.

**Why pay instead of using a free Bible app or ChatGPT.** Memory, follow-up, the rhythm, the character, guardrails (it never invents verses, never speaks as God), and the world. The honest answer on price: conversations cost real money to run, and that is what Plus pays for.

**What was holding it back (before this pass).**
1. **An account wall before any value.** "Get started" went straight to an email-and-password form. You hadn't met a buddy yet.
2. **Nothing to share.** No way for a happy user to show anyone.
3. **Flying blind.** No analytics. No way to know where people drop off, who comes back, or what a user costs.
4. **Unknown and uncontrolled AI cost.** Every turn re-sent the full rules at full price, and nothing recorded what a user costs.
5. **No way to charge.** No subscription tables, no entitlement check, no paywall, no free-plan boundary.
6. **Not launched.** No deployed web app, placeholder support email, no App Store listing live. This is still the biggest blocker and only Adam can do it.

## 2. What the best apps actually do (mechanics, not looks)

| App | What works | What we take |
|---|---|---|
| **Finch** | A character you care for grows when *you* do small things. Free tier is generous enough to form attachment before any ask. Grew through people posting their own bird. | The buddy's world already works this way. Sharing must show *your* buddy, not an ad. |
| **Tolan** | One distinctive character, strong visual identity that reads instantly in a feed. AI cost forced a paywall within two weeks of launch. | Characters are the brand. Know AI cost per user before scaling. |
| **Duolingo** | A daily loop under two minutes, with a character who notices. | Morning commitment, evening check-in. We skip the guilt. |
| **Headspace** | A signature ritual (the breathing exercise) that *is* the product. | Pause and pray is ours. |
| **Hallow** | Core daily prayers free; $9.99 a month or $69.99 a year for the library; a family plan. | Keep prayer and Scripture free. Price below Hallow. Family plan later. |

Benchmarks used below (RevenueCat, State of Subscription Apps 2026): freemium apps convert about 2% of installs to paid by day 35 at the median, hard paywalls about 10.7%; 7-day-plus trials convert better than 3-day; AI apps earn more per payer in year one but monthly plans retain worse; roughly 7 in 10 annual subscribers cancel in the first year across the industry.

## 3. Scored plan

Scores are 1 (low) to 5 (high). Effort: 5 = quick. Confidence is in the hypothesis, not a guarantee.

| # | Work | Acquisition | Retention | Paid | User value | Effort | Confidence | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Meet your buddy *before* the account wall | 4 | 2 | 2 | 4 | 4 | 4 | **Done** |
| 2 | Shareable verse card with your buddy's world | 4 | 2 | 1 | 3 | 4 | 3 | **Done** |
| 3 | Analytics + AI cost per user | 0 | 0 | 0 | 0 | 4 | 5 | **Done** (enables everything else) |
| 4 | Prompt caching (cut AI cost) | 0 | 0 | 3 | 0 | 5 | 4 | **Done** |
| 5 | Subscription plumbing + Plus screen + demand test | 0 | 0 | 5 | 2 | 3 | 4 | **Done, switched off** |
| 6 | **Launch**: deploy web, support email, App Store, TestFlight | 5 | 0 | 5 | 5 | 3 | 5 | Adam |
| 7 | Sunday letter (weekly look-back from your buddy, a Plus feature) | 1 | 5 | 4 | 5 | 3 | 4 | Next |
| 8 | "Pray for me" link: send one prayer request to a friend who can tap "I prayed" | 5 | 3 | 1 | 4 | 2 | 3 | Next |
| 9 | 7-day Plus trial offered at the end of setup (skippable) | 0 | 1 | 5 | 2 | 4 | 4 | After payments |
| 10 | Try a first conversation before creating an account | 4 | 1 | 1 | 4 | 2 | 3 | Experiment |
| 11 | Cheaper model for the short check-in openers | 0 | 0 | 2 | 0 | 4 | 3 | After cost data |
| 12 | Read a book of the Bible together (Plus) | 1 | 4 | 3 | 5 | 2 | 3 | Later |
| 13 | Family plan | 2 | 2 | 3 | 3 | 2 | 2 | Later |

## 4. The business model

**Free for everyone, always:** your buddy and its world, morning and evening check-ins, today's words of Jesus and sharing them, Pause and pray, the journal, and a daily conversation (12 messages a day once the limit is switched on; check-ins don't count).

**Plus adds:** conversations without a daily limit; the Sunday letter; reading a book of the Bible together. The last two aren't built yet and are labelled "coming soon" in the app.

**Why this line.** Nobody should hit a paywall on prayer or Scripture; that would be exploiting faith. The thing that genuinely costs money is long AI conversation, so that's what's metered, and the app says so plainly. Nobody is cut off within a day of a crisis topic being raised, whatever their plan.

**Prices to test first:** **$49.99 a year with a 7-day free trial**, or **$7.99 a month**. Below Hallow ($69.99 / $9.99), above a throwaway price. Don't assume cheaper wins: test $59.99 and $39.99 a year once there's traffic.

**What a user costs (estimate).** One conversation turn sends roughly 8,000 to 12,000 tokens in and gets about 250 back. At the published rates I found for the current model ($2 in, $10 out, $0.20 cached, per million tokens; from a third-party pricing page, so check your Anthropic console), that is about **2 to 3 cents a turn without caching and about 1 to 1.5 cents with it**. Rough monthly cost:

| User | Turns a day | AI cost a month (estimate) |
|---|---|---|
| Light (check-ins only) | 2 | about $0.75 |
| Typical | 5 | about $2 |
| Free user at the daily limit every day | 14 | about $5.50 |
| Heavy Plus user | 30 | about $12 |

So a heavy Plus user on the yearly plan (about $3.50 a month after Apple's cut) can cost more than they pay, and free users are a real cost, not zero. That's why this pass added cost tracking, caching and the free limit, and why item 11 matters. **Don't turn on paid marketing until dashboard query 8 shows the real number.**

## 5. Path to $15K a month

Assume 65% of payers choose yearly and 35% monthly **(estimate)**. Average gross per subscriber per month = 0.65 × $4.17 + 0.35 × $7.99 ≈ **$5.50**.

- **Subscribers needed: about 2,700.** After Apple's 15% (Small Business Program) that's about $12,750 net, before AI cost.
- At 3% of installs paying: **about 90,000 installs**. At 5%: **about 55,000**. The median freemium app gets about 2%, so 3 to 5% needs a good trial offer and a product people actually return to.
- Yearly plans are paid up front. MRR only holds if people renew, and across the industry most don't. Retention features (items 7 and 12) are what make this a business rather than a spike.

**Milestones, in order:**
1. **100 real users** (friends, church small groups, your own network). Goal: day-7 retention above 25% and activation above 60%. If not, fix the product before spending anything.
2. **Demand check.** At least 8% of weekly active users tap "I'd want this" on the Plus screen.
3. **Turn on payments** (your approval). Target: 3% or more of new installs start a trial; 40% or more of trials convert.
4. **Scale what worked.** Short videos of the buddies (the Finch and Tolan playbook), church and small-group partnerships, the share card and "pray for me" loop.

**The next three highest-leverage actions**
1. **Launch it.** Deploy the web app, set the support email, get TestFlight in ten friends' hands. Nothing else matters until real people use it.
2. **Build the Sunday letter.** It's the strongest reason to come back each week and the clearest thing to pay for.
3. **Build the "pray for me" link.** It's the one growth loop that fits what the app is: a person asking a friend to pray.

## 6. What the numbers mean (definitions)

All in `supabase/dashboard.sql`, one block per metric.

| Metric | Definition |
|---|---|
| New installs | From App Store Connect (web: `welcome_viewed` distinct devices) |
| Onboarding completion | `onboarding_completed` ÷ `welcome_viewed`, by device (query 1) |
| Activation | Finished setup **and** sent a message to their buddy within 24 hours (query 2) |
| Day 1 / 7 / 30 retention | Of people who finished setup that week, the share who sent a message or kept a commitment on that day (query 3) |
| Weekly active users | Sent a message or kept a commitment that week (query 4) |
| Shares | `share_completed` events and distinct people sharing (query 5) |
| Invite-to-install | **Not measurable yet.** Needs the deployed web address on the card plus a link tag |
| Plus demand | People who viewed Plus, and who tapped "I'd want this", by plan (query 6) |
| Trials, subscribers, MRR | From the `subscriptions` table once payments are live (query 7) |
| Churn | Subscribers whose status became `expired` in the month ÷ subscribers at the start. Add once there are subscribers |
| AI cost per active user | Token counts × price, per user, last 30 days (query 8) |
| Net revenue | MRR × 0.85 (Apple) − total AI cost (queries 7 and 8) |

## Sources
- [Hallow: how much does it cost](https://help.hallow.com/en/articles/2880438-how-much-does-it-cost)
- [RevenueCat: subscription app trends and benchmarks 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026.md)
- [RevenueCat Sub Club: Tolan's founder on building a lovable alien](https://revenuecat.com/blog/growth/ajay-mehta-sub-club-podcast-2025)
- [Growth teardown: how Finch grew on TikTok](https://growthmap-www.pages.dev/blog/finch-growth-teardown/)
- [eesel: Claude Sonnet 5.5 pricing](https://www.eesel.ai/blog/claude-sonnet-5-5-pricing)
