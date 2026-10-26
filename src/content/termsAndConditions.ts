/**
 * The in-app terms & conditions, rendered natively by TermsAndConditionsScreen.
 *
 * The business details come from the owner's tax registration certificate
 * (General Department of Taxation). They identify STM OPTIC as the legal
 * entity behind the MOptic app — keep them identical to the certificate.
 */
import type { AppLanguage } from '../localizations/i18n';
import type { PolicySection } from './privacyPolicy';

export const TERMS_WEBSITE_LABEL = 'mopticstore.com';
export const TERMS_WEBSITE_URL = 'https://mopticstore.com';
export const TERMS_LAST_UPDATED = '2026-10-13';

// TODO: the TIN is cut off on the certificate photo — verify the full number.
export const BUSINESS_TIN = 'E005-25000022';
export const BUSINESS_NAME = 'STM OPTIC';
export const BUSINESS_OWNER = 'SRONG CHHIVMEY';

export type BusinessInfoRow = {
  icon: string;
  label: string;
  value: string;
};

export type TermsContent = {
  intro: string;
  business: BusinessInfoRow[];
  sections: PolicySection[];
};

const en: TermsContent = {
  intro:
    'These terms govern your use of the MOptic mobile app. The MOptic app and its services are owned and operated by STM OPTIC, a business registered in the Kingdom of Cambodia. By creating an account or using the app, you agree to these terms.',
  business: [
    {
      icon: 'storefront-outline',
      label: "Enterprise's name",
      value: BUSINESS_NAME,
    },
    {
      icon: 'barcode-outline',
      label: 'Tax Identification Number (TIN)',
      value: BUSINESS_TIN,
    },
    {
      icon: 'business-outline',
      label: 'Registered at',
      value: 'General Department of Taxation',
    },
    { icon: 'location-outline', label: 'Under', value: 'Tuol Kouk Tax Branch' },
    {
      icon: 'glasses-outline',
      label: 'Main business activity',
      value: 'Buying and selling (glasses)',
    },
    {
      icon: 'briefcase-outline',
      label: 'Form of enterprise',
      value: 'Sole proprietorship',
    },
    {
      icon: 'person-outline',
      label: "Owner/Representative's name",
      value: BUSINESS_OWNER,
    },
    { icon: 'flag-outline', label: 'Nationality', value: 'Cambodian' },
  ],
  sections: [
    {
      id: 'about',
      icon: 'information-circle-outline',
      title: 'About MOptic',
      body: [
        'MOptic is the brand and mobile app of STM OPTIC. In these terms, "we", "us" and "our" mean STM OPTIC, and "you" means the person using the app.',
      ],
    },
    {
      id: 'account',
      icon: 'person-circle-outline',
      title: 'Your account',
      bullets: [
        'You sign in with your phone number and a PIN. Keep your PIN private — you are responsible for activity on your account.',
        'The information you give us must be accurate and kept up to date.',
        'You may delete your account at any time in Profile → Account Settings → Delete Account.',
        'We may suspend an account that is used fraudulently or in breach of these terms.',
      ],
    },
    {
      id: 'eyecare',
      icon: 'eye-outline',
      title: 'Eye care features',
      bullets: [
        'The mobile eye test and face-shape scan are for guidance only. They are not a medical diagnosis and do not replace an eye examination by a qualified optometrist.',
        'Prescriptions shown in the app are the ones recorded by our optometrists in store. Always use the prescription given to you in store when ordering lenses.',
        'Virtual try-on is a preview. The real frame may look slightly different in size and colour.',
      ],
    },
    {
      id: 'purchases',
      icon: 'bag-handle-outline',
      title: 'Products, prices and purchases',
      bullets: [
        'Products and prices shown in the app are for information and may change without notice. Availability depends on stock at each branch.',
        'Purchases are completed in store. The invoice issued in store is the official record of your purchase.',
        'Returns, exchanges and warranties follow the policy of the branch where you made the purchase.',
      ],
    },
    {
      id: 'loyalty',
      icon: 'star-outline',
      title: 'Loyalty points and rewards',
      bullets: [
        'Points are earned on eligible purchases and are added to your account after the purchase is recorded.',
        'Points and rewards have no cash value, cannot be transferred, and may expire.',
        'We may change the loyalty programme, tiers or rewards. Points earned before a change are kept.',
        'Points obtained by mistake or misuse may be removed.',
      ],
    },
    {
      id: 'use',
      icon: 'hand-left-outline',
      title: 'Acceptable use',
      bullets: [
        'Do not misuse the app, try to access other accounts, or interfere with how it works.',
        'Do not copy, resell or redistribute the app or its content.',
      ],
    },
    {
      id: 'ip',
      icon: 'ribbon-outline',
      title: 'Intellectual property',
      body: [
        'The MOptic name, logo, app design and content belong to STM OPTIC or its licensors. Product brands shown in the app belong to their respective owners.',
      ],
    },
    {
      id: 'privacy',
      icon: 'shield-checkmark-outline',
      title: 'Privacy',
      body: [
        'How we collect and use your information is explained in our Privacy Policy, available in Profile → Privacy Policy.',
      ],
    },
    {
      id: 'liability',
      icon: 'alert-circle-outline',
      title: 'Limitation of liability',
      body: [
        'The app is provided "as is". To the extent permitted by law, STM OPTIC is not liable for indirect losses arising from the use of, or inability to use, the app.',
      ],
    },
    {
      id: 'law',
      icon: 'library-outline',
      title: 'Governing law',
      body: [
        'These terms are governed by the laws of the Kingdom of Cambodia.',
      ],
    },
    {
      id: 'changes',
      icon: 'refresh-outline',
      title: 'Changes to these terms',
      body: [
        'We may update these terms from time to time. We will show the new date at the top of this page. Continuing to use the app after a change means you accept the updated terms.',
      ],
    },
  ],
};

const km: TermsContent = {
  intro:
    'លក្ខខណ្ឌទាំងនេះគ្រប់គ្រងការប្រើប្រាស់កម្មវិធីទូរស័ព្ទ MOptic។ កម្មវិធី MOptic និងសេវាកម្មរបស់វា ជាកម្មសិទ្ធិ និងគ្រប់គ្រងដោយ STM OPTIC ដែលជាអាជីវកម្មចុះបញ្ជីនៅក្នុងព្រះរាជាណាចក្រកម្ពុជា។ ដោយការបង្កើតគណនី ឬប្រើប្រាស់កម្មវិធី អ្នកយល់ព្រមតាមលក្ខខណ្ឌទាំងនេះ។',
  business: [
    { icon: 'storefront-outline', label: 'ឈ្មោះសហគ្រាស', value: BUSINESS_NAME },
    {
      icon: 'barcode-outline',
      label: 'លេខអត្តសញ្ញាណកម្មសារពើពន្ធ (TIN)',
      value: BUSINESS_TIN,
    },
    {
      icon: 'business-outline',
      label: 'ចុះបញ្ជីនៅ',
      value: 'អគ្គនាយកដ្ឋានពន្ធដារ',
    },
    {
      icon: 'location-outline',
      label: 'ក្រោមការគ្រប់គ្រង',
      value: 'សាខាពន្ធដារខណ្ឌទួលគោក',
    },
    {
      icon: 'glasses-outline',
      label: 'សកម្មភាពអាជីវកម្មចម្បង',
      value: 'ទិញ និងលក់ (វ៉ែនតា)',
    },
    {
      icon: 'briefcase-outline',
      label: 'ទម្រង់សហគ្រាស',
      value: 'សហគ្រាសឯកបុគ្គល',
    },
    {
      icon: 'person-outline',
      label: 'ឈ្មោះម្ចាស់/អ្នកតំណាង',
      value: BUSINESS_OWNER,
    },
    { icon: 'flag-outline', label: 'សញ្ជាតិ', value: 'ខ្មែរ' },
  ],
  sections: [
    {
      id: 'about',
      icon: 'information-circle-outline',
      title: 'អំពី MOptic',
      body: [
        'MOptic គឺជាម៉ាក និងកម្មវិធីទូរស័ព្ទរបស់ STM OPTIC។ នៅក្នុងលក្ខខណ្ឌទាំងនេះ "យើង" សំដៅលើ STM OPTIC ហើយ "អ្នក" សំដៅលើអ្នកប្រើប្រាស់កម្មវិធី។',
      ],
    },
    {
      id: 'account',
      icon: 'person-circle-outline',
      title: 'គណនីរបស់អ្នក',
      bullets: [
        'អ្នកចូលគណនីដោយប្រើលេខទូរសព្ទ និងលេខ PIN។ សូមរក្សាលេខ PIN ជាការសម្ងាត់ — អ្នកទទួលខុសត្រូវចំពោះសកម្មភាពនៅលើគណនីរបស់អ្នក។',
        'ព័ត៌មានដែលអ្នកផ្តល់ឱ្យយើងត្រូវតែត្រឹមត្រូវ និងធ្វើបច្ចុប្បន្នភាពជានិច្ច។',
        'អ្នកអាចលុបគណនីរបស់អ្នកបានគ្រប់ពេល នៅ ប្រវត្តិរូប → ការកំណត់គណនី → លុបគណនី។',
        'យើងអាចផ្អាកគណនីដែលត្រូវបានប្រើដោយក្លែងបន្លំ ឬបំពានលើលក្ខខណ្ឌទាំងនេះ។',
      ],
    },
    {
      id: 'eyecare',
      icon: 'eye-outline',
      title: 'មុខងារថែទាំភ្នែក',
      bullets: [
        'ការពិនិត្យភ្នែកតាមទូរសព្ទ និងការស្កេនរាងមុខ គឺសម្រាប់ជាការណែនាំប៉ុណ្ណោះ។ វាមិនមែនជាការធ្វើរោគវិនិច្ឆ័យវេជ្ជសាស្ត្រ ហើយមិនជំនួសការពិនិត្យភ្នែកដោយអ្នកជំនាញភ្នែកដែលមានលក្ខណៈសម្បត្តិគ្រប់គ្រាន់ឡើយ។',
        'វេជ្ជបញ្ជាដែលបង្ហាញក្នុងកម្មវិធី គឺជាវេជ្ជបញ្ជាដែលកត់ត្រាដោយអ្នកជំនាញភ្នែករបស់យើងនៅក្នុងហាង។ សូមប្រើវេជ្ជបញ្ជាដែលបានផ្តល់ឱ្យអ្នកនៅក្នុងហាងជានិច្ច នៅពេលកម្មង់កញ្ចក់។',
        'ការសាកវ៉ែនតានិម្មិតគឺជាការមើលជាមុនប៉ុណ្ណោះ។ ស៊ុមវ៉ែនតាពិតអាចមានទំហំ និងពណ៌ខុសគ្នាបន្តិច។',
      ],
    },
    {
      id: 'purchases',
      icon: 'bag-handle-outline',
      title: 'ផលិតផល តម្លៃ និងការទិញ',
      bullets: [
        'ផលិតផល និងតម្លៃដែលបង្ហាញក្នុងកម្មវិធី គឺសម្រាប់ជាព័ត៌មាន ហើយអាចផ្លាស់ប្តូរដោយមិនជូនដំណឹងជាមុន។ ការមានស្តុកអាស្រ័យលើសាខានីមួយៗ។',
        'ការទិញត្រូវបានបញ្ចប់នៅក្នុងហាង។ វិក្កយបត្រដែលចេញនៅក្នុងហាង គឺជាកំណត់ត្រាផ្លូវការនៃការទិញរបស់អ្នក។',
        'ការប្តូរ ការសងត្រឡប់ និងការធានា អនុវត្តតាមគោលការណ៍របស់សាខាដែលអ្នកបានទិញ។',
      ],
    },
    {
      id: 'loyalty',
      icon: 'star-outline',
      title: 'ពិន្ទុសមាជិក និងរង្វាន់',
      bullets: [
        'ពិន្ទុត្រូវបានទទួលពីការទិញដែលមានសិទ្ធិ ហើយបញ្ចូលក្នុងគណនីរបស់អ្នក បន្ទាប់ពីការទិញត្រូវបានកត់ត្រា។',
        'ពិន្ទុ និងរង្វាន់មិនមានតម្លៃជាសាច់ប្រាក់ មិនអាចផ្ទេរបាន ហើយអាចផុតកំណត់។',
        'យើងអាចផ្លាស់ប្តូរកម្មវិធីសមាជិក កម្រិត ឬរង្វាន់។ ពិន្ទុដែលទទួលបានមុនការផ្លាស់ប្តូរ នឹងត្រូវរក្សាទុក។',
        'ពិន្ទុដែលទទួលបានដោយកំហុស ឬការប្រើប្រាស់ខុស អាចត្រូវបានដកចេញ។',
      ],
    },
    {
      id: 'use',
      icon: 'hand-left-outline',
      title: 'ការប្រើប្រាស់ដែលអាចទទួលយកបាន',
      bullets: [
        'កុំប្រើប្រាស់កម្មវិធីខុសគោលបំណង ព្យាយាមចូលគណនីអ្នកដទៃ ឬរំខានដល់ដំណើរការរបស់វា។',
        'កុំចម្លង លក់បន្ត ឬចែកចាយកម្មវិធី ឬមាតិការបស់វា។',
      ],
    },
    {
      id: 'ip',
      icon: 'ribbon-outline',
      title: 'កម្មសិទ្ធិបញ្ញា',
      body: [
        'ឈ្មោះ MOptic ស្លាកសញ្ញា ការរចនាកម្មវិធី និងមាតិកា ជាកម្មសិទ្ធិរបស់ STM OPTIC ឬម្ចាស់អាជ្ញាប័ណ្ណរបស់ខ្លួន។ ម៉ាកផលិតផលដែលបង្ហាញក្នុងកម្មវិធី ជាកម្មសិទ្ធិរបស់ម្ចាស់រៀងៗខ្លួន។',
      ],
    },
    {
      id: 'privacy',
      icon: 'shield-checkmark-outline',
      title: 'ឯកជនភាព',
      body: [
        'របៀបដែលយើងប្រមូល និងប្រើប្រាស់ព័ត៌មានរបស់អ្នក ត្រូវបានពន្យល់នៅក្នុងគោលការណ៍ឯកជនភាពរបស់យើង នៅ ប្រវត្តិរូប → គោលការណ៍ឯកជនភាព។',
      ],
    },
    {
      id: 'liability',
      icon: 'alert-circle-outline',
      title: 'ការកំណត់ការទទួលខុសត្រូវ',
      body: [
        'កម្មវិធីនេះត្រូវបានផ្តល់ "ដូចដែលវាមាន"។ ក្នុងវិសាលភាពដែលច្បាប់អនុញ្ញាត STM OPTIC មិនទទួលខុសត្រូវចំពោះការខាតបង់ដោយប្រយោល ដែលកើតចេញពីការប្រើប្រាស់ ឬការមិនអាចប្រើប្រាស់កម្មវិធីបានឡើយ។',
      ],
    },
    {
      id: 'law',
      icon: 'library-outline',
      title: 'ច្បាប់គ្រប់គ្រង',
      body: ['លក្ខខណ្ឌទាំងនេះស្ថិតក្រោមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។'],
    },
    {
      id: 'changes',
      icon: 'refresh-outline',
      title: 'ការផ្លាស់ប្តូរលក្ខខណ្ឌទាំងនេះ',
      body: [
        'យើងអាចធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌទាំងនេះម្តងម្កាល។ យើងនឹងបង្ហាញកាលបរិច្ឆេទថ្មីនៅខាងលើទំព័រនេះ។ ការបន្តប្រើប្រាស់កម្មវិធីបន្ទាប់ពីការផ្លាស់ប្តូរ មានន័យថាអ្នកទទួលយកលក្ខខណ្ឌដែលបានធ្វើបច្ចុប្បន្នភាព។',
      ],
    },
  ],
};

export function getTermsAndConditions(language: AppLanguage): TermsContent {
  return language === 'km' ? km : en;
}
