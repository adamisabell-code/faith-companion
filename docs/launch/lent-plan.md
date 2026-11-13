# Amen Buddy: Lent launch plan

November 13, 2026.

## Why Lent

Lent is the one predictable spike in the year for prayer apps. Appfigures calls Hallow's Lent surge "the most predictable spike in the App Store": downloads jump every Lent and revenue follows ([source](https://app.appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue)). In 2027, Ash Wednesday is **February 10** and Easter is **March 28**.

That gives Amen Buddy a fixed date 13 weeks out. The goal is to be live in the App Store, taking payments, with a proven video format, before February 10. It is a target to plan against, not a forecast of revenue.

One caution: Lent is observed by Catholics and many Protestants, but many Baptist and non-denominational Christians do not keep it. The app already knows each user's tradition, so the Lent wording should go to users whose tradition keeps Lent, and everyone else should see "40 days" language.

## Working back from February 10

| When | Milestone | Who | Done when |
| --- | --- | --- | --- |
| By Nov 22 | Web app live, placeholders filled, TestFlight build on your phone | Adam, following `docs/app-store/submission-guide.md` | You get Bram's evening check-in as a push notification |
| Nov 23 to Dec 13 | Ten friends, then 100 real users. Daily videos start (`content-calendar.md`). | Adam | Day-7 retention above 25% and activation above 60% (`docs/strategy.md`, section 5) |
| By Dec 13 | Submitted to App Review | Adam | Approved and live in the US store |
| Dec 14 to Jan 9 | Build the Sunday letter, the first real Plus feature | AI tools, Adam approves | A tester receives a letter on a Sunday |
| Jan 10 to Jan 23 | Payments on: RevenueCat, store products, 7-day trial at $49.99 a year and $7.99 a month | Adam approves, AI tools build | A test purchase works end to end in TestFlight |
| Jan 24 to Feb 6 | "40 days with your buddy": one small daily commitment from Ash Wednesday to Easter, with the buddy's world growing each day | AI tools, Adam approves | A tester can start it from the home screen |
| Feb 1 to Feb 9 | Lent videos: "Giving something up for Lent? Add this instead." Five versions, one per day | Adam | Posted on every account |
| Feb 10 | Ash Wednesday: the 40 days begin | | |
| Mar 28 | Easter: a look-back from the buddy on the 40 days, and the year's best moment to ask for an annual plan | | |

## If the dates slip

- **Not live in the store by January 15:** run Lent on the web app only. The web app needs no review.
- **Payments not ready by February 10:** run Lent free and turn payments on at Easter. A free Lent with strong retention is worth more than a paid one that breaks.
- **Retention below the bar in December:** stop adding features and fix the daily loop first. Lent traffic poured into a leaky app is wasted.

## What not to do

- Do not paywall anything about prayer or Scripture for Lent. The app promises those stay free.
- Do not buy ads before the dashboard shows what a user costs.
- Do not use Lent wording with users whose tradition does not keep it.
