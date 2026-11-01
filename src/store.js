/**
 * SAMX-VM Core Data & State Store
 * Version: 1.3.0
 * Architecture: Modular Local-First ES Module
 */

export const APP_VERSION = '1.3.0';

// مفاتيح التخزين المحلي الصريحة (LocalStorage Keys)
export const APP_STORAGE_KEY = 'samx_vm_active_audit';
export const STORAGE_KEY_BRANCHES = 'samx_branches_clean_v1';
export const STORAGE_KEY_SPECIALISTS = 'samx_specialists_clean_v1';
export const LEGACY_BRANCHES_KEY = 'samx_branches';
export const LEGACY_SPECIALISTS_KEY = 'samx_specialists';

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

// معايير التدقيق الميداني المعتمدة حسب كل قسم (Dynamic VM Category Checklists)
export const VM_CATEGORY_CHECKLISTS = {
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

// بيانات تجريبية احترافية للملابس والتجزئة الفاخرة
export const SAMPLE_DEMO_DATA = [
  {
    id: 'sec_demo_1',
    title: 'الواجهة الرئيسية والمانيكانات (Window Display)',
    status: 'resolved',
    beforeImg: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=75',
    afterImg: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=75',
    tags: ['تبديل طقم المانيكان', 'توجيه وزوايا الإضاءة'],
    checklist: [
      'سلامة ونظافة المانيكان وضبط التثبيت والوقفة',
      'تطبيق قصة الألوان المعتمدة للواجهة (Color Story)',
      'توجيه زوايا الإضاءة والسبوت لايت (45 درجة)'
    ],
    notes: 'تم استبدال المعروض على مانيكانات الواجهة الرئيسية بأطقم الكولكشن الشتوي الفاخر، وضبط كشافات الإضاءة بزاوية 45 درجة لإبراز خامة الصوف وإزالة الظلال العاتمة.'
  },
  {
    id: 'sec_demo_2',
    title: 'طاولات العرض المركزية والجدوال (Folded Tables / Gondolas)',
    status: 'store_followup',
    actionAssignee: 'مدير المعرض (خالد)',
    actionDueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    beforeImg: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=800&auto=format&fit=crop&q=75',
    afterImg: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=75',
    tags: ['تناسق الألوان (Color Story)', 'ترتيب تسلسل المقاسات', 'إعادة طي وترتيب الطاولات'],
    checklist: [
      'تطبيق معيار مقاس الطي المعتمد (Folding Board)',
      'تدرج الألوان الأفقي والعمودي على الطاولة (Color Balance)',
      'ترتيب مقاسات الأكوام تصاعدياً من الأعلى للأسفل'
    ],
    notes: 'تمت إعادة طي القمصان وفق معايير مقاس الطي المعتمد (Folding Board)، وتنسيق تدرج الألوان من الفاتح إلى الكحلي الداكن مع ترتيب المقاسات تصاعدياً من S إلى XXL. يلزم متابعة تعبئة النواقص.'
  },
  {
    id: 'sec_demo_3',
    title: 'قسم الثياب البيضاء (White Thobes)',
    status: 'management_action',
    actionAssignee: 'فريق الصيانة المركزية',
    actionDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    beforeImg: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=75',
    afterImg: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=75',
    tags: ['ترتيب تسلسل المقاسات', 'توحيد اتجاه المعاليق', 'صيانة الإضاءة'],
    checklist: [
      'تسلسل وترتيب المقاسات تصاعدياً (Size Sequence)',
      'توحيد اتجاه ونوعية المعاليق (Hanger Consistency)',
      'دقة بطاقات الأسعار والأكواد التعريفية على الياقة'
    ],
    notes: 'تم فرز الثياب البيضاء وتنسيق المعاليق الموحدة وترتيب المقاسات تصاعدياً، مع رفع طلب صيانة عاجل لوحدة إضاءة المسار العلوية المطفأة.'
  }
];

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
  cardViewModes: {} // secId -> 'sideBySide' | 'slider'
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

// قراءة الفروع والأخصائيين من التخزين المحلي النظيف (Clean Storage)
export async function loadMetadata() {
  try {
    let branches = [];
    let specialists = [];

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

    metadataCache.branches = branches;
    metadataCache.specialists = specialists;
    localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branches));
    localStorage.setItem(STORAGE_KEY_SPECIALISTS, JSON.stringify(specialists));

    metadataCache.lastSyncedAt = new Date().toISOString();
    return { branches, specialists };
  } catch (err) {
    console.error('loadMetadata error:', err);
    metadataCache.branches = [];
    metadataCache.specialists = [];
    return { branches: [], specialists: [] };
  }
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
        currentAudit.sections = Array.isArray(parsed.sections) ? parsed.sections : [...SAMPLE_DEMO_DATA];
      } else {
        currentAudit.sections = [...SAMPLE_DEMO_DATA];
      }
    } else {
      currentAudit.sections = [...SAMPLE_DEMO_DATA];
      saveAuditToStorage();
    }
  } catch (e) {
    currentAudit.sections = [...SAMPLE_DEMO_DATA];
  }
  if (!Array.isArray(currentAudit.sections)) {
    currentAudit.sections = [...SAMPLE_DEMO_DATA];
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
  window.SAMPLE_DEMO_DATA = SAMPLE_DEMO_DATA;
  window.getBranches = getBranches;
  window.getSpecialists = getSpecialists;
  window.addBranchItem = addBranchItem;
  window.deleteBranchItem = deleteBranchItem;
  window.addSpecialistItem = addSpecialistItem;
  window.deleteSpecialistItem = deleteSpecialistItem;
  window.saveAuditToStorage = saveAuditToStorage;
  window.loadAuditFromStorage = loadAuditFromStorage;
  window.loadMetadata = loadMetadata;
}
