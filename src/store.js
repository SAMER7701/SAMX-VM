/**
 * SAMX-VM Core Data & State Store
 * Version: 1.7.5
 * Architecture: IndexedDB-First + Memory Cache + R2 Cloud Sync
 */

export const APP_VERSION = '1.7.5';

import { ALSHIAK_LOGO_BASE64 } from './logo.js';
import {
  openDatabase,
  saveActiveTourIDB,
  loadActiveTourIDB,
  clearActiveTourIDB,
  saveArchivedTourIDB,
  saveAllArchivedToursIDB,
  getAllArchivedToursIDB,
  getArchivedTourByIdIDB,
  deleteArchivedTourIDB,
  clearArchivedToursIDB,
  migrateLocalStorageToIndexedDB,
  getStorageQuotaInfo
} from './idb.js';

// مفاتيح التخزين المحلي الصريحة (LocalStorage Keys)
export const APP_STORAGE_KEY = 'samx_vm_active_audit';
export const STORAGE_KEY_AUTH_SESSION = 'samx_auth_session';
export const STORAGE_KEY_USERS_REGISTRY = 'samx_users_registry';
export const STORAGE_KEY_BIOMETRIC_CRED = 'samx_biometric_cred';
export const STORAGE_KEY_LAST_USER = 'samx_last_user';
export const STORAGE_KEY_BRANCHES = 'samx_branches_clean_v1';
export const STORAGE_KEY_SPECIALISTS = 'samx_specialists_clean_v1';
export const STORAGE_KEY_SECTIONS = 'samx_store_sections_v2';
export const STORAGE_KEY_CHECKLISTS = 'samx_vm_checklists_v2';
export const STORAGE_KEY_TAGS = 'samx_quick_tags_v1';
export const STORAGE_KEY_ASSIGNEES = 'samx_quick_assignees_v1';
export const STORAGE_KEY_BRANDING = 'samx_branding_v1';
export const STORAGE_KEY_AUDIT_ARCHIVE = 'samx_audit_history_v1';
export const STORAGE_KEY_SAVED_TOURS = 'savedTours';
export const STORAGE_KEY_CURRENT_TOUR = 'currentTour';
export const STORAGE_KEY_STATUS_SUB_OPTIONS = 'samx_status_sub_options_v1';
export const LEGACY_BRANCHES_KEY = 'samx_branches';
export const LEGACY_SPECIALISTS_KEY = 'samx_specialists';

// خيارات الحالات الفرعية الذكية الافتراضية لكل حالة رئيسية
export const DEFAULT_STATUS_SUB_OPTIONS = {
  resolved: [
    'معالجة كاملة 100%',
    'معالجة جزئية - جاري الاستكمال'
  ],
  store_followup: [
    'استكمال النواقص والمقاسات',
    'الالتزام بالمعايير اليومية',
    'كي وتجهيز القطع',
    'تعديل التسعير/POSM'
  ],
  management_action: [
    'صيانة الإضاءة والكهرباء',
    'صيانة الديكور والأرفف',
    'توريد مستلزمات عرض/مانيكان',
    'توجيه إدارة المشتريات/التوزيع'
  ]
};

// الهوية البصرية وشعار الشركة الافتراضي
export const DEFAULT_BRANDING = {
  companyName: 'الشياكة',
  companySubtitle: 'العرض المرئي والتنسيق التجاري',
  logoData: ALSHIAK_LOGO_BASE64, // الشعار الرسمي لشركة الشياكة (الشياكة alshiak)
  footerDisclaimer: 'تقرير تدقيق معتمد صادر من منصة العرض المرئي الميداني SAMX-VM • سري وخاص بإدارة المعارض',
  showFooterCompliance: true // التحكم في ظهور عبارة الاعتماد السفلية
};

// وسوم المعالجة السريعة الافتراضية
export const DEFAULT_QUICK_TAGS = [
  'تناسق الألوان (Color Story)',
  'تبديل طقم المانيكان',
  'توجيه وزوايا الإضاءة',
  'ترتيب تسلسل المقاسات',
  'إعادة طي وترتيب الطاولات',
  'تعبئة النواقص والرفوف',
  'لوحات الأسعار والعروض (POSM)',
  'تنظيم غرف القياس والكاشير',
  'ضبط مسافات المعاليق (Hanger Spacing)'
];

// جهات التكليف السريعة الافتراضية
export const DEFAULT_QUICK_ASSIGNEES = [
  'مدير المعرض',
  'مشرف القسم',
  'فريق الصيانة',
  'إدارة التشغيل'
];

// الأقسام الافتراضية المعتمدة لمعارض التجزئة
export const DEFAULT_STORE_SECTIONS = [
  'الواجهة الرئيسية والمانيكانات (Window Display)',
  'قسم الثياب البيضاء (White Thobes)',
  'قسم الثياب الملونة والشبابية (Colored & Youth Thobes)',
  'قسم الأشمغة والغتر والمستلزمات (Headgear)',
  'قسم العطور والنظارات (Perfumes & Sunglasses)',
  'قسم الأحذية (Footwear)',
  'قسم الملابس الداخلية والولادي (Underwear & Kids)',
  'طاولات العرض المركزية والجدوال (Folded Tables / Gondolas)',
  'المستودع وتنظيم المخزون الخلفي (Stock Room)'
];

// مصفوفات أولية فارغة تماماً (يتم إدارتها كلياً عبر واجهة المستخدم)
export const SEED_BRANCHES = [];
export const SEED_SPECIALISTS = [];

// تعريف حالات الإجراء والمتابعة
export const STATUS_MAP = {
  resolved: {
    id: 'resolved',
    label: 'تم المعالجة ميدانياً ✅',
    shortLabel: 'تم المعالجة ميدانياً ✅',
    badgeClass: 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50',
    printBadgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold',
    icon: 'check-circle-2'
  },
  store_followup: {
    id: 'store_followup',
    label: 'متابعة المعرض ⏳',
    shortLabel: 'متابعة المعرض ⏳',
    badgeClass: 'bg-amber-950/80 text-amber-400 border border-amber-500/50',
    printBadgeClass: 'bg-amber-50 text-amber-900 border border-amber-400 font-bold',
    icon: 'clock'
  },
  management_action: {
    id: 'management_action',
    label: 'طلب صيانة / إدارة ⚠️',
    shortLabel: 'طلب صيانة / إدارة ⚠️',
    badgeClass: 'bg-rose-950/80 text-rose-400 border border-rose-500/50',
    printBadgeClass: 'bg-rose-50 text-rose-900 border border-rose-400 font-bold',
    icon: 'alert-triangle'
  }
};

// معايير التدقيق الميداني المعتمدة الافتراضية (Default VM Category Checklists)
export const DEFAULT_VM_CATEGORY_CHECKLISTS = {
  'الواجهة الرئيسية والمانيكانات (Window Display)': [
    'سلامة ونظافة المانيكان وضبط التثبيت والوقفة',
    'تطبيق قصة الألوان المعتمدة للواجهة (Color Story)',
    'توجيه زوايا الإضاءة والسبوت لايت (45 درجة)',
    'وضوح لافتات الأسعار والحملة الترويجية (POSM)',
    'تناسق الإكسسوارات مع الأطقم المعروضة'
  ],
  'قسم الثياب البيضاء (White Thobes)': [
    'تسلسل وترتيب المقاسات تصاعدياً (Size Sequence)',
    'توحيد اتجاه ونوعية المعاليق (Hanger Consistency)',
    'كوي وتجهيز الثياب وخلوها من التجاعيد والغبار',
    'تناسق درجات البياض وخامات الأقمشة (سلك / قطن)',
    'دقة بطاقات الأسعار والأكواد التعريفية على الياقة'
  ],
  'قسم الثياب الملونة والشبابية (Colored & Youth Thobes)': [
    'تناسق تدفق الألوان والتدرج البصري (Color Flow)',
    'ضبط مسافات المعاليق (قاعدة مسافة الإصبع)',
    'توافر وتوزيع كامل مقاسات التشكيلة والقصات الشبابية',
    'إبراز القطع الحديثة والألوان الموسمية في الصدارة',
    'وضوح بطاقات الأسعار والعروض الترويجية'
  ],
  'قسم الأشمغة والغتر والمستلزمات (Headgear)': [
    'نظافة وتلميع الفترينات وواجهات العرض الزجاجية',
    'ترتيب الأشمغة والغتر بدقة حسب المقاس والماركة',
    'تثبيت لواصق الأسعار والباركود في مواضعها المعتمدة',
    'تنظيم ملحقات العرض (العقال، الطواقي، المحافظ)',
    'اكتمال الإضاءة الداخلية للفترينات الجدارية'
  ],
  'قسم العطور والنظارات (Perfumes & Sunglasses)': [
    'نظافة وتلميع ستاندات العرض ومرايا التجربة',
    'توفير وتجديد عبوات التجربة (Testers) وأشرطة الشم',
    'تناسق الإضاءة المركزة وإبراز عبوات العطور الفاخرة',
    'وضوح أسعار المنتجات ووسائل الحماية من السرقة',
    'ترتيب المجموعات العطرية حسب النوتة والموسم'
  ],
  'قسم الأحذية (Footwear)': [
    'توجيه الحذاء الأيمن للخارج وبزاوية العرض المعتمدة',
    'نظافة أرفف العرض والوسائد وقواعد الأحذية الجلدية',
    'اكتمال بطاقات المقاسات والأسعار ورموز الموديلات',
    'ترتيب تسلسل الموديلات والألوان الرسمية والكاجوال',
    'توفر وتجهيز مقاسات التجربة الأساسية'
  ],
  'قسم الملابس الداخلية والولادي (Underwear & Kids)': [
    'ترتيب مقاسات العلب المغلفة وتوحيد واجهة العرض',
    'تناسق وتعبئة ستاندات الملابس الداخلية والقطنيات',
    'إبراز تشكيلة الأطفال وترتيب المقاسات حسب الأعمار',
    'وضوح جدول المقاسات ولوحات الأسعار والعروض',
    'نظافة الأرفف وخلوها من العلب المفتوحة أو التالفة'
  ],
  'المستودع وتنظيم المخزون الخلفي (Stock Room)': [
    'تصنيف وترتيب المخزون حسب الكود واللون والمقاس',
    'خلو الممرات ومخارج الطوارئ من الكراتين والعوائق',
    'مطابقة ملصقات الصناديق مع محتواها الفعلي',
    'سلامة التخزين والرفوف واستخدام السلالم المعتمدة',
    'سهولة وسرعة الوصول لإعادة تعبئة صالة العرض'
  ],
  'طاولات العرض المركزية والجدوال (Folded Tables / Gondolas)': [
    'تطبيق معيار مقاس الطي المعتمد (Folding Board)',
    'تدرج الألوان الأفقي والعمودي على الطاولة (Color Balance)',
    'ترتيب مقاسات الأكوام تصاعدياً من الأعلى للأسفل',
    'تماثل ارتفاعات أكوام الملابس وتناسقها البصري',
    'تثبيت بطاقة السعر وحامل الأكريليك بوضوح أمام كل كومة'
  ],
  'default': [
    'تناسق الألوان وتدرجها البصري (Color Story)',
    'تسلسل المقاسات والترتيب المعياري للقطع',
    'توجيه وضبط زوايا الإضاءة نحو المنتجات',
    'وضوح بطاقات الأسعار والحملة الترويجية (POSM)',
    'نظافة الموقع وتوحيد اتجاه المعاليق'
  ]
};

// كائن المعايير الحي القابل للتخصيص والحفظ في التخزين المحلي (Dynamic VM Standards)
export const VM_CATEGORY_CHECKLISTS = JSON.parse(JSON.stringify(DEFAULT_VM_CATEGORY_CHECKLISTS));

// الحالة المركزية لتقرير المعرض (SAMX-VM State)
export const currentAudit = {
  id: 'samx_' + Date.now(),
  branchName: '',
  auditorName: '',
  weekNumber: 43,
  auditDate: new Date().toISOString().split('T')[0],
  sections: [],
  visitSummary: '' // ملخص إنجازات وتعديلات الزيارة الميدانية (تجميع ذكي وتعديل يدوي)
};

// مخزن الذاكرة المؤقتة (Local-First Cache)
export const metadataCache = {
  branches: [],
  specialists: [],
  sections: [],
  checklists: {},
  quickTags: [],
  quickAssignees: [],
  lastSyncedAt: null,
  syncStatus: 'idle'
};

// متغيرات العمل المؤقتة للمودال والتعديل
export const modalState = {
  editingSectionId: null,
  tempImgBefore: null,
  tempImgAfter: null,
  imgConfigBefore: { aspectRatio: 'standard', scale: 100, align: 'center' },
  imgConfigAfter: { aspectRatio: 'standard', scale: 100, align: 'center' },
  activeModalTags: [],
  activeModalChecklist: [],
  selectedModalStatus: 'resolved',
  selectedModalStatuses: ['resolved'], // نظام التحديد المتعدد للحالات الرئيسية
  selectedModalSubOptions: {
    resolved: ['معالجة كاملة 100%'],
    store_followup: [],
    management_action: []
  },
  inlineAddSubOptionOpen: {
    resolved: false,
    store_followup: false,
    management_action: false
  },
  isSpeechRecording: false,
  pendingValidationProceedCallback: null,
  isBypassingValidation: false,
  currentModalTab: 'branches',
  currentDrawerTab: 'branches',
  isInlineDrawerOpen: false,
  cardViewModes: {}, // secId -> 'sideBySide' | 'slider'
  selectedManagerSection: 'الواجهة الرئيسية والمانيكانات (Window Display)',
  isManagingStandards: false
};

// مولد معرفات فريدة مقاومة للتعارض (Conflict-Free Entity ID)
export function generateEntityId(prefix = 'ent') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

// احتساب رقم الأسبوع الحالي تلقائياً
export function calculateCurrentWeek() {
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  if (!currentAudit.weekNumber) {
    currentAudit.weekNumber = weekNum;
  }
  return weekNum;
}

// احتساب مؤشر الجاهزية البصرية للمعرض (Store Readiness Score) مع دعم التعديل والاعتماد الذكي
export function calculateReadinessScore(audit) {
  const sections = (audit && Array.isArray(audit.sections)) ? audit.sections : [];
  if (sections.length === 0) {
    return { percent: 0, label: '—', text: '—', badgeClass: 'bg-slate-100 text-slate-600 border-slate-300' };
  }

  // إذا تم اعتماد مؤشر مدقق مخصص ومحفوظ داخل الجولة
  if (audit && typeof audit.readinessScore === 'number' && !isNaN(audit.readinessScore)) {
    const customPercent = Math.max(0, Math.min(100, Math.round(audit.readinessScore)));
    let label = 'ممتاز ومطابق للمعايير';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (customPercent >= 88) {
      label = 'ممتاز ومطابق للمعايير';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (customPercent >= 75) {
      label = 'جيد مع بنود متابعة';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    } else {
      label = 'يحتاج إجراءات تصحيحية';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    }
    return { percent: customPercent, label, text: `${customPercent}% • ${label}`, badgeClass, isAudited: true };
  }

  let totalScore = 0;
  sections.forEach(sec => {
    const statuses = Array.isArray(sec.statuses) && sec.statuses.length > 0 
      ? sec.statuses 
      : (sec.status ? [sec.status] : ['resolved']);

    if (statuses.includes('resolved') && statuses.length === 1) {
      totalScore += 100;
    } else if (statuses.includes('store_followup')) {
      totalScore += 85;
    } else if (statuses.includes('management_action')) {
      totalScore += 65;
    } else {
      totalScore += 90;
    }
  });

  const percent = Math.round(totalScore / sections.length);
  let label = 'ممتاز';
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';

  if (percent >= 85) {
    label = 'ممتاز';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (percent >= 70) {
    label = 'جيد';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
  } else {
    label = 'يحتاج تحسين';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return { percent, label, text: `${percent}% • ${label}`, badgeClass };
}

// قراءة البيانات من الذاكرة والتخزين للأقسام والمعايير (الفروع والأخصائيين مصدرهم حصراً سحابة D1)
export async function loadMetadata() {
  try {
    let branches = metadataCache.branches || [];
    let specialists = metadataCache.specialists || [];
    let sections = [];

    // تحميل وتحديث الأقسام المعتمدة
    const storedSections = localStorage.getItem(STORAGE_KEY_SECTIONS);
    if (storedSections) {
      try {
        const parsed = JSON.parse(storedSections);
        if (Array.isArray(parsed) && parsed.length > 0) sections = parsed;
      } catch (e) {
        console.warn('Failed parsing storedSections', e);
      }
    }
    if (sections.length === 0) {
      sections = [...DEFAULT_STORE_SECTIONS];
    }

    // تحميل وتحديث معايير الـ VM
    const storedChecklists = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
    if (storedChecklists) {
      try {
        const parsed = JSON.parse(storedChecklists);
        if (parsed && typeof parsed === 'object') {
          Object.assign(VM_CATEGORY_CHECKLISTS, parsed);
        }
      } catch (e) {
        console.warn('Failed parsing storedChecklists', e);
      }
    }

    // التأكد من وجود معايير لكل قسم
    sections.forEach(secName => {
      if (!VM_CATEGORY_CHECKLISTS[secName] || !Array.isArray(VM_CATEGORY_CHECKLISTS[secName])) {
        VM_CATEGORY_CHECKLISTS[secName] = DEFAULT_VM_CATEGORY_CHECKLISTS[secName] 
          ? [...DEFAULT_VM_CATEGORY_CHECKLISTS[secName]] 
          : [...(DEFAULT_VM_CATEGORY_CHECKLISTS['default'] || [])];
      }
    });

    // تحميل وسوم المعالجة السريعة
    let quickTags = [];
    const storedTags = localStorage.getItem(STORAGE_KEY_TAGS);
    if (storedTags) {
      try {
        const parsed = JSON.parse(storedTags);
        if (Array.isArray(parsed) && parsed.length > 0) quickTags = parsed;
      } catch (e) {
        console.warn('Failed parsing storedTags', e);
      }
    }
    if (quickTags.length === 0) {
      quickTags = [...DEFAULT_QUICK_TAGS];
    }

    // تحميل جهات التكليف السريعة
    let quickAssignees = [];
    const storedAssignees = localStorage.getItem(STORAGE_KEY_ASSIGNEES);
    if (storedAssignees) {
      try {
        const parsed = JSON.parse(storedAssignees);
        if (Array.isArray(parsed) && parsed.length > 0) quickAssignees = parsed;
      } catch (e) {
        console.warn('Failed parsing storedAssignees', e);
      }
    }
    if (quickAssignees.length === 0) {
      quickAssignees = [...DEFAULT_QUICK_ASSIGNEES];
    }

    metadataCache.branches = branches;
    metadataCache.specialists = specialists;
    metadataCache.sections = sections;
    metadataCache.checklists = VM_CATEGORY_CHECKLISTS;
    metadataCache.quickTags = quickTags;
    metadataCache.quickAssignees = quickAssignees;

    localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(sections));
    localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(VM_CATEGORY_CHECKLISTS));
    localStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify(quickTags));
    localStorage.setItem(STORAGE_KEY_ASSIGNEES, JSON.stringify(quickAssignees));

    metadataCache.lastSyncedAt = new Date().toISOString();
    return { branches, specialists, sections, checklists: VM_CATEGORY_CHECKLISTS, quickTags, quickAssignees };
  } catch (err) {
    console.error('loadMetadata error:', err);
    metadataCache.branches = [];
    metadataCache.specialists = [];
    metadataCache.sections = [...DEFAULT_STORE_SECTIONS];
    metadataCache.quickTags = [...DEFAULT_QUICK_TAGS];
    metadataCache.quickAssignees = [...DEFAULT_QUICK_ASSIGNEES];
    return { branches: [], specialists: [], sections: [...DEFAULT_STORE_SECTIONS], checklists: VM_CATEGORY_CHECKLISTS, quickTags: [...DEFAULT_QUICK_TAGS], quickAssignees: [...DEFAULT_QUICK_ASSIGNEES] };
  }
}

// حفظ المعايير في التخزين المحلي
export function saveChecklistsToStorage() {
  try {
    metadataCache.checklists = VM_CATEGORY_CHECKLISTS;
    localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(VM_CATEGORY_CHECKLISTS));
    return true;
  } catch (e) {
    console.error('saveChecklistsToStorage error:', e);
    return false;
  }
}

// حفظ الأقسام في التخزين المحلي
export function saveSectionsToStorage(sections) {
  if (!Array.isArray(sections)) return;
  metadataCache.sections = sections;
  localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(sections));
}

// جلب قائمة أقسام المعرض المستهدفة
export function getStoreSections() {
  if (!Array.isArray(metadataCache.sections) || metadataCache.sections.length === 0) {
    const stored = localStorage.getItem(STORAGE_KEY_SECTIONS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          metadataCache.sections = parsed;
        }
      } catch (e) {}
    }
    if (!Array.isArray(metadataCache.sections) || metadataCache.sections.length === 0) {
      metadataCache.sections = [...DEFAULT_STORE_SECTIONS];
      saveSectionsToStorage(metadataCache.sections);
    }
  }
  return metadataCache.sections;
}

// إضافة قسم معرض جديد
export function addStoreSection(name, initialStandards = null) {
  const clean = (name || '').trim();
  if (!clean) return { success: false, reason: 'يرجى كتابة اسم القسم الجديد' };

  const sections = getStoreSections();
  if (sections.some(s => s.trim().toLowerCase() === clean.toLowerCase())) {
    return { success: false, reason: 'هذا القسم مسجل مسبقاً في القائمة' };
  }

  sections.push(clean);
  saveSectionsToStorage(sections);

  // تهيئة معايير القسم الجديد
  if (!VM_CATEGORY_CHECKLISTS[clean]) {
    VM_CATEGORY_CHECKLISTS[clean] = Array.isArray(initialStandards) && initialStandards.length > 0
      ? [...initialStandards]
      : [...(DEFAULT_VM_CATEGORY_CHECKLISTS['default'] || [])];
    saveChecklistsToStorage();
  }

  return { success: true, name: clean, list: sections };
}

// تعديل اسم قسم موجود ونقل معاييره تلقائياً
export function updateStoreSection(oldName, newName) {
  const cleanOld = (oldName || '').trim();
  const cleanNew = (newName || '').trim();
  if (!cleanOld || !cleanNew) return { success: false, reason: 'اسم القسم القديم والجديد مطلوبان' };
  if (cleanOld === cleanNew) return { success: true, name: cleanNew };

  const sections = getStoreSections();
  const index = sections.findIndex(s => s.trim().toLowerCase() === cleanOld.toLowerCase());
  if (index === -1) {
    return { success: false, reason: 'القسم المراد تعديله غير موجود' };
  }

  if (sections.some((s, idx) => idx !== index && s.trim().toLowerCase() === cleanNew.toLowerCase())) {
    return { success: false, reason: 'الاسم الجديد مستخدم مسبقاً لقسم آخر' };
  }

  sections[index] = cleanNew;
  saveSectionsToStorage(sections);

  // ترحيل المعايير الخاصة بالقسم إلى الاسم الجديد
  if (VM_CATEGORY_CHECKLISTS[cleanOld]) {
    VM_CATEGORY_CHECKLISTS[cleanNew] = VM_CATEGORY_CHECKLISTS[cleanOld];
    delete VM_CATEGORY_CHECKLISTS[cleanOld];
    saveChecklistsToStorage();
  }

  // تحديث الأقسام في مسودة التقرير النشطة إن وجدت
  if (currentAudit && Array.isArray(currentAudit.sections)) {
    let auditUpdated = false;
    currentAudit.sections.forEach(sec => {
      if (sec.title === cleanOld) {
        sec.title = cleanNew;
        auditUpdated = true;
      }
    });
    if (auditUpdated) saveAuditToStorage();
  }

  return { success: true, oldName: cleanOld, newName: cleanNew, list: sections };
}

// حذف قسم من القائمة ومعاييره
export function deleteStoreSection(name) {
  const clean = (name || '').trim();
  const sections = getStoreSections();
  if (sections.length <= 1) {
    return { success: false, reason: 'يجب الإبقاء على قسم واحد على الأقل في النظام' };
  }

  metadataCache.sections = sections.filter(s => s.trim().toLowerCase() !== clean.toLowerCase());
  saveSectionsToStorage(metadataCache.sections);

  if (VM_CATEGORY_CHECKLISTS[clean]) {
    delete VM_CATEGORY_CHECKLISTS[clean];
    saveChecklistsToStorage();
  }

  return { success: true, name: clean, list: metadataCache.sections };
}

// جلب معايير الـ VM لقسم محدد
export function getSectionStandards(sectionName) {
  const clean = (sectionName || '').trim();
  if (VM_CATEGORY_CHECKLISTS[clean] && Array.isArray(VM_CATEGORY_CHECKLISTS[clean])) {
    return VM_CATEGORY_CHECKLISTS[clean];
  }
  return DEFAULT_VM_CATEGORY_CHECKLISTS[clean] 
    || DEFAULT_VM_CATEGORY_CHECKLISTS['default'] 
    || [];
}

// إضافة معيار VM جديد لقسم
export function addSectionStandard(sectionName, standardText) {
  const cleanSec = (sectionName || '').trim();
  const cleanStd = (standardText || '').trim();
  if (!cleanSec || !cleanStd) return { success: false, reason: 'يرجى كتابة نص المعيار بدقة' };

  if (!VM_CATEGORY_CHECKLISTS[cleanSec] || !Array.isArray(VM_CATEGORY_CHECKLISTS[cleanSec])) {
    VM_CATEGORY_CHECKLISTS[cleanSec] = [...getSectionStandards(cleanSec)];
  }

  if (VM_CATEGORY_CHECKLISTS[cleanSec].some(s => s.trim().toLowerCase() === cleanStd.toLowerCase())) {
    return { success: false, reason: 'هذا المعيار مضاف مسبقاً لهذا القسم' };
  }

  VM_CATEGORY_CHECKLISTS[cleanSec].push(cleanStd);
  saveChecklistsToStorage();

  return { success: true, sectionName: cleanSec, standard: cleanStd, list: VM_CATEGORY_CHECKLISTS[cleanSec] };
}

// تعديل نص معيار موجود
export function updateSectionStandard(sectionName, oldStandard, newStandard) {
  const cleanSec = (sectionName || '').trim();
  const cleanOld = (oldStandard || '').trim();
  const cleanNew = (newStandard || '').trim();
  if (!cleanSec || !cleanOld || !cleanNew) return { success: false, reason: 'بيانات المعيار غير مكتملة' };
  if (cleanOld === cleanNew) return { success: true, standard: cleanNew };

  if (!VM_CATEGORY_CHECKLISTS[cleanSec] || !Array.isArray(VM_CATEGORY_CHECKLISTS[cleanSec])) {
    VM_CATEGORY_CHECKLISTS[cleanSec] = [...getSectionStandards(cleanSec)];
  }

  const idx = VM_CATEGORY_CHECKLISTS[cleanSec].findIndex(s => s.trim() === cleanOld);
  if (idx === -1) {
    return { success: false, reason: 'المعيار المراد تعديله غير موجود' };
  }

  VM_CATEGORY_CHECKLISTS[cleanSec][idx] = cleanNew;
  saveChecklistsToStorage();

  // تحديث المعيار في القائمة المحددة حالياً في المودال إن كان مفعلاً
  if (modalState.activeModalChecklist) {
    const activeIdx = modalState.activeModalChecklist.indexOf(cleanOld);
    if (activeIdx !== -1) {
      modalState.activeModalChecklist[activeIdx] = cleanNew;
    }
  }

  // تحديث المسودة النشطة
  if (currentAudit && Array.isArray(currentAudit.sections)) {
    let auditUpdated = false;
    currentAudit.sections.forEach(sec => {
      if (sec.checklist && Array.isArray(sec.checklist)) {
        const cIdx = sec.checklist.indexOf(cleanOld);
        if (cIdx !== -1) {
          sec.checklist[cIdx] = cleanNew;
          auditUpdated = true;
        }
      }
    });
    if (auditUpdated) saveAuditToStorage();
  }

  return { success: true, sectionName: cleanSec, oldStandard: cleanOld, newStandard: cleanNew, list: VM_CATEGORY_CHECKLISTS[cleanSec] };
}

// حذف معيار من قسم
export function deleteSectionStandard(sectionName, standardText) {
  const cleanSec = (sectionName || '').trim();
  const cleanStd = (standardText || '').trim();
  if (!cleanSec || !cleanStd) return { success: false, reason: 'بيانات المعيار غير مكتملة' };

  if (!VM_CATEGORY_CHECKLISTS[cleanSec] || !Array.isArray(VM_CATEGORY_CHECKLISTS[cleanSec])) {
    VM_CATEGORY_CHECKLISTS[cleanSec] = [...getSectionStandards(cleanSec)];
  }

  VM_CATEGORY_CHECKLISTS[cleanSec] = VM_CATEGORY_CHECKLISTS[cleanSec].filter(s => s.trim() !== cleanStd);
  saveChecklistsToStorage();

  if (modalState.activeModalChecklist) {
    modalState.activeModalChecklist = modalState.activeModalChecklist.filter(s => s.trim() !== cleanStd);
  }

  return { success: true, sectionName: cleanSec, standard: cleanStd, list: VM_CATEGORY_CHECKLISTS[cleanSec] };
}

// استعادة المعايير الافتراضية لقسم محدد
export function resetSectionStandards(sectionName) {
  const cleanSec = (sectionName || '').trim();
  const defaults = DEFAULT_VM_CATEGORY_CHECKLISTS[cleanSec] || DEFAULT_VM_CATEGORY_CHECKLISTS['default'] || [];
  VM_CATEGORY_CHECKLISTS[cleanSec] = [...defaults];
  saveChecklistsToStorage();
  return { success: true, sectionName: cleanSec, list: VM_CATEGORY_CHECKLISTS[cleanSec] };
}

// إدارة كاش الفروع في الذاكرة الحية فقط (In-Memory Only - لا تعتمد على localStorage)
export function saveBranchesToStorage(branches) {
  if (!Array.isArray(branches)) return;
  metadataCache.branches = branches;
}

// إدارة كاش الأخصائيين في الذاكرة الحية فقط (In-Memory Only - لا تعتمد على localStorage)
export function saveSpecialistsToStorage(specialists) {
  if (!Array.isArray(specialists)) return;
  metadataCache.specialists = specialists;
}

// دوال الوصول للقوائم من الذاكرة الحية المتزامنة 100% مع سحابة D1
export function getBranches() {
  if (!Array.isArray(metadataCache.branches)) {
    metadataCache.branches = [];
  }
  return metadataCache.branches;
}

export function getSpecialists() {
  if (!Array.isArray(metadataCache.specialists)) {
    metadataCache.specialists = [];
  }
  return metadataCache.specialists;
}

// إضافة فرع جديد مباشرة عبر API سحابة Cloudflare D1
export async function addBranchItem(name) {
  const { createBranchCloud } = await import('./api.js');
  return await createBranchCloud(name);
}

// حذف فرع بالمعرف أو بالاسم مباشرة عبر API سحابة Cloudflare D1
export async function deleteBranchItem(idOrName) {
  const list = getBranches();
  const target = list.find(b => b.id === idOrName || b.name === idOrName || b === idOrName);
  const targetName = target ? (target.name || target) : idOrName;

  if (currentAudit.branchName && currentAudit.branchName.trim().toLowerCase() === targetName.trim().toLowerCase()) {
    return { success: false, reason: 'لا يمكن حذف الفرع لأنه محدد في مسودة التقرير النشطة' };
  }

  const { deleteBranchCloud } = await import('./api.js');
  return await deleteBranchCloud(idOrName);
}

// إضافة أخصائي جديد مباشرة عبر API سحابة Cloudflare D1
export async function addSpecialistItem(name) {
  const { createSpecialistCloud } = await import('./api.js');
  return await createSpecialistCloud(name);
}

// حذف أخصائي بالمعرف أو بالاسم مباشرة عبر API سحابة Cloudflare D1
export async function deleteSpecialistItem(idOrName) {
  const list = getSpecialists();
  const target = list.find(s => s.id === idOrName || s.name === idOrName || s === idOrName);
  const targetName = target ? (target.name || target) : idOrName;

  if (currentAudit.auditorName && currentAudit.auditorName.trim().toLowerCase() === targetName.trim().toLowerCase()) {
    return { success: false, reason: 'لا يمكن حذف الأخصائي لأنه محدد كمسؤول التقييم في التقرير النشط' };
  }

  const { deleteSpecialistCloud } = await import('./api.js');
  return await deleteSpecialistCloud(idOrName);
}

// ==================== إدارة وسوم المعالجة السريعة (Quick Processing Tags CRUD) ====================

export function getQuickTags() {
  if (!Array.isArray(metadataCache.quickTags) || metadataCache.quickTags.length === 0) {
    const stored = localStorage.getItem(STORAGE_KEY_TAGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) metadataCache.quickTags = parsed;
      } catch (e) {}
    }
    if (!Array.isArray(metadataCache.quickTags) || metadataCache.quickTags.length === 0) {
      metadataCache.quickTags = [...DEFAULT_QUICK_TAGS];
    }
  }
  return metadataCache.quickTags;
}

export function saveQuickTagsToStorage(tags) {
  if (!Array.isArray(tags)) return false;
  metadataCache.quickTags = tags;
  localStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify(tags));
  return true;
}

export function addQuickTag(tagName) {
  const clean = (tagName || '').trim();
  if (!clean) return { success: false, reason: 'يرجى كتابة نص الوسم' };

  const list = getQuickTags();
  if (list.some(t => t.toLowerCase() === clean.toLowerCase())) {
    return { success: false, reason: 'هذا الوسم موجود مسبقاً في القائمة' };
  }

  list.push(clean);
  saveQuickTagsToStorage(list);
  return { success: true, item: clean, list };
}

export function updateQuickTag(oldName, newName) {
  const cleanOld = (oldName || '').trim();
  const cleanNew = (newName || '').trim();
  if (!cleanOld || !cleanNew) return { success: false, reason: 'بيانات الوسم غير مكتملة' };

  const list = getQuickTags();
  const idx = list.indexOf(cleanOld);
  if (idx === -1) return { success: false, reason: 'الوسم المراد تعديله غير موجود' };

  list[idx] = cleanNew;
  saveQuickTagsToStorage(list);

  // تحديث الوسوم المحددة حالياً في المودال إن وجد
  if (modalState.activeModalTags) {
    const mIdx = modalState.activeModalTags.indexOf(cleanOld);
    if (mIdx !== -1) modalState.activeModalTags[mIdx] = cleanNew;
  }

  // تحديث تقارير الأقسام النشطة
  if (currentAudit && Array.isArray(currentAudit.sections)) {
    let changed = false;
    currentAudit.sections.forEach(sec => {
      if (Array.isArray(sec.tags)) {
        const sIdx = sec.tags.indexOf(cleanOld);
        if (sIdx !== -1) {
          sec.tags[sIdx] = cleanNew;
          changed = true;
        }
      }
    });
    if (changed) saveAuditToStorage();
  }

  return { success: true, oldName: cleanOld, newName: cleanNew, list };
}

export function deleteQuickTag(tagName) {
  const clean = (tagName || '').trim();
  if (!clean) return { success: false, reason: 'اسم الوسم غير صحيح' };

  const list = getQuickTags().filter(t => t !== clean);
  saveQuickTagsToStorage(list);

  if (modalState.activeModalTags) {
    modalState.activeModalTags = modalState.activeModalTags.filter(t => t !== clean);
  }

  return { success: true, item: clean, list };
}

export function resetQuickTags() {
  const list = [...DEFAULT_QUICK_TAGS];
  saveQuickTagsToStorage(list);
  return { success: true, list };
}

// ==================== إدارة جهات التكليف (Quick Assignees CRUD) ====================

export function getQuickAssignees() {
  if (!Array.isArray(metadataCache.quickAssignees) || metadataCache.quickAssignees.length === 0) {
    const stored = localStorage.getItem(STORAGE_KEY_ASSIGNEES);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) metadataCache.quickAssignees = parsed;
      } catch (e) {}
    }
    if (!Array.isArray(metadataCache.quickAssignees) || metadataCache.quickAssignees.length === 0) {
      metadataCache.quickAssignees = [...DEFAULT_QUICK_ASSIGNEES];
    }
  }
  return metadataCache.quickAssignees;
}

export function saveQuickAssigneesToStorage(assignees) {
  if (!Array.isArray(assignees)) return false;
  metadataCache.quickAssignees = assignees;
  localStorage.setItem(STORAGE_KEY_ASSIGNEES, JSON.stringify(assignees));
  return true;
}

export function addQuickAssignee(roleName) {
  const clean = (roleName || '').trim();
  if (!clean) return { success: false, reason: 'يرجى كتابة المسمى أو جهة التكليف' };

  const list = getQuickAssignees();
  if (list.some(r => r.toLowerCase() === clean.toLowerCase())) {
    return { success: false, reason: 'هذه الجهة مسجلة مسبقاً في الخيارات السريعة' };
  }

  list.push(clean);
  saveQuickAssigneesToStorage(list);
  return { success: true, item: clean, list };
}

export function updateQuickAssignee(oldRole, newRole) {
  const cleanOld = (oldRole || '').trim();
  const cleanNew = (newRole || '').trim();
  if (!cleanOld || !cleanNew) return { success: false, reason: 'بيانات جهة التكليف غير مكتملة' };

  const list = getQuickAssignees();
  const idx = list.indexOf(cleanOld);
  if (idx === -1) return { success: false, reason: 'الجهة المراد تعديلها غير موجودة' };

  list[idx] = cleanNew;
  saveQuickAssigneesToStorage(list);

  return { success: true, oldRole: cleanOld, newRole: cleanNew, list };
}

export function deleteQuickAssignee(roleName) {
  const clean = (roleName || '').trim();
  if (!clean) return { success: false, reason: 'جهة التكليف غير صحيحة' };

  const list = getQuickAssignees().filter(r => r !== clean);
  saveQuickAssigneesToStorage(list);
  return { success: true, item: clean, list };
}

export function resetQuickAssignees() {
  const list = [...DEFAULT_QUICK_ASSIGNEES];
  saveQuickAssigneesToStorage(list);
  return { success: true, list };
}

// ==================== إدارة خيارات الحالات الفرعية الذكية (Status Sub-Options CRUD) ====================

export function getStatusSubOptions() {
  if (typeof localStorage === 'undefined') {
    return JSON.parse(JSON.stringify(DEFAULT_STATUS_SUB_OPTIONS));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATUS_SUB_OPTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          resolved: Array.isArray(parsed.resolved) ? parsed.resolved : [...DEFAULT_STATUS_SUB_OPTIONS.resolved],
          store_followup: Array.isArray(parsed.store_followup) ? parsed.store_followup : [...DEFAULT_STATUS_SUB_OPTIONS.store_followup],
          management_action: Array.isArray(parsed.management_action) ? parsed.management_action : [...DEFAULT_STATUS_SUB_OPTIONS.management_action]
        };
      }
    }
  } catch (e) {
    console.warn('getStatusSubOptions: failed parsing storage, fallback to defaults', e);
  }
  const defaults = JSON.parse(JSON.stringify(DEFAULT_STATUS_SUB_OPTIONS));
  try {
    localStorage.setItem(STORAGE_KEY_STATUS_SUB_OPTIONS, JSON.stringify(defaults));
  } catch (_) {}
  return defaults;
}

export function saveStatusSubOptionsToStorage(optionsMap) {
  if (!optionsMap || typeof optionsMap !== 'object') return false;
  try {
    localStorage.setItem(STORAGE_KEY_STATUS_SUB_OPTIONS, JSON.stringify(optionsMap));
    return true;
  } catch (e) {
    console.error('saveStatusSubOptionsToStorage error:', e);
    return false;
  }
}

export function addStatusSubOption(statusKey, optionText) {
  const clean = (optionText || '').trim();
  if (!clean) return { success: false, reason: 'يرجى كتابة نص الخيار الفرعي' };
  if (!DEFAULT_STATUS_SUB_OPTIONS[statusKey]) {
    return { success: false, reason: 'مفتاح الحالة الرئيسية غير صحيح' };
  }

  const allOptions = getStatusSubOptions();
  const list = allOptions[statusKey] || [];
  if (list.some(item => item.trim().toLowerCase() === clean.toLowerCase())) {
    return { success: false, reason: 'هذا الخيار مسجل مسبقاً في هذه القائمة' };
  }

  list.push(clean);
  allOptions[statusKey] = list;
  saveStatusSubOptionsToStorage(allOptions);
  return { success: true, item: clean, list, allOptions };
}

export function deleteStatusSubOption(statusKey, optionText) {
  const clean = (optionText || '').trim();
  if (!clean) return { success: false, reason: 'نص الخيار غير صحيح' };
  if (!DEFAULT_STATUS_SUB_OPTIONS[statusKey]) {
    return { success: false, reason: 'مفتاح الحالة غير صحيح' };
  }

  const allOptions = getStatusSubOptions();
  const list = (allOptions[statusKey] || []).filter(item => item.trim() !== clean);
  allOptions[statusKey] = list;
  saveStatusSubOptionsToStorage(allOptions);

  // تحديث الخيارات المحددة في المودال إن وُجدت
  if (modalState.selectedModalSubOptions && Array.isArray(modalState.selectedModalSubOptions[statusKey])) {
    modalState.selectedModalSubOptions[statusKey] = modalState.selectedModalSubOptions[statusKey].filter(item => item.trim() !== clean);
  }

  return { success: true, item: clean, list, allOptions };
}

export function resetStatusSubOptions(statusKey = null) {
  const allOptions = getStatusSubOptions();
  if (statusKey && DEFAULT_STATUS_SUB_OPTIONS[statusKey]) {
    allOptions[statusKey] = [...DEFAULT_STATUS_SUB_OPTIONS[statusKey]];
  } else {
    Object.assign(allOptions, JSON.parse(JSON.stringify(DEFAULT_STATUS_SUB_OPTIONS)));
  }
  saveStatusSubOptionsToStorage(allOptions);
  return { success: true, allOptions };
}

/**
 * دالة مساعدة لاستخراج الحالات المحددة للقسم مع التوافقية العكسية
 */
export function getSectionStatuses(sec) {
  if (!sec) return ['resolved'];
  if (Array.isArray(sec.statuses) && sec.statuses.length > 0) {
    return sec.statuses;
  }
  if (sec.status) {
    return [sec.status];
  }
  return ['resolved'];
}

/**
 * دالة مساعدة لاستخراج الخيارات الفرعية للحالة للقسم مع التوافقية العكسية
 */
export function getSectionSubOptions(sec, statusKey) {
  if (!sec) return [];
  if (sec.statusSubOptions && Array.isArray(sec.statusSubOptions[statusKey])) {
    return sec.statusSubOptions[statusKey];
  }
  return [];
}

// مؤقت تأخير حفظ IndexedDB لتجميع التعديلات المتتالية (Debounce)
let idbSaveTimer = null;

function applyLoadedAuditData(parsed) {
  if (parsed && typeof parsed === 'object') {
    currentAudit.id = parsed.id || currentAudit.id;
    currentAudit.branchName = parsed.branchName || currentAudit.branchName;
    currentAudit.auditorName = parsed.auditorName || currentAudit.auditorName;
    currentAudit.weekNumber = parsed.weekNumber || currentAudit.weekNumber;
    currentAudit.auditDate = parsed.auditDate || currentAudit.auditDate;
    currentAudit.sections = Array.isArray(parsed.sections) ? parsed.sections : [];
    currentAudit.visitSummary = parsed.visitSummary !== undefined ? parsed.visitSummary : '';
  } else {
    currentAudit.sections = [];
    currentAudit.visitSummary = '';
  }
}

// حفظ التقرير والجولة النشطة في IndexedDB الآمن مع منع مشاكل QuotaExceededError نهائياً
export function saveAuditToStorage() {
  try {
    // 1. الحفظ الفعلي للصور والبيانات الكاملة في IndexedDB (مساحة غير محدودة)
    if (typeof window !== 'undefined') {
      if (idbSaveTimer) clearTimeout(idbSaveTimer);
      idbSaveTimer = setTimeout(() => {
        saveActiveTourIDB(currentAudit).catch(err => {
          console.warn('[SAMX Storage] IDB active tour save error:', err);
        });
      }, 60);
    }

    // 2. تحديث مؤشر الحفظ في شريط التطبيق العلوي
    const ind = document.getElementById('save-status-indicator');
    if (ind) {
      ind.innerText = 'محفوظ محلياً (IndexedDB) ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }

    // 3. تخزين ملخص تعريفي خفيف جداً فقط في localStorage (بدون الصور نهائياً < 2KB)
    try {
      const lightweightStub = {
        id: currentAudit.id,
        branchName: currentAudit.branchName,
        auditorName: currentAudit.auditorName,
        weekNumber: currentAudit.weekNumber,
        auditDate: currentAudit.auditDate,
        sectionsCount: Array.isArray(currentAudit.sections) ? currentAudit.sections.length : 0,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('samx_vm_active_stub', JSON.stringify(lightweightStub));
    } catch (_) {}

    return true;
  } catch (err) {
    console.warn('[SAMX Storage] saveAuditToStorage error:', err);
    return false;
  }
}

// استرجاع التقرير من محرك التخزين الفائق IndexedDB مع دعم الهجرة التلقائية
export async function loadAuditFromStorage() {
  try {
    // 1. محاولة القراءة المباشرة من IndexedDB (المصدر الأساسي الكامل)
    const idbData = await loadActiveTourIDB();
    if (idbData && typeof idbData === 'object' && Array.isArray(idbData.sections)) {
      applyLoadedAuditData(idbData);
      return currentAudit;
    }

    // 2. فحص الهجرة من التخزين المحلي القديم إن وجد (قبل حذفه)
    if (typeof localStorage !== 'undefined') {
      let saved = localStorage.getItem(APP_STORAGE_KEY) || localStorage.getItem(STORAGE_KEY_CURRENT_TOUR);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          applyLoadedAuditData(parsed);
          // حفظ فوري في IndexedDB وتفريغ المفاتيح الثقيلة من localStorage لمنع امتلاء الذاكرة
          await saveActiveTourIDB(currentAudit);
          try {
            localStorage.removeItem(APP_STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY_CURRENT_TOUR);
          } catch (_) {}
          return currentAudit;
        }
      }
    }
  } catch (e) {
    console.warn('loadAuditFromStorage error:', e);
  }

  if (!Array.isArray(currentAudit.sections)) {
    currentAudit.sections = [];
  }
  return currentAudit;
}

// ==================== إدارة الهوية البصرية وشعار الشركة (Brand Identity & Logo) ====================
export function getBrandingSettings() {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_BRANDING };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANDING);
    if (raw) {
      const parsed = JSON.parse(raw);
      let subtitle = parsed.companySubtitle !== undefined ? parsed.companySubtitle : DEFAULT_BRANDING.companySubtitle;
      // تنظيف أي بيانات قديمة مخزنة في متصفح المستخدم تحتوي على كلمة "إدارة"
      if (typeof subtitle === 'string' && (subtitle.includes('إدارة') || subtitle.includes('ادارة') || subtitle.includes('Department'))) {
        subtitle = subtitle
          .replace(/[إا]دارة\s+العرض\s+المرئي\s+والتنسيق\s+التجاري/g, 'العرض المرئي والتنسيق التجاري')
          .replace(/[إا]دارة\s+العرض\s+المرئي/g, 'العرض المرئي')
          .replace(/\s*\(Visual\s+Merchandising\s+Department\)/gi, '')
          .replace(/\s*•\s*Visual\s+Merchandising\s+Department/gi, '')
          .trim();
        if (!subtitle) subtitle = DEFAULT_BRANDING.companySubtitle;
        parsed.companySubtitle = subtitle;
        try {
          localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(parsed));
        } catch (_) {}
      }
      return {
        companyName: (parsed.companyName && parsed.companyName.trim()) || DEFAULT_BRANDING.companyName,
        companySubtitle: subtitle || DEFAULT_BRANDING.companySubtitle,
        logoData: (parsed.logoData && parsed.logoData.trim()) || ALSHIAK_LOGO_BASE64,
        footerDisclaimer: parsed.footerDisclaimer !== undefined ? parsed.footerDisclaimer : DEFAULT_BRANDING.footerDisclaimer,
        showFooterCompliance: parsed.showFooterCompliance !== undefined ? Boolean(parsed.showFooterCompliance) : DEFAULT_BRANDING.showFooterCompliance
      };
    }
  } catch (e) {
    console.warn('getBrandingSettings: fallback to defaults', e);
  }
  return { ...DEFAULT_BRANDING };
}

export function saveBrandingSettings(settings = {}) {
  try {
    const current = getBrandingSettings();
    let newSubtitle = settings.companySubtitle !== undefined ? settings.companySubtitle.trim() : current.companySubtitle;
    if (typeof newSubtitle === 'string') {
      newSubtitle = newSubtitle
        .replace(/[إا]دارة\s+العرض\s+المرئي\s+والتنسيق\s+التجاري/g, 'العرض المرئي والتنسيق التجاري')
        .replace(/[إا]دارة\s+العرض\s+المرئي/g, 'العرض المرئي')
        .replace(/\s*\(Visual\s+Merchandising\s+Department\)/gi, '')
        .replace(/\s*•\s*Visual\s+Merchandising\s+Department/gi, '')
        .trim();
    }
    const updated = {
      companyName: settings.companyName !== undefined ? settings.companyName.trim() : current.companyName,
      companySubtitle: newSubtitle || DEFAULT_BRANDING.companySubtitle,
      logoData: settings.logoData !== undefined ? settings.logoData : current.logoData,
      footerDisclaimer: settings.footerDisclaimer !== undefined ? settings.footerDisclaimer.trim() : current.footerDisclaimer,
      showFooterCompliance: settings.showFooterCompliance !== undefined ? Boolean(settings.showFooterCompliance) : current.showFooterCompliance
    };
    localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('saveBrandingSettings error:', e);
    return null;
  }
}

export function resetBrandingSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY_BRANDING);
  } catch (e) {}
  return { ...DEFAULT_BRANDING };
}

// ==================== إدارة أرشيف تقارير الجولات الميدانية (Audit Archive & History) ====================

/**
 * توليد صورة جولة ميدانية عالية الوضوح بصيغة Base64 JPEG بدون أي اعتمادية شبكية
 */
export function createSampleAuditImage(title, subtitle, bgColor = '#1e293b', accent = '#f59e0b') {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // تدرج الخلفية الفاخر
    const grad = ctx.createLinearGradient(0, 0, 640, 420);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#0b132b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 420);

    // شبكة خطوط هندسية أنيقة
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 40; x < 640; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 420); ctx.stroke();
    }
    for (let y = 40; y < 420; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke();
    }

    // شارة دائرية أيقونية
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(320, 155, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VM', 320, 155);

    // عنوان الصورة
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(title, 320, 240);

    // نص فرعي
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(subtitle, 320, 275);

    // ختم التوثيق الميداني
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.fillRect(20, 360, 600, 36);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.strokeRect(20, 360, 600, 36);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SAMX-VM • توثيق ميداني رسمي معتمد • Retail Merchandising Audit', 320, 378);

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    return '';
  }
}

/**
 * قائمة الجولات الميدانية الافتراضية للأرشيف (تبدأ فارغة تماماً [])
 */
export function generateSeedAuditArchive() {
  return [];
}

/**
 * جلب قائمة تقارير الجولات الميدانية المؤرشفة من التخزين المحلي
 * تبدأ فارغة تماماً ([]) وتقتصر حصراً على الجولات الحقيقية المحفوظة يدوياً بواسطة المستخدم
 */
// مخزن الذاكرة الحية فائق السرعة لأرشيف الجولات (In-Memory High-Speed Cache)
let cachedArchivedAudits = [];
let isArchiveLoadedFromIDB = false;

/**
 * تهيئة محرك التخزين الفائق IndexedDB وهجرة بيانات localStorage بأمان تام
 */
export async function initStorageEngine() {
  try {
    await openDatabase();

    // 1. تشغيل الهجرة الآمنة ونقل البيانات من localStorage إلى IndexedDB مع تفريغ المفاتيح الثقيلة
    await migrateLocalStorageToIndexedDB();

    // 2. تحميل الأرشيف الكامل من IndexedDB إلى الذاكرة المؤقتة الحية
    const idbList = await getAllArchivedToursIDB();
    if (Array.isArray(idbList) && idbList.length > 0) {
      cachedArchivedAudits = idbList.map(a => ({
        ...a,
        ownerUsername: a.ownerUsername || 'sam',
        specialistName: a.specialistName || a.auditorName || 'سمير سلطان'
      }));
    } else {
      cachedArchivedAudits = [];
    }
    isArchiveLoadedFromIDB = true;

    // 3. تحميل الجولة النشطة بكامل صورها من IndexedDB
    await loadAuditFromStorage();
    return true;
  } catch (err) {
    console.warn('[SAMX Storage] initStorageEngine error:', err);
    return false;
  }
}

/**
 * جلب قائمة تقارير الجولات الميدانية المؤرشفة بسرعة 0ms من مخزن الذاكرة المؤقتة
 * المدعوم بقاعدة بيانات IndexedDB الخالية من قيود مساحة الـ 5MB
 */
export function getArchivedAudits() {
  if (cachedArchivedAudits.length > 0 || isArchiveLoadedFromIDB) {
    return cachedArchivedAudits;
  }

  // محاولة قراءة متزامنة احتياطية من التخزين المحلي فقط في حال لم تنتهِ بعد تهيئة IndexedDB
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUDIT_ARCHIVE) || localStorage.getItem(STORAGE_KEY_SAVED_TOURS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedArchivedAudits = parsed.filter(a => {
            if (!a || typeof a !== 'object') return false;
            if (typeof a.id === 'string' && a.id.startsWith('audit_cycle_w4')) return false;
            return true;
          }).map(a => ({
            ...a,
            ownerUsername: a.ownerUsername || 'sam',
            specialistName: a.specialistName || a.auditorName || 'سمير سلطان'
          }));
        }
      }
    } catch (_) {}
  }
  return cachedArchivedAudits;
}

/**
 * حفظ قائمة تقارير الجولات في محرك IndexedDB والذاكرة الحية (بدون إغراق localStorage)
 */
export function saveArchivedAudits(audits) {
  if (!Array.isArray(audits)) return false;
  cachedArchivedAudits = audits;

  // حفظ غير متزامن فائق السرعة في IndexedDB
  saveAllArchivedToursIDB(audits).catch(err => {
    console.warn('[SAMX Storage] saveArchivedAudits IDB error:', err);
  });

  return true;
}

/**
 * دالة مساعدة للحصول على المستخدم النشط حالياً من الجلسة
 */
function getCurrentSessionUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

/**
 * حفظ مسودة التدقيق الحالية النشطة كنسخة مستقلة في الأرشيف وسجل الجولات
 * مع رفع تلقائي مباشر لسحابة Cloudflare D1 و R2 (STORAGE_BUCKET)
 */
export function archiveCurrentAudit() {
  if (!currentAudit) {
    return { success: false, reason: 'لا توجد جولة نشطة لحفظها' };
  }
  const sessionUser = getCurrentSessionUser();
  const ownerUsername = (sessionUser && sessionUser.username) ? sessionUser.username : 'sam';
  const branchName = (currentAudit.branchName || '').trim() || 'معرض غير محدد';
  const auditorName = (currentAudit.auditorName || '').trim() || (sessionUser ? sessionUser.displayName : 'سمير سلطان');
  const weekNumber = Number(currentAudit.weekNumber) || 43;
  const auditDate = currentAudit.auditDate || new Date().toISOString().split('T')[0];
  
  const dateObj = new Date(auditDate);
  const year = dateObj.getFullYear() || 2026;
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthName = `${monthNames[dateObj.getMonth()] || 'شهر'} ${year}`;

  if (!currentAudit.id) {
    currentAudit.id = 'tour_' + Date.now();
  }

  const auditCopy = {
    id: currentAudit.id,
    ownerUsername,
    specialistName: auditorName,
    branchName,
    auditorName,
    weekNumber,
    auditDate,
    monthKey,
    monthName,
    savedAt: new Date().toISOString(),
    sections: JSON.parse(JSON.stringify(currentAudit.sections || [])),
    visitSummary: currentAudit.visitSummary || ''
  };

  const list = getArchivedAudits();
  const existingIdx = list.findIndex(a => a.id === auditCopy.id || (a.branchName === branchName && Number(a.weekNumber) === Number(weekNumber)));
  if (existingIdx !== -1) {
    list[existingIdx] = auditCopy;
  } else {
    list.unshift(auditCopy);
  }

  saveArchivedAudits(list);

  // 1. حفظ فوري في جدول الأرشيف في IndexedDB
  saveArchivedTourIDB(auditCopy).catch(e => console.warn('saveArchivedTourIDB error:', e));

  // 2. ترحيل وتفريغ سحابي مباشر إلى Cloudflare D1 و R2 (STORAGE_BUCKET) في الخلفية
  try {
    import('./api.js').then(api => {
      if (api && typeof api.saveTourCloud === 'function') {
        api.saveTourCloud(auditCopy).catch(err => console.warn('[SAMX Cloud Sync] Auto tour offload error:', err));
      }
    }).catch(() => {});
  } catch (_) {}

  return { success: true, item: auditCopy, list };
}

/**
 * هجرة وحفظ مسودة العمل النشطة تلقائياً في سجل الأرشيف عند بدء التطبيق
 * لضمان عدم ضياع التقرير الحالي للمستخدم وظهوره مباشرة في سجل الجولات
 */
export function autoMigrateActiveTourToArchive() {
  if (typeof localStorage === 'undefined' && typeof window === 'undefined') return;
  try {
    const list = getArchivedAudits();
    
    // فحص ما إذا كان هناك عمل نشط حالي مسجل
    const branch = (currentAudit.branchName || '').trim();
    const hasBranch = branch !== '' && branch !== 'لم يتم تحديد الفرع';
    const hasSections = Array.isArray(currentAudit.sections) && currentAudit.sections.length > 0;
    
    if (hasBranch || hasSections) {
      const branchName = hasBranch ? branch : 'معرض الهفوف - الاحساء';
      const weekNumber = Number(currentAudit.weekNumber) || 43;
      
      const existingIdx = list.findIndex(a => 
        (currentAudit.id && a.id === currentAudit.id) || 
        (a.branchName && a.branchName === branchName && Number(a.weekNumber) === weekNumber)
      );

      const auditDate = currentAudit.auditDate || new Date().toISOString().split('T')[0];
      const dateObj = new Date(auditDate);
      const year = dateObj.getFullYear() || 2026;
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthName = `${monthNames[dateObj.getMonth()] || 'شهر'} ${year}`;

      const sessionUser = getCurrentSessionUser();
      const ownerUsername = (sessionUser && sessionUser.username) ? sessionUser.username : 'sam';
      const auditorName = currentAudit.auditorName || (sessionUser ? sessionUser.displayName : 'سمير سلطان');

      const activeEntry = {
        id: currentAudit.id || ('tour_' + Date.now()),
        ownerUsername,
        specialistName: auditorName,
        branchName: branchName,
        auditorName,
        weekNumber,
        auditDate,
        monthKey: `${year}-${month}`,
        monthName,
        savedAt: new Date().toISOString(),
        sections: JSON.parse(JSON.stringify(currentAudit.sections || [])),
        visitSummary: currentAudit.visitSummary || ''
      };

      if (existingIdx !== -1) {
        list[existingIdx] = activeEntry;
      } else {
        list.unshift(activeEntry);
      }
      saveArchivedAudits(list);
      saveArchivedTourIDB(activeEntry).catch(() => {});
    }
  } catch (err) {
    console.warn('autoMigrateActiveTourToArchive error:', err);
  }
}

/**
 * إضافة واستيراد ملفات JSON جديدة للأرشيف
 */
export function addAuditsToArchive(auditsToAdd) {
  if (!Array.isArray(auditsToAdd) || auditsToAdd.length === 0) return { success: false, count: 0 };
  const list = getArchivedAudits();
  let addedCount = 0;

  auditsToAdd.forEach(audit => {
    if (audit && Array.isArray(audit.sections) && audit.sections.length > 0) {
      const id = audit.id || ('audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
      const auditDate = audit.auditDate || new Date().toISOString().split('T')[0];
      const d = new Date(auditDate);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const mName = `${monthNames[d.getMonth()] || 'شهر'} ${d.getFullYear()}`;

      const normalized = {
        ...audit,
        id,
        branchName: audit.branchName || 'معرض غير محدد',
        auditorName: audit.auditorName || 'أخصائي الـ VM',
        weekNumber: Number(audit.weekNumber) || 1,
        auditDate,
        monthKey: audit.monthKey || mKey,
        monthName: audit.monthName || mName,
        savedAt: audit.savedAt || new Date().toISOString(),
        sections: audit.sections
      };

      const existIdx = list.findIndex(a => a.id === normalized.id);
      if (existIdx !== -1) {
        list[existIdx] = normalized;
      } else {
        list.push(normalized);
      }
      saveArchivedTourIDB(normalized).catch(() => {});
      addedCount++;
    }
  });

  saveArchivedAudits(list);
  return { success: true, count: addedCount, list };
}

/**
 * حذف تقرير تدقيق من الأرشيف
 */
export function deleteArchivedAudit(auditId) {
  cachedArchivedAudits = getArchivedAudits().filter(a => a.id !== auditId);
  saveArchivedAudits(cachedArchivedAudits);
  deleteArchivedTourIDB(auditId).catch(e => console.warn('deleteArchivedTourIDB error:', e));

  // حذف اختياري من سحابة D1/R2
  try {
    import('./api.js').then(api => {
      if (api && typeof api.deleteTourCloud === 'function') {
        api.deleteTourCloud(auditId).catch(() => {});
      }
    }).catch(() => {});
  } catch (_) {}

  return { success: true, list: cachedArchivedAudits };
}

/**
 * تفريغ أرشيف الجولات بالكامل
 */
export function resetArchivedAuditsToDefault() {
  cachedArchivedAudits = [];
  saveArchivedAudits([]);
  clearArchivedToursIDB().catch(e => console.warn('clearArchivedToursIDB error:', e));
  return { success: true, list: [] };
}

/**
 * البحث عن تقرير تدقيق بالمعرف
 */
export function getArchivedAuditById(id) {
  const list = getArchivedAudits();
  return list.find(a => a.id === id) || null;
}

// تصدير الحالة لدوال النطاق العام (Global Scope Protection)
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
  window.currentAudit = currentAudit;
  window.metadataCache = metadataCache;
  window.modalState = modalState;
  window.STATUS_MAP = STATUS_MAP;
  window.DEFAULT_BRANDING = DEFAULT_BRANDING;
  window.getBrandingSettings = getBrandingSettings;
  window.saveBrandingSettings = saveBrandingSettings;
  window.resetBrandingSettings = resetBrandingSettings;
  window.VM_CATEGORY_CHECKLISTS = VM_CATEGORY_CHECKLISTS;
  window.DEFAULT_QUICK_TAGS = DEFAULT_QUICK_TAGS;
  window.DEFAULT_QUICK_ASSIGNEES = DEFAULT_QUICK_ASSIGNEES;
  window.getBranches = getBranches;
  window.getSpecialists = getSpecialists;
  window.saveBranchesToStorage = saveBranchesToStorage;
  window.saveSpecialistsToStorage = saveSpecialistsToStorage;
  window.addBranchItem = addBranchItem;
  window.deleteBranchItem = deleteBranchItem;
  window.addSpecialistItem = addSpecialistItem;
  window.deleteSpecialistItem = deleteSpecialistItem;
  window.saveAuditToStorage = saveAuditToStorage;
  window.loadAuditFromStorage = loadAuditFromStorage;
  window.loadMetadata = loadMetadata;
  window.getStoreSections = getStoreSections;
  window.saveSectionsToStorage = saveSectionsToStorage;
  window.addStoreSection = addStoreSection;
  window.updateStoreSection = updateStoreSection;
  window.deleteStoreSection = deleteStoreSection;
  window.getSectionStandards = getSectionStandards;
  window.addSectionStandard = addSectionStandard;
  window.updateSectionStandard = updateSectionStandard;
  window.deleteSectionStandard = deleteSectionStandard;
  window.resetSectionStandards = resetSectionStandards;
  window.getQuickTags = getQuickTags;
  window.saveQuickTagsToStorage = saveQuickTagsToStorage;
  window.addQuickTag = addQuickTag;
  window.updateQuickTag = updateQuickTag;
  window.deleteQuickTag = deleteQuickTag;
  window.resetQuickTags = resetQuickTags;
  window.getQuickAssignees = getQuickAssignees;
  window.saveQuickAssigneesToStorage = saveQuickAssigneesToStorage;
  window.addQuickAssignee = addQuickAssignee;
  window.updateQuickAssignee = updateQuickAssignee;
  window.deleteQuickAssignee = deleteQuickAssignee;
  window.resetQuickAssignees = resetQuickAssignees;
  window.DEFAULT_STATUS_SUB_OPTIONS = DEFAULT_STATUS_SUB_OPTIONS;
  window.getStatusSubOptions = getStatusSubOptions;
  window.saveStatusSubOptionsToStorage = saveStatusSubOptionsToStorage;
  window.addStatusSubOption = addStatusSubOption;
  window.deleteStatusSubOption = deleteStatusSubOption;
  window.resetStatusSubOptions = resetStatusSubOptions;
  window.getSectionStatuses = getSectionStatuses;
  window.getSectionSubOptions = getSectionSubOptions;
  window.createSampleAuditImage = createSampleAuditImage;
  window.generateSeedAuditArchive = generateSeedAuditArchive;
  window.getArchivedAudits = getArchivedAudits;
  window.saveArchivedAudits = saveArchivedAudits;
  window.archiveCurrentAudit = archiveCurrentAudit;
  window.autoMigrateActiveTourToArchive = autoMigrateActiveTourToArchive;
  window.addAuditsToArchive = addAuditsToArchive;
  window.deleteArchivedAudit = deleteArchivedAudit;
  window.resetArchivedAuditsToDefault = resetArchivedAuditsToDefault;
  window.getArchivedAuditById = getArchivedAuditById;
  window.initStorageEngine = initStorageEngine;
  window.getStorageQuotaInfo = getStorageQuotaInfo;
  window.STORAGE_KEY_SAVED_TOURS = STORAGE_KEY_SAVED_TOURS;
  window.STORAGE_KEY_CURRENT_TOUR = STORAGE_KEY_CURRENT_TOUR;
}
