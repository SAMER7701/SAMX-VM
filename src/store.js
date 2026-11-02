/**
 * SAMX-VM Core Data & State Store
 * Version: 1.4.0
 * Architecture: Modular Local-First ES Module
 */

export const APP_VERSION = '1.4.0';

// مفاتيح التخزين المحلي الصريحة (LocalStorage Keys)
export const APP_STORAGE_KEY = 'samx_vm_active_audit';
export const STORAGE_KEY_BRANCHES = 'samx_branches_clean_v1';
export const STORAGE_KEY_SPECIALISTS = 'samx_specialists_clean_v1';
export const STORAGE_KEY_SECTIONS = 'samx_store_sections_v2';
export const STORAGE_KEY_CHECKLISTS = 'samx_vm_checklists_v2';
export const STORAGE_KEY_TAGS = 'samx_quick_tags_v1';
export const STORAGE_KEY_ASSIGNEES = 'samx_quick_assignees_v1';
export const LEGACY_BRANCHES_KEY = 'samx_branches';
export const LEGACY_SPECIALISTS_KEY = 'samx_specialists';

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
    shortLabel: 'تم المعالجة ✅',
    badgeClass: 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50',
    printBadgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold',
    icon: 'check-circle-2'
  },
  store_followup: {
    id: 'store_followup',
    label: 'تتطلب متابعة الفرع ⏳',
    shortLabel: 'متابعة الفرع ⏳',
    badgeClass: 'bg-amber-950/80 text-amber-400 border border-amber-500/50',
    printBadgeClass: 'bg-amber-100 text-amber-900 border border-amber-400 font-bold',
    icon: 'clock'
  },
  management_action: {
    id: 'management_action',
    label: 'تتطلب صيانة / إدارة ⚠️',
    shortLabel: 'صيانة / إدارة ⚠️',
    badgeClass: 'bg-rose-950/80 text-rose-400 border border-rose-500/50',
    printBadgeClass: 'bg-rose-100 text-rose-900 border border-rose-400 font-bold',
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
  sections: []
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
  activeModalTags: [],
  activeModalChecklist: [],
  selectedModalStatus: 'resolved',
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
}

// قراءة الفروع والأخصائيين والأقسام والمعايير من التخزين المحلي النظيف (Clean Storage)
export async function loadMetadata() {
  try {
    let branches = [];
    let specialists = [];
    let sections = [];

    const storedBranches = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (storedBranches) {
      try {
        const parsed = JSON.parse(storedBranches);
        if (Array.isArray(parsed)) branches = parsed;
      } catch (e) {
        console.warn('Failed parsing storedBranches', e);
      }
    }

    const storedSpecialists = localStorage.getItem(STORAGE_KEY_SPECIALISTS);
    if (storedSpecialists) {
      try {
        const parsed = JSON.parse(storedSpecialists);
        if (Array.isArray(parsed)) specialists = parsed;
      } catch (e) {
        console.warn('Failed parsing storedSpecialists', e);
      }
    }

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

    localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branches));
    localStorage.setItem(STORAGE_KEY_SPECIALISTS, JSON.stringify(specialists));
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

// حفظ وتحديث كاش الفروع محلياً
export function saveBranchesToStorage(branches) {
  if (!Array.isArray(branches)) return;
  metadataCache.branches = branches;
  localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branches));
  localStorage.setItem(LEGACY_BRANCHES_KEY, JSON.stringify(branches.map(b => (b && b.name) ? b.name : b)));
}

// حفظ وتحديث كاش الأخصائيين محلياً
export function saveSpecialistsToStorage(specialists) {
  if (!Array.isArray(specialists)) return;
  metadataCache.specialists = specialists;
  localStorage.setItem(STORAGE_KEY_SPECIALISTS, JSON.stringify(specialists));
  localStorage.setItem(LEGACY_SPECIALISTS_KEY, JSON.stringify(specialists.map(s => (s && s.name) ? s.name : s)));
}

// دوال الوصول للقوائم (تسمح بإرجاع مصفوفة فارغة [])
export function getBranches() {
  if (!Array.isArray(metadataCache.branches)) {
    const stored = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) metadataCache.branches = parsed;
      } catch(e){}
    }
    if (!Array.isArray(metadataCache.branches)) {
      metadataCache.branches = [];
    }
  }
  return metadataCache.branches;
}

export function getSpecialists() {
  if (!Array.isArray(metadataCache.specialists)) {
    const stored = localStorage.getItem(STORAGE_KEY_SPECIALISTS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) metadataCache.specialists = parsed;
      } catch(e){}
    }
    if (!Array.isArray(metadataCache.specialists)) {
      metadataCache.specialists = [];
    }
  }
  return metadataCache.specialists;
}

// إضافة فرع جديد
export async function addBranchItem(name) {
  const clean = (name || '').trim();
  if (!clean) return { success: false, reason: 'يرجى كتابة اسم المعرض أو الفرع' };

  const list = getBranches();
  if (list.some(b => (b.name || b).trim().toLowerCase() === clean.toLowerCase())) {
    return { success: false, reason: 'اسم المعرض أو الفرع مسجل مسبقاً في القائمة' };
  }

  const now = new Date().toISOString();
  const newBranch = {
    id: generateEntityId('br'),
    name: clean,
    createdAt: now,
    updatedAt: now
  };

  list.push(newBranch);
  metadataCache.branches = list;
  localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(list));
  localStorage.setItem(LEGACY_BRANCHES_KEY, JSON.stringify(list.map(b => b.name || b)));

  return { success: true, item: newBranch, list };
}

// حذف فرع بالمعرف أو بالاسم مع حماية الفرع النشط
export async function deleteBranchItem(idOrName) {
  const list = getBranches();
  const target = list.find(b => b.id === idOrName || b.name === idOrName || b === idOrName);
  const targetName = target ? (target.name || target) : idOrName;

  if (currentAudit.branchName && currentAudit.branchName.trim().toLowerCase() === targetName.trim().toLowerCase()) {
    return { success: false, reason: 'لا يمكن حذف الفرع لأنه محدد في مسودة التقرير النشطة' };
  }

  metadataCache.branches = list.filter(b => b.id !== idOrName && (b.name || b) !== idOrName);
  localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(metadataCache.branches));
  localStorage.setItem(LEGACY_BRANCHES_KEY, JSON.stringify(metadataCache.branches.map(b => b.name || b)));

  return { success: true, list: metadataCache.branches };
}

// إضافة أخصائي جديد
export async function addSpecialistItem(name) {
  const clean = (name || '').trim();
  if (!clean) return { success: false, reason: 'يرجى كتابة اسم أخصائي الـ VM' };

  const list = getSpecialists();
  if (list.some(s => (s.name || s).trim().toLowerCase() === clean.toLowerCase())) {
    return { success: false, reason: 'اسم الأخصائي مسجل مسبقاً في القائمة' };
  }

  const now = new Date().toISOString();
  const newSpecialist = {
    id: generateEntityId('sp'),
    name: clean,
    createdAt: now,
    updatedAt: now
  };

  list.push(newSpecialist);
  metadataCache.specialists = list;
  localStorage.setItem(STORAGE_KEY_SPECIALISTS, JSON.stringify(list));
  localStorage.setItem(LEGACY_SPECIALISTS_KEY, JSON.stringify(list.map(s => s.name || s)));

  return { success: true, item: newSpecialist, list };
}

// حذف أخصائي بالمعرف أو بالاسم مع حماية الأخصائي النشط
export async function deleteSpecialistItem(idOrName) {
  const list = getSpecialists();
  const target = list.find(s => s.id === idOrName || s.name === idOrName || s === idOrName);
  const targetName = target ? (target.name || target) : idOrName;

  if (currentAudit.auditorName && currentAudit.auditorName.trim().toLowerCase() === targetName.trim().toLowerCase()) {
    return { success: false, reason: 'لا يمكن حذف الأخصائي لأنه محدد كمسؤول التقييم في التقرير النشط' };
  }

  metadataCache.specialists = list.filter(s => s.id !== idOrName && (s.name || s) !== idOrName);
  localStorage.setItem(STORAGE_KEY_SPECIALISTS, JSON.stringify(metadataCache.specialists));
  localStorage.setItem(LEGACY_SPECIALISTS_KEY, JSON.stringify(metadataCache.specialists.map(s => s.name || s)));

  return { success: true, list: metadataCache.specialists };
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

// حفظ التقرير في التخزين المحلي
export function saveAuditToStorage() {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(currentAudit));
    const ind = document.getElementById('save-status-indicator');
    if (ind) {
      ind.innerText = 'محفوظ محلياً ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }
    return true;
  } catch (err) {
    console.warn('LocalStorage limit reached', err);
    if (typeof window.showToast === 'function') {
      window.showToast('تنبيه: مساحة التخزين المحلي على جهازك ممتلئة بالصور', 'error');
    }
    return false;
  }
}

// استرجاع التقرير من التخزين المحلي
export function loadAuditFromStorage() {
  try {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        currentAudit.id = parsed.id || currentAudit.id;
        currentAudit.branchName = parsed.branchName || currentAudit.branchName;
        currentAudit.auditorName = parsed.auditorName || currentAudit.auditorName;
        currentAudit.weekNumber = parsed.weekNumber || currentAudit.weekNumber;
        currentAudit.auditDate = parsed.auditDate || currentAudit.auditDate;
        currentAudit.sections = Array.isArray(parsed.sections) ? parsed.sections : [];
      } else {
        currentAudit.sections = [];
      }
    } else {
      currentAudit.sections = [];
      saveAuditToStorage();
    }
  } catch (e) {
    currentAudit.sections = [];
  }
  if (!Array.isArray(currentAudit.sections)) {
    currentAudit.sections = [];
  }
  return currentAudit;
}

// تصدير الحالة لدوال النطاق العام (Global Scope Protection)
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
  window.currentAudit = currentAudit;
  window.metadataCache = metadataCache;
  window.modalState = modalState;
  window.STATUS_MAP = STATUS_MAP;
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
}
