/**
 * The in-app privacy policy, rendered natively by PrivacyPolicyScreen.
 *
 * Keep this in step with what the app actually does — App Review compares the
 * policy against the app's behaviour and its App Store privacy labels. The same
 * text should be hosted at the Privacy Policy URL set in App Store Connect.
 */
import type { AppLanguage } from '../localizations/i18n';

// TODO: confirm these with the client before release.
export const PRIVACY_CONTACT_EMAIL = 'info@crosscambodia.com';
export const PRIVACY_LAST_UPDATED = '2026-09-25';

export type PolicySection = {
  id: string;
  icon: string;
  title: string;
  body?: string[];
  bullets?: string[];
};

export type PrivacyPolicyContent = {
  intro: string;
  highlights: { icon: string; text: string }[];
  sections: PolicySection[];
};

const en: PrivacyPolicyContent = {
  intro:
    'This policy explains what information the MOptic app collects, why we collect it, and the choices you have. It applies to the MOptic mobile app and the services provided through it.',
  highlights: [
    { icon: 'scan-outline', text: 'Face scans and eye tests run on your device and are never uploaded.' },
    { icon: 'ban-outline', text: 'We do not sell your data or use it for advertising tracking.' },
    { icon: 'trash-outline', text: 'You can delete your account at any time from inside the app.' },
  ],
  sections: [
    {
      id: 'collect',
      icon: 'document-text-outline',
      title: 'Information we collect',
      body: ['When you create an account or visit one of our stores, we may collect:'],
      bullets: [
        'Account details: your phone number and the PIN you choose (stored securely, never in plain text).',
        'Profile details: name, email, age, gender, your preferred branch and an optional profile photo.',
        'Eye care records: prescriptions and refraction history recorded by our optometrists.',
        'Purchases and loyalty: invoices, payments, loyalty points, tier and redeemed rewards.',
        'Device information: a push notification token so we can send you alerts, if you allow notifications.',
      ],
    },
    {
      id: 'device',
      icon: 'phone-portrait-outline',
      title: 'Information that stays on your device',
      bullets: [
        'Camera: the face-shape scan and virtual try-on process the camera image on your device. Photos from the scan are not uploaded or stored on our servers.',
        'Mobile eye test: results are calculated on your device and are for guidance only.',
        'Photos: we only access the photo you choose as your profile picture, and only upload that photo.',
        'Location: the app does not collect or store your location.',
      ],
    },
    {
      id: 'use',
      icon: 'options-outline',
      title: 'How we use your information',
      bullets: [
        'To sign you in and keep your account secure.',
        'To show your prescriptions, purchase history and loyalty points.',
        'To let you redeem rewards and receive member benefits.',
        'To send notifications about your orders, promotions and new stock, if you allow them.',
        'To provide customer support and improve our services.',
      ],
    },
    {
      id: 'share',
      icon: 'people-outline',
      title: 'Sharing',
      body: [
        'We do not sell your personal information. We share it only with service providers that help us run the app, such as our hosting provider, the SMS provider that sends your sign-in code, and Google Firebase for push notifications, or when required by law.',
      ],
    },
    {
      id: 'retention',
      icon: 'time-outline',
      title: 'Storage and retention',
      body: [
        'Your information is stored on secure servers and transmitted over encrypted connections. We keep it while your account is active. When you delete your account, we delete your personal information, except for records we are legally required to keep, such as sales invoices, which are kept without identifying you where possible.',
      ],
    },
    {
      id: 'rights',
      icon: 'shield-checkmark-outline',
      title: 'Your choices and rights',
      bullets: [
        'View and update your profile details in the app.',
        'Turn notifications on or off in your device settings or in Notification Settings.',
        'Revoke camera or photo access at any time in your device settings.',
        'Delete your account in Profile → Account Settings → Delete Account. This permanently removes your account and personal data.',
      ],
    },
    {
      id: 'children',
      icon: 'happy-outline',
      title: 'Children',
      body: [
        'The app is not directed at children under 13. Eye care records for children are created in store with a parent or guardian present.',
      ],
    },
    {
      id: 'changes',
      icon: 'refresh-outline',
      title: 'Changes to this policy',
      body: [
        'We may update this policy from time to time. We will show the new date at the top of this page and, for significant changes, notify you in the app.',
      ],
    },
  ],
};

const km: PrivacyPolicyContent = {
  intro:
    'គោលការណ៍នេះពន្យល់អំពីព័ត៌មានដែលកម្មវិធី MOptic ប្រមូល មូលហេតុដែលយើងប្រមូល និងជម្រើសដែលអ្នកមាន។ វាអនុវត្តចំពោះកម្មវិធីទូរស័ព្ទ MOptic និងសេវាកម្មដែលផ្តល់តាមរយៈកម្មវិធីនេះ។',
  highlights: [
    { icon: 'scan-outline', text: 'ការស្កេនមុខ និងការពិនិត្យភ្នែក ដំណើរការលើឧបករណ៍របស់អ្នក ហើយមិនត្រូវបានផ្ញើចេញឡើយ។' },
    { icon: 'ban-outline', text: 'យើងមិនលក់ទិន្នន័យរបស់អ្នក ឬប្រើវាសម្រាប់តាមដានការផ្សាយពាណិជ្ជកម្មទេ។' },
    { icon: 'trash-outline', text: 'អ្នកអាចលុបគណនីរបស់អ្នកបានគ្រប់ពេល ពីក្នុងកម្មវិធី។' },
  ],
  sections: [
    {
      id: 'collect',
      icon: 'document-text-outline',
      title: 'ព័ត៌មានដែលយើងប្រមូល',
      body: ['នៅពេលអ្នកបង្កើតគណនី ឬមកកាន់ហាងរបស់យើង យើងអាចប្រមូល៖'],
      bullets: [
        'ព័ត៌មានគណនី៖ លេខទូរសព្ទ និងលេខ PIN ដែលអ្នកជ្រើសរើស (រក្សាទុកដោយសុវត្ថិភាព មិនមែនជាអក្សរធម្មតាទេ)។',
        'ព័ត៌មានផ្ទាល់ខ្លួន៖ ឈ្មោះ អ៊ីមែល អាយុ ភេទ សាខាដែលអ្នកចូលចិត្ត និងរូបភាពប្រវត្តិរូប (ស្រេចចិត្ត)។',
        'កំណត់ត្រាថែទាំភ្នែក៖ វេជ្ជបញ្ជា និងប្រវត្តិវាស់ភ្នែក ដែលកត់ត្រាដោយអ្នកជំនាញភ្នែករបស់យើង។',
        'ការទិញ និងសមាជិកភាព៖ វិក្កយបត្រ ការទូទាត់ ពិន្ទុសមាជិក កម្រិតសមាជិក និងរង្វាន់ដែលបានប្តូរ។',
        'ព័ត៌មានឧបករណ៍៖ Token សម្រាប់ផ្ញើការជូនដំណឹង ប្រសិនបើអ្នកអនុញ្ញាត។',
      ],
    },
    {
      id: 'device',
      icon: 'phone-portrait-outline',
      title: 'ព័ត៌មានដែលនៅលើឧបករណ៍របស់អ្នក',
      bullets: [
        'កាមេរ៉ា៖ ការស្កេនរាងមុខ និងការសាកវ៉ែនតា ដំណើរការរូបភាពនៅលើឧបករណ៍របស់អ្នក។ រូបភាពពីការស្កេនមិនត្រូវបានផ្ញើ ឬរក្សាទុកនៅលើម៉ាស៊ីនមេរបស់យើងទេ។',
        'ការពិនិត្យភ្នែកតាមទូរសព្ទ៖ លទ្ធផលត្រូវបានគណនានៅលើឧបករណ៍របស់អ្នក ហើយសម្រាប់ជាការណែនាំប៉ុណ្ណោះ។',
        'រូបភាព៖ យើងចូលប្រើតែរូបភាពដែលអ្នកជ្រើសរើសជារូបប្រវត្តិរូប ហើយផ្ញើតែរូបភាពនោះប៉ុណ្ណោះ។',
        'ទីតាំង៖ កម្មវិធីមិនប្រមូល ឬរក្សាទុកទីតាំងរបស់អ្នកទេ។',
      ],
    },
    {
      id: 'use',
      icon: 'options-outline',
      title: 'របៀបដែលយើងប្រើប្រាស់ព័ត៌មាន',
      bullets: [
        'ដើម្បីឱ្យអ្នកចូលគណនី និងរក្សាសុវត្ថិភាពគណនីរបស់អ្នក។',
        'ដើម្បីបង្ហាញវេជ្ជបញ្ជា ប្រវត្តិទិញ និងពិន្ទុសមាជិករបស់អ្នក។',
        'ដើម្បីឱ្យអ្នកប្តូររង្វាន់ និងទទួលបានអត្ថប្រយោជន៍សមាជិក។',
        'ដើម្បីផ្ញើការជូនដំណឹងអំពីការបញ្ជាទិញ ប្រូម៉ូសិន និងទំនិញថ្មី ប្រសិនបើអ្នកអនុញ្ញាត។',
        'ដើម្បីផ្តល់សេវាគាំទ្រអតិថិជន និងកែលម្អសេវាកម្មរបស់យើង។',
      ],
    },
    {
      id: 'share',
      icon: 'people-outline',
      title: 'ការចែករំលែក',
      body: [
        'យើងមិនលក់ព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកទេ។ យើងចែករំលែកវាតែជាមួយអ្នកផ្តល់សេវាដែលជួយដំណើរការកម្មវិធី ដូចជាអ្នកផ្តល់សេវា Hosting អ្នកផ្តល់សេវា SMS ដែលផ្ញើលេខកូដចូល និង Google Firebase សម្រាប់ការជូនដំណឹង ឬនៅពេលច្បាប់តម្រូវ។',
      ],
    },
    {
      id: 'retention',
      icon: 'time-outline',
      title: 'ការរក្សាទុក',
      body: [
        'ព័ត៌មានរបស់អ្នកត្រូវបានរក្សាទុកនៅលើម៉ាស៊ីនមេដែលមានសុវត្ថិភាព និងបញ្ជូនតាមការតភ្ជាប់ដែលបានអ៊ិនគ្រីប។ យើងរក្សាទុកវាដរាបណាគណនីរបស់អ្នកនៅសកម្ម។ នៅពេលអ្នកលុបគណនី យើងលុបព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក លើកលែងតែកំណត់ត្រាដែលច្បាប់តម្រូវឱ្យរក្សាទុក ដូចជាវិក្កយបត្រលក់ ដែលនឹងរក្សាទុកដោយមិនបង្ហាញអត្តសញ្ញាណរបស់អ្នកតាមដែលអាចធ្វើបាន។',
      ],
    },
    {
      id: 'rights',
      icon: 'shield-checkmark-outline',
      title: 'ជម្រើស និងសិទ្ធិរបស់អ្នក',
      bullets: [
        'មើល និងកែប្រែព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកនៅក្នុងកម្មវិធី។',
        'បើក ឬបិទការជូនដំណឹង នៅក្នុងការកំណត់ឧបករណ៍ ឬការកំណត់ការជូនដំណឹង។',
        'ដកសិទ្ធិចូលប្រើកាមេរ៉ា ឬរូបភាពបានគ្រប់ពេល នៅក្នុងការកំណត់ឧបករណ៍។',
        'លុបគណនីរបស់អ្នកនៅ ប្រវត្តិរូប → ការកំណត់គណនី → លុបគណនី។ វានឹងលុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកជាអចិន្ត្រៃយ៍។',
      ],
    },
    {
      id: 'children',
      icon: 'happy-outline',
      title: 'កុមារ',
      body: [
        'កម្មវិធីនេះមិនមែនសម្រាប់កុមារអាយុក្រោម 13 ឆ្នាំទេ។ កំណត់ត្រាថែទាំភ្នែកសម្រាប់កុមារ ត្រូវបានបង្កើតនៅក្នុងហាង ដោយមានវត្តមានឪពុកម្តាយ ឬអាណាព្យាបាល។',
      ],
    },
    {
      id: 'changes',
      icon: 'refresh-outline',
      title: 'ការផ្លាស់ប្តូរគោលការណ៍នេះ',
      body: [
        'យើងអាចធ្វើបច្ចុប្បន្នភាពគោលការណ៍នេះម្តងម្កាល។ យើងនឹងបង្ហាញកាលបរិច្ឆេទថ្មីនៅខាងលើទំព័រនេះ ហើយសម្រាប់ការផ្លាស់ប្តូរសំខាន់ៗ យើងនឹងជូនដំណឹងអ្នកនៅក្នុងកម្មវិធី។',
      ],
    },
  ],
};

export function getPrivacyPolicy(language: AppLanguage): PrivacyPolicyContent {
  return language === 'km' ? km : en;
}
