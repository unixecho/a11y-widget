// Canonical description of what the WIDGET ITSELF actually does — meant to
// be rendered on each host's own accessibility statement page instead of
// each site hand-maintaining its own prose copy of this list (which is
// exactly how AyekaBar's and Sarcafe-Portal's statements drifted from their
// own widgets' real feature sets in the first place).
//
// SCOPE, deliberately narrow: this file describes the widget's real,
// verifiable behavior only — text size, contrast modes, the reading guide,
// etc. It says NOTHING about a host site's own code-level accessibility
// work (semantic structure, a real keyboard-only pass, screen-reader
// testing) — those are claims about THAT site's own code, not about this
// package, and only that site can honestly make them. Each statement page
// keeps its own hand-written, verified section for that; this file is
// spliced in alongside it, not instead of it.

import type { Lang } from './types'

export interface CoverageItem {
  id: string
  labels: Record<Lang, string>
}

export const WIDGET_COVERAGE: CoverageItem[] = [
  {
    id: 'quick-profiles',
    labels: {
      he: 'פרופילים מהירים (קשב וריכוז, לקויי ראייה, רגישות לתנועה, גיל הזהב, קשיי קריאה) שמפעילים בלחיצה אחת שילוב של ההתאמות שלהלן',
      en: 'One-tap quick profiles (attention/ADHD, low vision, seizure-safe, senior, reading difficulty) that combine the adaptations below',
      ar: 'ملفات تعريف سريعة بلمسة واحدة (الانتباه، ضعف البصر، الحماية من النوبات، كبار السن، صعوبات القراءة) تجمع التعديلات أدناه',
    },
  },
  {
    id: 'text-size',
    labels: {
      he: 'הגדלת טקסט עד 150% ללא שבירת פריסה',
      en: 'Text scaling up to 150% without breaking layout',
      ar: 'تكبير النص حتى 150% دون كسر التخطيط',
    },
  },
  {
    id: 'spacing',
    labels: {
      he: 'הגדלת ריווח אותיות, מילים ושורות',
      en: 'Increased letter, word and line spacing',
      ar: 'زيادة تباعد الأحرف والكلمات والأسطر',
    },
  },
  {
    id: 'readable-font',
    labels: {
      he: 'החלפה לגופן קריא במיוחד',
      en: 'Switch to an especially legible font',
      ar: 'التبديل إلى خط سهل القراءة بشكل خاص',
    },
  },
  {
    id: 'contrast',
    labels: {
      he: 'שלושה מצבי ניגודיות: גבוהה, שחור-לבן וצבעים הפוכים',
      en: 'Three contrast modes: high contrast, grayscale and inverted colors',
      ar: 'ثلاثة أوضاع تباين: تباين عالٍ، تدرج رمادي، وألوان معكوسة',
    },
  },
  {
    id: 'hide-images',
    labels: {
      he: 'הפחתת בליטת תמונות עבור מי שנעזר/ת בפחות גירויים חזותיים',
      en: 'Receding photographic images for a visitor who reads more calmly with fewer visual stimuli',
      ar: 'تقليل بروز الصور لمن يفضل عددًا أقل من المحفزات البصرية',
    },
  },
  {
    id: 'pause-animations',
    labels: {
      he: 'עצירת אנימציות ומעברים באתר בלחיצת כפתור, מעבר להגדרת המערכת',
      en: 'Stopping the site’s own animations and transitions with one button, beyond the OS-level setting',
      ar: 'إيقاف الرسوم المتحركة والانتقالات في الموقع بزر واحد، بالإضافة إلى إعداد النظام',
    },
  },
  {
    id: 'reading-guide',
    labels: {
      he: 'מדריך קריאה — פס תאורה שעוקב אחר המצביע ומעמעם את שאר העמוד',
      en: 'A reading guide — a lit band that follows the pointer and dims the rest of the page',
      ar: 'دليل قراءة — شريط إضاءة يتبع المؤشر ويعتم بقية الصفحة',
    },
  },
  {
    id: 'highlight-links-headings',
    labels: {
      he: 'הדגשת קישורים וכותרות',
      en: 'Highlighting links and headings',
      ar: 'إبراز الروابط والعناوين',
    },
  },
  {
    id: 'big-cursor',
    labels: {
      he: 'סמן עכבר מוגדל',
      en: 'An enlarged mouse cursor',
      ar: 'مؤشر فأرة مكبّر',
    },
  },
  {
    id: 'read-selection',
    labels: {
      he: 'הקראת טקסט מסומן בקול, באמצעות מנוע הדיבור המובנה בדפדפן',
      en: 'Reading selected text aloud, using the browser’s own built-in speech engine',
      ar: 'قراءة النص المحدد بصوت عالٍ باستخدام محرك الكلام المدمج في المتصفح',
    },
  },
  {
    id: 'trilingual',
    labels: {
      he: 'תפריט הנגישות עצמו זמין בעברית, אנגלית וערבית',
      en: 'The accessibility menu itself is available in Hebrew, English and Arabic',
      ar: 'قائمة إمكانية الوصول نفسها متاحة بالعبرية والإنجليزية والعربية',
    },
  },
  {
    id: 'keyboard-shortcut',
    labels: {
      he: 'קיצור מקלדת לפתיחה/סגירה מהירה של התפריט',
      en: 'A keyboard shortcut to quickly open/close the menu',
      ar: 'اختصار لوحة مفاتيح لفتح/إغلاق القائمة بسرعة',
    },
  },
  {
    id: 'persisted',
    labels: {
      he: 'ההעדפות נשמרות במכשיר ונשארות פעילות בביקורים הבאים, עד לאיפוס ידני',
      en: 'Preferences are saved on-device and stay active on future visits, until manually reset',
      ar: 'يتم حفظ التفضيلات على الجهاز وتبقى فعالة في الزيارات القادمة حتى إعادة الضبط يدويًا',
    },
  },
]
