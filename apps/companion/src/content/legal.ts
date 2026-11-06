// Privacy policy, terms and support text. Rendered at /privacy, /terms and /support,
// which are also the URLs you give App Store Connect.
// TODO(launch): have a lawyer review before public launch.
import { APP_NAME, COMPANY_NAME, LEGAL_UPDATED, SUPPORT_EMAIL } from "@/lib/config";

export type Section = { heading?: string; paragraphs?: string[]; bullets?: string[] };
export type Doc = { title: string; updated: string; sections: Section[] };

export const privacy: Doc = {
  title: "Privacy Policy",
  updated: LEGAL_UPDATED,
  sections: [
    { paragraphs: [`${APP_NAME} ("the app") is a Christian prayer and accountability companion made by ${COMPANY_NAME} ("we", "us"). Conversations about faith and life are personal, so we collect only what the app needs to work, we never sell your information, and we don't show ads.`] },
    {
      heading: "What we collect",
      bullets: [
        "Account details: your email address and a password (stored only as a secure hash by our authentication provider).",
        "What you tell us during setup: first name, church tradition, where you are with faith, what you'd like help with, preferred Bible translation, check-in times and time zone.",
        "Your conversations with your companion, and what the companion saves from them so it can follow up: daily commitments, prayer requests, and short notes it remembers (like the name of someone you're praying for).",
        "A push notification token, if you turn on reminders, so we can send your check-ins.",
        "Safety and quality records: if a conversation involves a crisis topic we record that it happened (not a copy of the conversation), and if you report a reply we keep that reply so we can review it.",
      ],
    },
    {
      heading: "How we use it",
      bullets: [
        "To generate your companion's replies and remember your prayers, commitments and check-ins.",
        "To send the check-in reminders you asked for.",
        "To keep the app safe and to fix problems.",
      ],
      paragraphs: ["We do not use your information for advertising, we do not sell or rent it, and we do not build profiles of you for anyone else."],
    },
    {
      heading: "Who processes your information",
      paragraphs: ["We use a small number of service providers who process data on our behalf, only to run the app:"],
      bullets: [
        "Supabase: hosts our database and handles sign-in.",
        "Anthropic: the AI model that writes your companion's replies. Your recent messages and the context the companion needs are sent with each reply request. Anthropic does not use API data to train its models by default.",
        "Voyage AI: turns short search phrases into a format used to find relevant Bible passages.",
        "Expo, Apple and Google: deliver push notifications.",
        "Vercel: hosts the web version of the app.",
      ],
    },
    {
      heading: "Your choices",
      bullets: [
        "Change your companion, tradition, translation or check-in times anytime in Settings.",
        "Turn reminders off in Settings or in your phone's notification settings.",
        "Delete your account anytime in Settings → Delete my account. This permanently deletes your account and everything linked to it: conversations, commitments, prayer requests and saved notes. Copies may remain in encrypted backups for a limited time before they are overwritten.",
        `Email ${SUPPORT_EMAIL} to ask what we hold about you or to ask for a copy.`,
      ],
    },
    { heading: "Security", paragraphs: ["Your data is encrypted in transit and stored with access controls so that each account can only read its own information. No system is perfectly secure, but we work to protect your information and will notify you if a breach affects you as required by law."] },
    { heading: "Children", paragraphs: [`${APP_NAME} is not intended for children under 13, and we don't knowingly collect information from them. If you believe a child under 13 has created an account, contact us and we'll delete it.`] },
    { heading: "Changes", paragraphs: ["If we change this policy we'll update the date above, and for significant changes we'll tell you in the app."] },
    { heading: "Contact", paragraphs: [`${COMPANY_NAME}, Austin, Texas, USA. Email: ${SUPPORT_EMAIL}`] },
  ],
};

export const terms: Doc = {
  title: "Terms of Use",
  updated: LEGAL_UPDATED,
  sections: [
    { paragraphs: [`These terms apply to your use of ${APP_NAME}, made by ${COMPANY_NAME}. By creating an account you agree to them.`] },
    {
      heading: "What the app is, and isn't",
      bullets: [
        "Your companion is an AI. It is not God, Jesus, a pastor, priest, counselor, doctor or lawyer, and it does not speak for any church.",
        "It can make mistakes. Scripture is quoted from published translations through the app's Bible database, but explanations and advice may be wrong or incomplete. Talk with your pastor, priest or a qualified professional about important decisions.",
        "It is not for emergencies. If you are in crisis or thinking about harming yourself, call or text 988 (Suicide & Crisis Lifeline, US) or call 911.",
      ],
    },
    {
      heading: "Your account",
      bullets: [
        "You must be at least 13 years old. If you're under 18, use the app with a parent or guardian's permission.",
        "Keep your password private. You're responsible for activity on your account.",
        "You can delete your account at any time in Settings.",
      ],
    },
    {
      heading: "Using the app well",
      paragraphs: ["Don't use the app to break the law, to harass anyone, to try to get the companion to produce harmful content, or to interfere with the service. We may suspend accounts that do."],
    },
    { heading: "Content", paragraphs: ["Your messages are yours. You give us permission to process them to run the app as described in the Privacy Policy. Bible texts are public-domain or licensed translations and belong to their respective owners."] },
    { heading: "Subscriptions", paragraphs: ["If paid plans are offered, prices and terms will be shown before you buy. Purchases made through the App Store are billed and managed by Apple, and you can cancel in your Apple account settings."] },
    { heading: "No warranty; limits of liability", paragraphs: ["The app is provided \"as is\". To the fullest extent allowed by law, we aren't liable for indirect or consequential damages, and our total liability is limited to the amount you paid us in the past 12 months, if any."] },
    { heading: "Changes and law", paragraphs: ["We may update these terms and will update the date above when we do. These terms are governed by the laws of the State of Texas, USA."] },
    { heading: "Contact", paragraphs: [`Email: ${SUPPORT_EMAIL}`] },
  ],
};

export const support: Doc = {
  title: "Support",
  updated: LEGAL_UPDATED,
  sections: [
    { paragraphs: [`Need help with ${APP_NAME}? Email ${SUPPORT_EMAIL} and we'll get back to you, usually within two business days.`] },
    {
      heading: "Common questions",
      bullets: [
        "How do I switch companions? Settings → Your companion. Your history and prayer requests stay with you.",
        "My check-ins aren't arriving. Make sure reminders are on in Settings and notifications are allowed for the app in your phone's Settings.",
        "Which Bible translation does it use? Your choice in Settings. Every verse comes from that translation's text, with the reference shown.",
        "How do I delete my account? Settings → Delete my account. It's permanent and removes all your data.",
        "I got a reply that seemed wrong or inappropriate. Long-press the reply and tap Report this reply, or email us.",
      ],
    },
    { heading: "If you're in crisis", paragraphs: ["Call or text 988 (Suicide & Crisis Lifeline, US) any time, or call 911 if you're in immediate danger."] },
  ],
};
