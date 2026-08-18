/**
 * Single source of truth for the in-app legal screens (app/legal/*). The standalone hosted
 * pages in docs/ are written separately for public hosting, but should be kept in sync with
 * the content here whenever this file changes.
 */
export const APP_NAME = 'Expense Management';
export const CONTACT_EMAIL = 'rks.peng@gmail.com';
export const GOVERNING_LAW = 'the Province of Ontario and the federal laws of Canada applicable therein';
export const EFFECTIVE_DATE = 'August 18, 2026';

export interface LegalSection {
  heading: string;
  /** Each entry is a paragraph. Entries starting with "• " render as a bullet list item. */
  body: string[];
}

export const termsSections: LegalSection[] = [
  {
    heading: '1. Agreement to Terms',
    body: [
      `"${APP_NAME}" (the "App," "we," "us," or "our") is a personal finance and expense-tracking application developed and operated by an independent individual developer. These Terms of Service ("Terms") govern your access to and use of the App. By downloading, installing, or using the App, you agree to be bound by these Terms and by our Privacy Policy, which is incorporated by reference. If you do not agree, do not use the App.`,
    ],
  },
  {
    heading: '2. What the App Does',
    body: [
      'The App helps you track personal expenses and net worth. Its core features include: scanning or uploading photos of receipts; using optical character recognition (OCR) and AI tools to extract merchant names, amounts, dates, and line items from those photos; manually recording income, expenses, assets, and liabilities; categorizing transactions, including flagging possible tax deductions; exporting your transaction history as a CSV file; and an AI chat assistant that can answer questions about your recorded spending.',
    ],
  },
  {
    heading: '3. Not Financial, Tax, or Accounting Advice',
    body: [
      'The App is a record-keeping and organizational tool only. Nothing in the App — including AI-generated categorizations, tax-deductibility flags, or chat responses — constitutes financial, tax, legal, or accounting advice. Deduction categories and similar suggestions are provided for convenience and may be inaccurate or inapplicable to your situation. You are solely responsible for verifying the accuracy of your financial records and for consulting a qualified professional before making financial or tax decisions.',
    ],
  },
  {
    heading: '4. Eligibility',
    body: [
      'You must be at least 18 years old, or the age of majority in your jurisdiction, to use the App. By using the App, you represent that you meet this requirement. We do not currently verify age, and we rely on you to comply with this restriction.',
    ],
  },
  {
    heading: '5. How Access Works — No Password, No Account Recovery',
    body: [
      'The App does not require you to create an account with an email address or password. Instead, it automatically creates an anonymous, device-linked session the first time you open it, and stores your data under that session. This means:',
      '• We do not know your name, email address, or other identifying information unless you voluntarily provide it to us directly (for example, by emailing us).',
      "• There is no \"forgot password\" or account-recovery flow. If you uninstall the App, clear its data, or switch to a new device without transferring your session first, you will permanently lose access to any transactions, receipts, and net worth data previously synced to our servers. We cannot restore this data for you because we have no way to verify it belongs to you.",
      '• The "Reset App Data" option in Settings clears data stored on your device but does not delete data already stored on our servers; see our Privacy Policy for how to request full deletion.',
    ],
  },
  {
    heading: '6. Your Content',
    body: [
      'You retain ownership of the financial information, receipt images, and other content you submit to the App ("Your Content"). By using the App, you grant us a limited license to store, process, and transmit Your Content — including to third-party service providers such as our OCR and AI providers — solely for the purpose of operating and providing the App\'s features to you, as described in our Privacy Policy. You are responsible for ensuring you have the right to submit any content you upload, including receipts or documents that reference other people.',
    ],
  },
  {
    heading: '7. AI Features',
    body: [
      'Some features (receipt scanning, categorization, and the chat assistant) rely on third-party artificial intelligence services. AI output can be incomplete, incorrect, or nonsensical. Always review extracted data before relying on it, particularly for tax purposes.',
    ],
  },
  {
    heading: '8. Acceptable Use',
    body: [
      'You agree not to: use the App for any unlawful purpose; attempt to interfere with, disrupt, or gain unauthorized access to the App or its underlying infrastructure; upload malicious code; use automated means to scrape or extract data from the App; or use the App\'s AI features to attempt to extract the underlying models, prompts, or system instructions of our third-party providers.',
    ],
  },
  {
    heading: '9. Third-Party Services',
    body: [
      'The App relies on third-party infrastructure providers, including Supabase (database, file storage, and authentication) and Google (Gemini AI for OCR and chat), with OCR.space used as a fallback text-extraction provider. Your use of the App is also subject to those providers\' own terms where applicable. We are not responsible for the availability, performance, or acts of these third parties.',
    ],
  },
  {
    heading: '10. Service Availability',
    body: [
      'We provide the App on an "as available" basis. We do not guarantee uninterrupted or error-free operation and may modify, suspend, or discontinue any part of the App — including third-party AI features — at any time, with or without notice.',
    ],
  },
  {
    heading: '11. Disclaimer of Warranties',
    body: [
      'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT AI-GENERATED CATEGORIZATIONS OR EXTRACTED DATA WILL BE ACCURATE OR COMPLETE.',
    ],
  },
  {
    heading: '12. Limitation of Liability',
    body: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR FINANCIAL LOSS ARISING FROM YOUR USE OF THE APP, INCLUDING RELIANCE ON AI-EXTRACTED OR AI-CATEGORIZED DATA OR THE LOSS OF SYNCED DATA DESCRIBED IN SECTION 5. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR THE APP WILL NOT EXCEED THE AMOUNT YOU PAID US, IF ANY, TO USE THE APP IN THE 12 MONTHS BEFORE THE CLAIM AROSE.',
    ],
  },
  {
    heading: '13. Termination',
    body: [
      'You may stop using the App at any time by uninstalling it. We may suspend or discontinue the App, or your access to it, at any time. Section 5 explains what happens to your data if you lose access to your session; see our Privacy Policy for how to request deletion of data stored on our servers.',
    ],
  },
  {
    heading: '14. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. If we make material changes, we will update the "Effective Date" above and, where practical, notify you within the App. Continued use of the App after changes take effect constitutes acceptance of the revised Terms.',
    ],
  },
  {
    heading: '15. Governing Law',
    body: [`These Terms are governed by the laws of ${GOVERNING_LAW}, without regard to conflict-of-law principles.`],
  },
  {
    heading: '16. Contact',
    body: [`Questions about these Terms can be sent to ${CONTACT_EMAIL}.`],
  },
];

export const privacySections: LegalSection[] = [
  {
    heading: '1. Who We Are',
    body: [
      `"${APP_NAME}" (the "App," "we," "us," or "our") is a personal finance and expense-tracking app developed and operated by an independent individual developer, based in Canada. This Privacy Policy explains what information the App collects, how it's used, and the choices available to you. Questions or requests can be sent to ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: '2. Information We Collect',
    body: [
      "We designed the App to work without collecting your name, email address, or phone number. Specifically:",
      'a) Information you provide',
      '• Receipt photos you scan or import.',
      "• Transaction details — merchant name, amount, date, category, and whether you've marked something as tax-deductible.",
      '• Line items extracted or entered from receipts (individual products and prices).',
      '• Net worth entries you add — a label and dollar amount for each asset or liability.',
      '• Your self-reported employment type (salaried, freelancer, or business owner), collected during onboarding.',
      '• Any messages you send to the in-app AI chat assistant.',
      '• Anything you send us directly, such as an email requesting support or data deletion.',
      'b) Information collected automatically',
      'When you first open the App, we automatically create an anonymous session tied to your device installation so your data can sync to our servers and be there the next time you open the App. This session is a random identifier — it is not linked to your name or any other directly identifying information we hold. We do not currently use analytics, crash-reporting, or advertising software of any kind, so we do not collect device analytics, ad identifiers, or behavioral tracking data.',
      'c) Information from optional device permissions',
      '• Camera — to let you photograph receipts. Only used when you actively take a photo.',
      '• Photo library — to let you import an existing receipt photo. Only used when you actively pick a photo.',
      "• Face ID / biometric authentication — used only to lock the App on your own device. Your biometric data is processed entirely by your device's operating system; we never receive, see, or store it.",
      "Each permission is optional and can be revoked at any time in your device's system settings; revoking a permission just disables the related feature.",
    ],
  },
  {
    heading: '3. How We Use Your Information',
    body: [
      "We use the information above to: operate the App's core features (recording, categorizing, and displaying your transactions and net worth); extract data from receipt photos using OCR and AI (described in Section 4); power the AI chat assistant, which is given your spending categories, income type, and asset/liability totals as context so it can answer questions about your finances; generate the CSV export you request; and provide support when you contact us.",
    ],
  },
  {
    heading: '4. Third Parties We Share Data With',
    body: [
      'We use a small number of third-party service providers to operate the App. We do not sell your information, and we do not share it for advertising or marketing purposes.',
      "• Supabase — our database, file storage, and authentication provider. Your transactions, net worth entries, and receipt photos are stored on Supabase's infrastructure, protected by access rules that restrict each anonymous session to its own data.",
      "• Google (Gemini API) — receipt photos and your chat messages (along with the financial context described in Section 3) are sent to Google's Gemini AI service to extract receipt data and generate chat responses. This data is subject to Google's own API terms and privacy practices.",
      "• OCR.space — used as a fallback text-extraction service if Gemini is unavailable. Receipt photos may be sent to OCR.space for processing. We currently use OCR.space's shared public testing endpoint rather than a dedicated account; we are working to move this to a dedicated, privacy-reviewed integration.",
      'Because these providers may process data outside of Canada (including in the United States), your information may be transferred internationally as a result. Each provider is contractually or contextually limited to using this data to provide the requested service to us.',
    ],
  },
  {
    heading: '5. Data Storage & Security',
    body: [
      'Receipt photos are stored in a private storage bucket and are only ever made accessible to your session through short-lived, time-limited links generated on demand. Database rows are protected by row-level security rules tied to your anonymous session. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    heading: '6. Data Retention & Deletion',
    body: [
      'We retain your data for as long as your session remains active on our servers, or until you ask us to delete it. Using "Reset App Data" in Settings clears the transactions, net worth items, and onboarding information stored on your device, and starts you over in the App — but it does not delete the corresponding data already stored on our servers.',
      `To request full deletion of your data from our servers (transactions, net worth entries, and receipt photos), email ${CONTACT_EMAIL} from any address and describe your request; because sessions are anonymous, we may ask for details (such as approximate account-creation date or sample transaction data) to help identify the right records. We aim to complete deletion requests within 30 days.`,
    ],
  },
  {
    heading: '7. Your Rights',
    body: [
      'Depending on where you live, you may have rights to access, correct, or delete your personal information, or to object to certain processing. Because the App does not collect your name or contact information, the most direct way to exercise these rights is: use the in-app "Export Full History (CSV)" feature to access your transaction data, or email us to request access, correction, or deletion. We will respond to verifiable requests as required by applicable law, including Canada\'s Personal Information Protection and Electronic Documents Act (PIPEDA) and, where applicable, the EU/UK GDPR or U.S. state privacy laws.',
    ],
  },
  {
    heading: "8. Children's Privacy",
    body: [
      'The App is not directed at, and is not intended for use by, anyone under 18. We do not knowingly collect information from children. If you believe a child has provided us information, contact us and we will delete it.',
    ],
  },
  {
    heading: '9. Push Notifications',
    body: [
      'Settings includes a Push Notifications toggle. This preference is currently stored only on your device — the App does not yet send push notifications, and no data is transmitted for this purpose. We will update this Policy before that changes.',
    ],
  },
  {
    heading: '10. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Effective Date" above, and where practical, we\'ll notify you in the App.',
    ],
  },
  {
    heading: '11. Contact Us',
    body: [`Privacy questions, or requests to access or delete your data: ${CONTACT_EMAIL}.`],
  },
];

export const dataCollectionSections: LegalSection[] = [
  {
    heading: 'What We Collect',
    body: [
      '• Receipt photos — when you scan or import one.',
      '• Transaction details — merchant, amount, date, category, tax-deductible flag.',
      '• Line items — individual products/prices read off a receipt.',
      '• Net worth entries — labels and amounts you enter for assets/liabilities.',
      '• Employment type — salaried, freelancer, or business owner (asked once, during setup).',
      '• Chat messages — anything you type to the AI assistant.',
    ],
  },
  {
    heading: "What We DON'T Collect",
    body: [
      '• Your name',
      '• Your email address or phone number',
      '• Your location',
      '• Your contacts',
      '• Bank account or card numbers — the App has no bank-linking feature; everything is entered manually.',
      '• Advertising or tracking identifiers — there is no analytics or ad SDK in this App.',
    ],
  },
  {
    heading: 'Where It Goes',
    body: [
      '• Supabase — stores your transactions, net worth data, and receipt photos.',
      '• Google Gemini AI — reads your receipt photos to extract data, and powers the chat assistant (which is given your spending categories and totals as context).',
      '• OCR.space — a fallback text-extraction service used only if Gemini is unavailable.',
    ],
  },
  {
    heading: 'Permissions This App Requests',
    body: [
      '• Camera — to photograph a receipt. Asked only when you tap "scan."',
      '• Photos — to import an existing receipt photo. Asked only when you tap "import."',
      '• Face ID / biometrics — to lock the App on your device. This never leaves your device — we never see it.',
      "You can revoke any of these anytime in your device's system Settings.",
    ],
  },
  {
    heading: 'Deleting Your Data',
    body: [
      `Resetting the App (Settings → Reset App Data) clears what's on your device, but not what's already synced to our servers. To delete everything permanently, email ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'Questions?',
    body: [`See the full Privacy Policy and Terms of Service in Settings, or email ${CONTACT_EMAIL}.`],
  },
];
