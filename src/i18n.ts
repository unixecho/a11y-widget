// Trilingual strings for the widget's own panel. Flat `{ key: { he, en, ar } }`
// shape — one column-scan catches a missing language, and
// scripts/check-a11y.mjs fails the build if any key is missing one.

import type { Lang } from './types'

export const A11Y_UI: Record<string, Record<Lang, string>> = {
  title: { he: 'נגישות האתר', en: 'Accessibility', ar: 'إمكانية الوصول' },
  openLabel: { he: 'פתיחת אפשרויות נגישות', en: 'Open accessibility options', ar: 'فتح خيارات إمكانية الوصول' },
  intro: {
    he: 'הגדרות תצוגה אישיות לביקור הזה. אינן מחליפות את הנגישות של האתר עצמו.',
    en: 'Personal display settings for this visit. They do not replace the site’s own accessibility.',
    ar: 'إعدادات عرض شخصية لهذه الزيارة. لا تحل محل إمكانية وصول الموقع نفسه.',
  },
  close: { he: 'סגירה', en: 'Close', ar: 'إغلاق' },
  reset: { he: 'איפוס הגדרות', en: 'Reset settings', ar: 'إعادة ضبط الإعدادات' },
  statementLink: { he: 'הצהרת נגישות', en: 'Accessibility statement', ar: 'بيان إمكانية الوصول' },

  profilesSection: { he: 'פרופילים מהירים', en: 'Quick profiles', ar: 'ملفات تعريف سريعة' },
  profileApplied: { he: 'הפרופיל הופעל', en: 'Profile applied', ar: 'تم تطبيق الملف الشخصي' },

  textSection: { he: 'טקסט וקריאות', en: 'Text & readability', ar: 'النص وسهولة القراءة' },
  fontScale: { he: 'גודל טקסט', en: 'Text size', ar: 'حجم النص' },
  spacing: { he: 'ריווח טקסט', en: 'Text spacing', ar: 'تباعد النص' },
  readableFont: { he: 'גופן קריא', en: 'Readable font', ar: 'خط سهل القراءة' },
  decrease: { he: 'הקטנה', en: 'Decrease', ar: 'تصغير' },
  increase: { he: 'הגדלה', en: 'Increase', ar: 'تكبير' },

  appearanceSection: { he: 'ניגודיות וצבע', en: 'Contrast & color', ar: 'التباين واللون' },
  contrast: { he: 'מצב ניגודיות', en: 'Contrast mode', ar: 'وضع التباين' },
  contrastDefault: { he: 'רגיל', en: 'Default', ar: 'افتراضي' },
  contrastHigh: { he: 'ניגודיות גבוהה', en: 'High contrast', ar: 'تباين عالٍ' },
  contrastGrayscale: { he: 'שחור-לבן', en: 'Grayscale', ar: 'تدرج الرمادي' },
  contrastInvert: { he: 'צבעים הפוכים', en: 'Invert colors', ar: 'عكس الألوان' },
  hideImages: { he: 'הפחתת בליטת תמונות', en: 'Recede images', ar: 'تقليل بروز الصور' },

  motionSection: { he: 'תנועה, קריאה וניווט', en: 'Motion, reading & navigation', ar: 'الحركة والقراءة والتصفح' },
  pauseAnimations: { he: 'עצירת אנימציות', en: 'Pause animations', ar: 'إيقاف الرسوم المتحركة' },
  readingGuide: { he: 'מדריך קריאה', en: 'Reading guide', ar: 'دليل القراءة' },
  highlightLinks: { he: 'הדגשת קישורים', en: 'Highlight links', ar: 'تمييز الروابط' },
  highlightHeadings: { he: 'הדגשת כותרות', en: 'Highlight headings', ar: 'تمييز العناوين' },
  bigCursor: { he: 'סמן גדול', en: 'Big cursor', ar: 'مؤشر كبير' },

  toolsSection: { he: 'כלי עזר', en: 'Tools', ar: 'أدوات مساعدة' },
  readSelection: { he: 'הקראת טקסט מסומן', en: 'Read selected text aloud', ar: 'قراءة النص المحدد بصوت عالٍ' },
  stopReading: { he: 'עצירת ההקראה', en: 'Stop reading', ar: 'إيقاف القراءة' },
  readSelectionEmpty: { he: 'סמן/י טקסט בעמוד לפני ההקראה', en: 'Select some text on the page first', ar: 'حدد نصًا في الصفحة أولاً' },
  readSelectionUnsupported: {
    he: 'הקראה קולית אינה נתמכת בדפדפן זה',
    en: 'Read-aloud isn’t supported in this browser',
    ar: 'القراءة الصوتية غير مدعومة في هذا المتصفح',
  },

  on: { he: 'פעיל', en: 'On', ar: 'مفعّل' },
  off: { he: 'כבוי', en: 'Off', ar: 'معطّل' },
}

export type A11yUiKey = keyof typeof A11Y_UI

export function a11yT(key: A11yUiKey, lang: Lang): string {
  return A11Y_UI[key][lang]
}
