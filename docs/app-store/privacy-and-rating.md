# App Privacy ("nutrition label") and age rating

## App Privacy answers
App Store Connect → App Privacy → Get Started. These match what the code and the privacy policy actually do. If you add analytics, crash reporting, or ads later, update this.

**Do you or your third-party partners collect data from this app?** Yes.

**Is any data used for tracking?** No. No ads, no ad networks, no data brokers, no IDFA.

| Data type (Apple's name) | Collected? | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | No | App Functionality (sign-in, password reset) |
| Contact Info → Name | Yes (first name) | Yes | No | App Functionality (personalization) |
| Sensitive Info | Yes (church tradition = religious belief) | Yes | No | App Functionality |
| User Content → Other User Content | Yes (chat messages, prayer requests, commitments) | Yes | No | App Functionality |
| User Content → Customer Support | Yes (reported replies, support email) | Yes | No | App Functionality |
| Identifiers → User ID | Yes (account ID) | Yes | No | App Functionality |
| Identifiers → Device ID | Yes (push notification token) | Yes | No | App Functionality |
| Usage Data → Product Interaction | Yes (event counts such as "kept a commitment", "shared a card"; never message text) | Yes | No | Analytics, App Functionality |
| Diagnostics, Location, Health & Fitness, Financial, Contacts, Browsing/Search History | No | | | |
| Purchases | No today. Change to Yes (Linked, App Functionality) when Amen Buddy Plus goes live | | | |

Notes:
- "Sensitive Info" is Apple's category for religious beliefs, among others; the tradition choice falls under it.
- Prayer requests can mention health ("my mom is getting tested"), but that's content the user writes, so it's covered by User Content, not Health & Fitness, which means data from HealthKit or fitness tracking.
- If you add in-app purchases later, add Purchases → Purchase History.

## Age rating
App Store Connect → App Information → Age Rating → Edit. Answer the questionnaire honestly:

- Violence, sexual content, profanity, horror, drugs, gambling, contests: **None**.
- Mature or suggestive themes: **None**.
- Medical or treatment information: **None**. The app doesn't give medical advice and redirects crisis topics to 988.
- Unrestricted web access: **No**.
- User-generated content shared with other users: **No**. Chats are private between the user and the AI and never shown to other people.
- If the form asks about AI chat or messaging capabilities: **Yes**. Describe it as a private AI companion chat.

The app's own terms set **13+** as the minimum age, so pick a rating of at least 13+ even if the questionnaire suggests lower.

## Things App Review commonly checks, already handled
- **Consent before sharing data with third-party AI** (guideline 5.1.2(i)): the `/consent` screen at the end of setup names Anthropic and Voyage AI, says what's sent, and requires "I agree". The server refuses AI calls until `ai_consent_at` is set.
- **Account deletion in the app** (guideline 5.1.1(v)): Settings → Delete my account. It deletes the account and all data on the server, not just a sign-out.
- **Sign in with Apple**: not required. The app uses its own email and password and no third-party or social logins.
- **Reporting objectionable AI content**: long-press any companion reply → "Report this reply". Reports are saved in the `message_reports` table.
- **Crisis safety**: every reply follows the safety rules (988 / 911). A permanent footer under the chat states it's an AI and gives 988.
- **No medical claims**: the app never claims to diagnose or treat.
- **Encryption export**: `ITSAppUsesNonExemptEncryption` is set to false in app.json, since the app only uses standard HTTPS. That skips the export-compliance question on each build.
