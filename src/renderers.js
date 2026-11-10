/**
 * SAMX-VM UI Renderers Layer
 * Version: 1.7.0
 * Architecture: Decoupled UI Rendering Routines
 */

import {
  currentAudit,
  metadataCache,
  modalState,
  STATUS_MAP,
  VM_CATEGORY_CHECKLISTS,
  calculateReadinessScore,
  getBranches,
  getSpecialists,
  getStoreSections,
  getSectionStandards,
  getQuickTags,
  getQuickAssignees,
  getBrandingSettings,
  saveAuditToStorage,
  getArchivedAudits,
  getArchivedAuditById,
  deleteArchivedAudit,
  getSectionStatuses,
  getSectionSubOptions,
  STORAGE_KEY_USERS_REGISTRY
} from './store.js';

import { getActiveAuthSession } from './auth.js';

/**
 * دالة تعقيم وتطهير النصوص المؤسسية لمنع ظهور أي رموز أو نصوص طفيلية مثل sam أو undefined
 */
export function sanitizeCorporateText(val, fallback = '') {
  if (!val || typeof val !== 'string') return fallback;
  const clean = val.trim();
  if (!clean || /^(sam|samx|undefined|null|test|demo|nan)$/i.test(clean)) {
    return fallback;
  }
  return clean;
}

/**
 * دالة مساعدة لتفكيك الملاحظات والمبررات الميدانية إلى قائمة نقاط رأسية متسلسلة ونقية
 */
export function parseJustificationNotes(notes) {
  if (!notes || !notes.trim()) {
    return [];
  }

  const raw = notes.trim();

  // 1. تقسيم وفق الأسطر المتعددة
  if (raw.includes('\n')) {
    const lines = raw.split('\n')
      .map(line => line.replace(/^[\s•\-\*✓▪\d\.\)\-–—\s]+/, '').trim())
      .filter(line => line.length > 0);
    if (lines.length > 0) return lines;
  }

  // 2. تقسيم وفق علامات التعداد النقطي الشائعة (• أو - أو *)
  if (/[•\*]|\s[-–—]\s/.test(raw)) {
    const parts = raw.split(/[•\*]|\s[-–—]\s/)
      .map(p => p.replace(/^[\s•\-\*✓▪\d\.\)\-–—\s]+/, '').trim())
      .filter(p => p.length > 0);
    if (parts.length > 0) return parts;
  }

  // 3. تقسيم وفق الجمل المنتهية بنقطة
  if (raw.includes('. ') || raw.includes('.\n')) {
    const sentences = raw.split(/\.\s+|\.\n+/)
      .map(s => s.replace(/^[\s•\-\*✓▪\d\.\)\-–—\s]+/, '').trim())
      .filter(s => s.length > 0);
    if (sentences.length > 1) return sentences;
  }

  // 4. تقسيم وفق الفواصل إذا كان النص مركباً وطويلاً
  if (raw.includes('، ') && raw.length > 75) {
    const clauses = raw.split(/،\s+/)
      .map(c => c.replace(/^[\s•\-\*✓▪\d\.\)\-–—\s]+/, '').trim())
      .filter(c => c.length > 0);
    if (clauses.length > 1) return clauses;
  }

  return [raw];
}

/**
 * دالة ذكية لتوليد تفاصيل ومبررات التعديل الميداني مخصصة وديناميكية لكل قسم
 * وفق المعايير المحددة (Checklist) ونوع القسم (Category/Title) وحالة الإجراء (Status)
 */
export function getDynamicJustifications(sec) {
  const rawNotes = (sec && sec.notes) ? sec.notes.trim() : '';
  const isGenericBoilerplate = !rawNotes || 
    rawNotes.includes('تم التنفيذ والتعديل الميداني وفق المعايير المعتمدة بدليل العرض والتنسيق التجاري') ||
    rawNotes.includes('التأكد من سلامة وتناسق واجهات العرض وتركيز الإضاءة وزوايا التوجيه');

  if (rawNotes && !isGenericBoilerplate) {
    const userLines = parseJustificationNotes(rawNotes);
    if (userLines && userLines.length > 0) {
      return userLines;
    }
  }

  const result = [];
  const checklist = Array.isArray(sec?.checklist) ? sec.checklist : [];
  const title = (sec?.title || '').toLowerCase();

  // 1. استخراج نقاط من المعايير المطبقة المحددة في القسم
  if (checklist.length > 0) {
    checklist.forEach(item => {
      const lower = item.toLowerCase();
      if ((lower.includes('لون') || lower.includes('color')) && result.length < 3) {
        result.push('تطبيق قصة الألوان المعتمدة وإعادة تدفق التدرج اللوني لخلق انسيابية بصرية متناسقة.');
      } else if ((lower.includes('مانيكان') || lower.includes('وقفة') || lower.includes('تثبيت')) && result.length < 3) {
        result.push('تنسيق وتبديل أطقم المانيكانات وضبط زوايا التثبيت لعكس أحدث القطع الترويجية بالصدارة.');
      } else if ((lower.includes('إضاءة') || lower.includes('سبوت') || lower.includes('light')) && result.length < 3) {
        result.push('إعادة توجيه وزوايا كشافات الإضاءة وتركيز السبوت لايت مباشرة نحو المنتجات البطلة.');
      } else if ((lower.includes('مقاس') || lower.includes('size')) && result.length < 3) {
        result.push('إعادة ترتيب تسلسل المقاسات تصاعدياً وفرز الأكواد لضمان سلاسة وسرعة وصول العميل للمقاس المطلوب.');
      } else if ((lower.includes('طي') || lower.includes('طاول') || lower.includes('fold') || lower.includes('ارتفاع')) && result.length < 3) {
        result.push('تطبيق معيار الطي القياسي وتوحيد ارتفاعات أكوام الملابس وتناسقها البصري على طاولات العرض.');
      } else if ((lower.includes('معاليق') || lower.includes('شماع') || lower.includes('hanger')) && result.length < 3) {
        result.push('توحيد اتجاه ونوعية المعاليق وضبط مسافات التباعد القياسية لتحقيق سهولة التصفح.');
      } else if ((lower.includes('سعر') || lower.includes('posm') || lower.includes('عرض') || lower.includes('لافت')) && result.length < 3) {
        result.push('مراجعة وتحديث بطاقات الأسعار ولوحات الحملة الترويجية (POSM) وضمان وضوحها وتمركزها المعتمد.');
      } else if ((lower.includes('نظاف') || lower.includes('تلميع') || lower.includes('فترين') || lower.includes('كوي')) && result.length < 3) {
        result.push('العناية بنظافة وتلميع واجهات العرض وكوي القطع وتجهيزها خالية من أي تجاعيد أو شوائب.');
      } else if ((lower.includes('نواقص') || lower.includes('تعبئة') || lower.includes('مخزون')) && result.length < 3) {
        result.push('تعبئة النواقص وتوفير المقاسات الأساسية على الأرفف لتعزيز جاهزية المعرض البيعية.');
      }
    });
  }

  // 2. إذا كانت النقاط أقل من 2، استكمالها بناءً على المسمى والقسم (Department Context)
  if (result.length < 2) {
    if (title.includes('واجه') || title.includes('مانيكان') || title.includes('window')) {
      if (!result.some(r => r.includes('الواجهة'))) {
        result.push('إعادة هندسة الواجهة الرئيسية وتوزيع نقاط الجذب البصري لإبراز فخامة العلامة التجارية.');
      }
      if (!result.some(r => r.includes('الإضاءة'))) {
        result.push('ضبط زوايا الإضاءة الهالوجينية لتركيز النظر على التشكيلة الموسمية المعروضة.');
      }
    } else if (title.includes('أبيض') || title.includes('بيضاء') || title.includes('white')) {
      result.push('فرز وتنسيق الثياب البيضاء وفق تسلسل المقاسات وتوحيد درجات البياض وخامات الأقمشة.');
      result.push('ضبط اتساق المعاليق وكوي الياقات والصدور لضمان الظهور بأعلى معايير الأناقة الرسمية.');
    } else if (title.includes('ملون') || title.includes('شباب') || title.includes('color')) {
      result.push('ترتيب تشكيلة الثياب الملونة وفق قاعدة التدرج اللوني مع إبراز القصات العصرية في الواجهة.');
      result.push('التحقق من اكتمال سلسلة المقاسات للقطع الأكثر طلباً ومطابقة لوحات الأسعار.');
    } else if (title.includes('شماغ') || title.includes('غتر') || title.includes('مستلزم') || title.includes('headgear')) {
      result.push('تنظيم وترتيب فترينات الأشمغة والغتر حسب الماركات الرسمية والمقاسات المعتمدة.');
      result.push('تنسيق الإكسسوارات المرافقة (العقال والطواقي) وتلميع واجهات العرض الزجاجية.');
    } else if (title.includes('عطر') || title.includes('نظار') || title.includes('perfume')) {
      result.push('تنظيم منصات العطور والنظارات وتجهيز عبوات التجربة (Testers) ومرايا الفحص.');
      result.push('ضبط الإضاءة الموجهة وإبراز التغليف الفاخر للمجموعات العطرية الحصرية.');
    } else if (title.includes('حذاء') || title.includes('أحذية') || title.includes('footwear')) {
      result.push('توجيه فردة الحذاء اليمنى بزاوية العرض المعتمدة وترتيب تسلسل الموديلات والألوان.');
      result.push('التأكد من نظافة منصات العرض وتوفر المقاسات القياسية المخصصة للتجربة.');
    } else if (title.includes('داخل') || title.includes('ولادي') || title.includes('kid') || title.includes('underwear')) {
      result.push('ترتيب مقاسات القطنيات والملابس الداخلية وتوحيد واجهة العلب المغلفة على الرفوف.');
      result.push('تنظيم قسم الأطفال حسب الفئات العمرية مع إبراز جداول المقاسات التوضيحية.');
    } else if (title.includes('طاول') || title.includes('جندول') || title.includes('table') || title.includes('gondola')) {
      result.push('تطبيق تقنية الطي الموحد وتنسيق الأكوام بارتفاعات متناغمة تعكس التوازن البصري.');
      result.push('تثبيت حوامل الأسعار الأكريليكية بوضوح أمام كل كومة لعرض بيانات المنتج بدقة.');
    } else if (title.includes('مستودع') || title.includes('مخزن') || title.includes('stock')) {
      result.push('تصنيف وتنظيم ممرات المخزون الخلفي وترتيب الكراتين لتسهيل وتيرة السحب والتغذية.');
      result.push('إخلاء ممرات الحركة وتأمين سهولة الوصول للمقاسات الحيوية لصالة العرض.');
    } else {
      result.push('إعادة تنظيم وتنسيق المنتجات بالقسم وفق معايير الهوية التجارية وأدلة الـ VM المعتمدة.');
      result.push('تحسين الرؤية البصرية للعميل وضمان سهولة التصفح والوصول المباشر للمنتجات.');
    }
  }

  // 3. إضافة بند متعلق بالإجراء أو التكليف
  if (sec?.status === 'store_followup') {
    result.push(`تكليف إدارة المعرض (${sec.actionAssignee || 'مدير المعرض'}) بمتابعة استكمال متطلبات القسم في الموعد المحدد.`);
  } else if (sec?.status === 'management_action') {
    result.push(`رفع طلب الصيانة والتدخل الإداري (${sec.actionAssignee || 'فريق الصيانة والتشغيل'}) لمعالجة الملاحظة فورياً.`);
  } else if (result.length < 2) {
    result.push('اكتمال التعديل الميداني الفوري وضبط معايير العرض.');
  }

  const unique = Array.from(new Set(result));
  return unique.slice(0, 3);
}

/**
 * صياغة إنجاز الـ VM الميداني بلغة احترافية وأفعال إنجاز بشرية
 */
export function formatArabicVmAction(actionSnippet) {
  if (!actionSnippet || typeof actionSnippet !== 'string') {
    return 'تمت إعادة ترتيب وتنسيق المعروضات وفق معايير الهوية البصرية';
  }

  let text = actionSnippet
    .replace(/^[\[\(\s]+|[\]\)\s]+$/g, '')
    .replace(/^إنجاز التعديل الميداني الفوري\s*[:\-\s]*/g, '')
    .replace(/^التعديل الميداني الفوري\s*[:\-\s]*/g, '')
    .replace(/\s*واعتماد التنسيق النهائي للموقع(\s*بصورة معتمدة)?\s*\.?/g, '')
    .replace(/\s*واعتماد التنسيق\s*\.?$/g, '')
    .replace(/[:\.\s]+$/g, '')
    .trim();

  if (!text) {
    return 'تمت إعادة ترتيب وتنسيق المعروضات وفق معايير الهوية البصرية';
  }

  // إذا كانت العبارة تبدأ بالفعل بفعل ماضٍ مثل "تم" أو "تمت"
  if (/^تم[ت]?\s+/.test(text)) {
    return text;
  }

  // تحويل المصادر الشائعة إلى أفعال إنجاز احترافية
  if (/^سلامة\s+ونظافة\s+المانيكان/.test(text)) {
    return 'تم ضبط ونظافة المانيكانات والتأكد من استقامة الوقفة والتثبيت';
  }
  if (/^نظافة\s+وضبط\s+المانيكان/.test(text)) {
    return 'تم ضبط ونظافة المانيكانات وضبط زوايا التثبيت';
  }
  if (/^نقل\s+/.test(text)) {
    return 'تم نقل وإعادة تهيئة ' + text.replace(/^نقل\s+/, '');
  }
  if (/^إحلال\s+/.test(text)) {
    return 'تم إحلال وتنسيق ' + text.replace(/^إحلال\s+/, '');
  }
  if (/^توحيد\s+/.test(text)) {
    return 'تم توحيد فئات وعرض ' + text.replace(/^توحيد\s+/, '');
  }
  if (/^إعادة\s+تنسيق\s+/.test(text)) {
    return 'تمت إعادة تنسيق وترتيب ' + text.replace(/^إعادة\s+تنسيق\s+/, '');
  }
  if (/^إعادة\s+ترتيب\s+/.test(text)) {
    return 'تمت إعادة ترتيب وتنسيق ' + text.replace(/^إعادة\s+ترتيب\s+/, '');
  }
  if (/^إعادة\s+/.test(text)) {
    return 'تمت ' + text;
  }
  if (/^تنسيق\s+/.test(text)) {
    return 'تمت إعادة ترتيب وتنسيق ' + text.replace(/^تنسيق\s+/, '');
  }
  if (/^ترتيب\s+/.test(text)) {
    return 'تم ترتيب وتنسيق ' + text.replace(/^ترتيب\s+/, '');
  }
  if (/^ضبط\s+/.test(text)) {
    return 'تم ضبط وتحسين ' + text.replace(/^ضبط\s+/, '');
  }
  if (/^مراجعة\s+/.test(text)) {
    return 'تمت مراجعة وضبط ' + text.replace(/^مراجعة\s+/, '');
  }
  if (/^تطبيق\s+/.test(text)) {
    return 'تم تطبيق ' + text.replace(/^تطبيق\s+/, '');
  }
  if (/^معالجة\s+/.test(text)) {
    return 'تمت معالجة وضبط ' + text.replace(/^معالجة\s+/, '');
  }
  if (/^تعديل\s+/.test(text)) {
    return 'تم تعديل وتنسيق ' + text.replace(/^تعديل\s+/, '');
  }
  if (/^تحسين\s+/.test(text)) {
    return 'تم تحسين وتطوير ' + text.replace(/^تحسين\s+/, '');
  }
  if (/^إبراز\s+/.test(text)) {
    return 'تم إبراز وتنسيق ' + text.replace(/^إبراز\s+/, '');
  }
  if (/^تجديد\s+/.test(text)) {
    return 'تم تجديد وترتيب ' + text.replace(/^تجديد\s+/, '');
  }
  if (/^توزيع\s+/.test(text)) {
    return 'تم توزيع وتنظيم ' + text.replace(/^توزيع\s+/, '');
  }

  return 'تم إنجاز ' + text;
}

/**
 * دالة مساعدة لتنقية نصوص نقاط الملخص من أي عبارات نمطية وأقواس أو فواصل زائدة
 */
export function cleanSummaryPointText(line) {
  if (!line || typeof line !== 'string') return '';
  let str = line.replace(/^[\s•\-\*✓▪\d\.\)\-–—\s]+/, '').trim();

  // 1. تنظيف وإزالة عبارة "(معالجة كاملة 100%)" و "(معالجة كاملة)" وكافة لواحقها من الملخص
  str = str.replace(/\s*\(\s*معالجة كاملة(\s*100%?)?\s*\)/g, '');
  str = str.replace(/\s*معالجة كاملة\s*\(?100%?\)?/g, '');
  str = str.replace(/\(\s*([^\)]*?)\s*\(\s*([^)]*?)\s*\)\s*([^\)]*?)\)/g, '($1 $2 $3)');
  str = str.replace(/\(\s*([^()]*?)\s*\(\s*(\d+%?)\s*\)\s*([^()]*?)\)/g, '($1 $2 $3)');

  // 2. إزالة العبارات التكرارية والنمطية مثل "إنجاز التعديل الميداني الفوري"
  str = str.replace(/إنجاز التعديل الميداني الفوري\s*[:\-\s]*/g, '');
  str = str.replace(/التعديل الميداني الفوري\s*[:\-\s]*/g, '');
  str = str.replace(/\s*واعتماد التنسيق النهائي للموقع(\s*بصورة معتمدة)?\s*\.?/g, '');
  str = str.replace(/\s*واعتماد التنسيق\s*\.?$/g, '');

  // 3. إزالة الأقواس المربعة حول اسم القسم في البداية وتنظيف النقطتين والرموز
  str = str.replace(/^\[\s*([^\]:]+?)\s*[:\s]*\]\s*[:\s]*/, '$1: ');
  str = str.replace(/^\[\s*([^\]]+?)\s*\]\s*[:\s]*/, '$1: ');
  str = str.replace(/^([^:]+?)\s*[:\.]+\s*:\s*/, '$1: ');
  str = str.replace(/:\s*\./g, ':');

  // 4. إزالة الأقواس الدائرية حول وصف الإجراء العام في النهاية (مثل (الإجراء.))
  str = str.replace(/\(\s*([^\)]+?)\s*\)\s*\.?$/, '$1.');

  // 5. إزالة تكرار النقطتين أو النقاط أو الفواصل الزائدة
  str = str.replace(/:\s*:\s*/g, ': ');
  str = str.replace(/\s*:\s*/g, ': ');
  str = str.replace(/\.{2,}/g, '.');
  str = str.replace(/\s+/g, ' ');

  // 6. ضبط النقطة الختامية
  str = str.replace(/\s*\.\s*$/, '').trim();
  if (str) {
    str = str + '.';
  }

  return str;
}

/**
 * دالة لتنسيق نقطة الملخص كعنصر HTML يبرز اسم القسم والتكليفات الموجهة للفرع/الصيانة
 */
export function formatSummaryPointHtml(point) {
  const cleaned = cleanSummaryPointText(point);
  const colonIdx = cleaned.indexOf(':');
  
  let titleHtml = '';
  let body = cleaned;

  if (colonIdx > 0 && colonIdx < 60) {
    let title = cleaned.substring(0, colonIdx).trim();
    title = title.replace(/[:\.\s]+$/, '');
    titleHtml = `<strong class="font-black text-slate-950">${title}:</strong> `;
    body = cleaned.substring(colonIdx + 1).trim();
  }

  // تحويل تكليفات المتابعة للفرع إلى كبسولة مميزة وأنيقة
  body = body.replace(/—\s*\[(تكليف متابعة[^\]]+)\]/g, (match, content) => {
    return `<span class="inline-block text-amber-900 bg-amber-50/90 border border-amber-300/80 px-1.5 py-0.5 rounded text-[0.88em] font-bold mr-1 align-baseline shadow-xs">${content}</span>`;
  });

  // تحويل طلبات الصيانة والإدارة إلى كبسولة مميزة وأنيقة
  body = body.replace(/—\s*\[(طلب صيانة[^\]]+)\]/g, (match, content) => {
    return `<span class="inline-block text-rose-900 bg-rose-50/90 border border-rose-300/80 px-1.5 py-0.5 rounded text-[0.88em] font-bold mr-1 align-baseline shadow-xs">${content}</span>`;
  });

  return `${titleHtml}<span class="font-medium text-slate-800">${body}</span>`;
}

/**
 * دالة ذكية لتجميع ملخص إنجازات وتعديلات الزيارة الميدانية تلقائياً من أقسام الجولة الموثقة
 * تدمج الحالات المتعددة لنفس القسم في نقطة واحدة مرقمة مع صياغة بشرية ناطقة بالإنجاز الفعلي
 */
export function aggregateVisitAchievements(audit = null) {
  const activeAudit = audit || currentAudit;
  const sections = (activeAudit && Array.isArray(activeAudit.sections)) ? activeAudit.sections : [];

  if (sections.length === 0) {
    return [
      'الواجهات ونقاط الجذب: تمت مراجعة جاهزية الواجهات الرئيسية وتطبيق معايير الهوية البصرية المعتمدة.',
      'التنسيق التجاري: تم توحيد فئات العرض وضبط اتساق وتوزيع نقاط الجذب وفق الأدلة المعتمدة.'
    ];
  }

  const points = [];

  sections.forEach((sec, idx) => {
    let cleanTitle = sec.title ? sec.title.replace(/\s*\([^)]*\)/g, '').trim() : `القسم ${idx + 1}`;
    cleanTitle = cleanTitle.replace(/^[\[\(\s]+|[\]\)\:\.\s]+$/g, '').trim();

    const checklist = Array.isArray(sec.checklist) ? sec.checklist : [];
    const tags = Array.isArray(sec.tags) ? sec.tags : [];

    let actionSnippet = '';
    if (checklist.length > 0) {
      actionSnippet = checklist[0];
    } else if (tags.length > 0) {
      actionSnippet = tags.join('، ');
    } else {
      const justs = getDynamicJustifications(sec);
      actionSnippet = justs.length > 0 ? justs[0] : 'تنسيق وترتيب المعروضات وفق معايير الهوية';
    }

    // صياغة إنجاز الـ VM الميداني بلغة احترافية وأفعال إنجاز بشرية
    let vmAccomplishment = formatArabicVmAction(actionSnippet);

    const statuses = getSectionStatuses(sec);
    const rawResolvedSubs = getSectionSubOptions(sec, 'resolved');
    const followupSubs = getSectionSubOptions(sec, 'store_followup');
    const mgmtSubs = getSectionSubOptions(sec, 'management_action');

    // استبعاد الخيار الافتراضي (معالجة كاملة 100%) نهائياً من أي نص
    const resolvedSubs = rawResolvedSubs.filter(s => s !== 'معالجة كاملة 100%' && s !== 'معالجة كاملة' && !s.includes('100%'));

    if (resolvedSubs.length > 0) {
      vmAccomplishment += ` (تنفيذ ميداني - ${resolvedSubs.join('، ')})`;
    }

    // بناء تكليفات المتابعة لإدارة المعرض وطلبات الصيانة بوضوح تام يفصل إنجاز الـ VM عن مهام الفرع
    let branchClause = '';
    if (statuses.includes('store_followup')) {
      const followupDetail = followupSubs.length > 0 ? followupSubs.join('، ') : 'استكمال الجاهزية والنواقص';
      const assignee = (sec.actionAssignee && sec.actionAssignee.trim()) ? sec.actionAssignee.trim() : 'إدارة المعرض';
      branchClause = ` — [تكليف متابعة لـ ${assignee}: ${followupDetail}]`;
    }

    let mgmtClause = '';
    if (statuses.includes('management_action')) {
      const mgmtDetail = mgmtSubs.length > 0 ? mgmtSubs.join('، ') : 'متابعة الصيانة والتوريد';
      mgmtClause = ` — [طلب صيانة/إدارة: ${mgmtDetail}]`;
    }

    const fullPoint = `${cleanTitle}: ${vmAccomplishment}${branchClause}${mgmtClause}.`;
    points.push(cleanSummaryPointText(fullPoint));
  });

  return points;
}

/**
 * دالة دقيقة لتفكيك سطور ملخص الزيارة الميدانية مع الحفاظ التام على ما كتبه المستخدم وتطهير أي لواحق مكررة
 */
export function parseVisitSummaryPoints(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return [];
  return text.split('\n')
    .map(line => cleanSummaryPointText(line))
    .filter(line => line.length > 0);
}

/**
 * الحصول على قائمة نقاط ملخص الزيارة الفعلية (سواء كانت معدلة يدوياً من الأخصائي أو مجمعة تلقائياً)
 */
export function getEffectiveVisitSummary(audit = null) {
  const activeAudit = audit || currentAudit;
  const custom = (activeAudit && typeof activeAudit.visitSummary === 'string') ? activeAudit.visitSummary.trim() : '';
  
  if (custom) {
    const parsed = parseVisitSummaryPoints(custom);
    if (parsed.length > 0) return parsed;
  }
  
  return aggregateVisitAchievements(activeAudit);
}

// توليد شارات الحالة الملونة الموحدة مع الخيارات الفرعية الذكية
export function getStatusBadgeHtml(secOrStatus, isPrint = false) {
  // إذا تم تمرير كائن قسم sec
  if (secOrStatus && typeof secOrStatus === 'object') {
    const sec = secOrStatus;
    const statuses = getSectionStatuses(sec);
    return statuses.map(st => renderSingleStatusBadge(st, sec, isPrint)).join(' ');
  }

  // إذا تم تمرير مفتاح حالة مفرد string
  return renderSingleStatusBadge(secOrStatus || 'resolved', null, isPrint);
}

function renderSingleStatusBadge(statusKey, sec = null, isPrint = false) {
  const cfg = STATUS_MAP[statusKey] || STATUS_MAP.resolved;
  const rawSubOptions = sec ? getSectionSubOptions(sec, statusKey) : [];
  
  // تصفية المعالجة الكاملة الافتراضية 100% ليبقى فقط تم المعالجة ميدانياً
  const subOptions = (statusKey === 'resolved')
    ? rawSubOptions.filter(s => s !== 'معالجة كاملة 100%' && s !== 'معالجة كاملة' && !s.includes('100%'))
    : rawSubOptions;
  const hasSub = subOptions.length > 0;

  // صياغة النص المدمج مع الخيارات الفرعية الذكية
  let displayText = '';
  if (statusKey === 'resolved') {
    displayText = hasSub ? `تم المعالجة ميدانياً: ${subOptions.join('، ')}` : (isPrint ? 'تم المعالجة ميدانياً ✅' : 'تم المعالجة ميدانياً ✅');
  } else if (statusKey === 'store_followup') {
    displayText = hasSub ? `متابعة الفرع: ${subOptions.join('، ')}` : (isPrint ? 'متابعة الفرع ⏳' : 'متابعة الفرع ⏳');
  } else if (statusKey === 'management_action') {
    displayText = hasSub ? `تتطلب صيانة/إدارة: ${subOptions.join('، ')}` : (isPrint ? 'طلب صيانة / إدارة ⚠️' : 'طلب صيانة / إدارة ⚠️');
  } else {
    displayText = isPrint ? cfg.label : cfg.shortLabel;
  }

  const css = isPrint ? cfg.printBadgeClass : cfg.badgeClass;
  return `<span class="${css} text-[10px] md:text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5 shrink-0 shadow-sm font-bold select-none" dir="rtl">
    <span>${displayText}</span>
  </span>`;
}

// عرض الإشعارات السريعة (Toasts)
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  
  let borderCol = 'border-gold-500/40 text-gold-300 bg-corp-900/95';
  let icon = 'info';
  if (type === 'success') {
    borderCol = 'border-emerald-500/50 text-emerald-200 bg-emerald-950/90 shadow-emerald-900/40';
    icon = 'sparkles';
  } else if (type === 'error') {
    borderCol = 'border-rose-500/50 text-rose-200 bg-rose-950/90 shadow-rose-900/40';
    icon = 'alert-circle';
  }

  toast.className = `border ${borderCol} px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-auto backdrop-blur-md transition-all duration-300 transform animate-in slide-in-from-top-2`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 shrink-0 text-emerald-400"></i>
    <span class="tracking-wide">${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px) scale(0.95)';
    setTimeout(() => {
      if (typeof toast.remove === 'function') {
        toast.remove();
      } else if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2200);
}

// إشعار تأكيد فوري ومباشر داخل النافذة المنبثقة
export function showModalInlineFeedback(text, type = 'success') {
  let feedback = document.getElementById('management-inline-feedback');
  if (!feedback) {
    feedback = document.getElementById('modal-inline-feedback');
  }
  if (!feedback) {
    const modalBody = document.querySelector('#management-modal .overflow-y-auto') || document.querySelector('#management-modal');
    if (modalBody) {
      feedback = document.createElement('div');
      feedback.id = 'management-inline-feedback';
      modalBody.insertBefore(feedback, modalBody.firstChild);
    }
  }
  if (!feedback) return;

  let bgClass = 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200';
  let iconName = 'check-circle-2';
  if (type === 'error') {
    bgClass = 'bg-rose-950/90 border-rose-500/60 text-rose-200';
    iconName = 'alert-triangle';
  } else if (type === 'loading') {
    bgClass = 'bg-amber-950/90 border-amber-500/60 text-amber-200';
    iconName = 'loader-2';
  } else if (type === 'info') {
    bgClass = 'bg-sky-950/90 border-sky-500/60 text-sky-200';
    iconName = 'info';
  }

  feedback.className = `p-2.5 my-2 border ${bgClass} text-xs font-bold rounded-xl text-center shadow-lg transition-all duration-300 flex items-center justify-center gap-2`;
  feedback.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0 ${type === 'loading' ? 'animate-spin' : ''}"></i>
    <span>${text}</span>
  `;
  feedback.style.display = 'flex';
  feedback.style.opacity = '1';
  feedback.classList.remove('hidden');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }

  if (window._feedbackTimeout) clearTimeout(window._feedbackTimeout);
  if (type !== 'loading') {
    window._feedbackTimeout = setTimeout(() => {
      if (feedback) {
        feedback.style.opacity = '0';
        setTimeout(() => { 
          if (feedback) {
            feedback.style.display = 'none';
            feedback.classList.add('hidden');
          }
        }, 300);
      }
    }, 2800);
  }
}

// تحديث مؤشرات الأداء السريعة (KPIs)
export function updateKPIs() {
  const secCount = currentAudit.sections ? currentAudit.sections.length : 0;
  let photoCount = 0;
  let tagCount = 0;

  if (currentAudit.sections) {
    currentAudit.sections.forEach(s => {
      if (s.beforeImg) photoCount++;
      if (s.afterImg) photoCount++;
      tagCount += (s.tags || []).length;
    });
  }

  const kpiSec = document.getElementById('kpi-sections-count');
  if (kpiSec) kpiSec.innerText = secCount;

  const kpiPhoto = document.getElementById('kpi-photos-count');
  if (kpiPhoto) kpiPhoto.innerText = photoCount;

  const kpiTag = document.getElementById('kpi-tags-count');
  if (kpiTag) kpiTag.innerText = tagCount;

  const badgeTotal = document.getElementById('badge-total-items');
  if (badgeTotal) badgeTotal.innerText = `${secCount} أقسام`;

  const statusEl = document.getElementById('kpi-status-text');
  if (statusEl) {
    if (secCount === 0) {
      statusEl.innerText = 'بانتظار البدء';
      statusEl.className = 'text-xs font-bold text-slate-400 mt-1 inline-block';
    } else if (secCount < 3) {
      statusEl.innerText = 'توثيق مبدئي';
      statusEl.className = 'text-xs font-bold text-amber-400 mt-1 inline-block';
    } else {
      statusEl.innerText = 'جاهز للاعتماد';
      statusEl.className = 'text-xs font-bold text-emerald-400 mt-1 inline-block';
    }
  }
}

// مزامنة عروض تفاصيل المعرض في الهيدر والتقرير المطبوع وشريط سياق الجوال
export function syncQuickDisplays() {
  const branchDisplay = sanitizeCorporateText(currentAudit.branchName, 'فرع المعرض العام');
  const auditorDisplay = sanitizeCorporateText(currentAudit.auditorName, 'أخصائي العرض المرئي');

  const quickStore = document.getElementById('quick-store-name');
  if (quickStore) quickStore.innerText = branchDisplay;

  const quickDate = document.getElementById('quick-audit-date');
  if (quickDate) quickDate.innerText = currentAudit.auditDate || new Date().toISOString().split('T')[0];

  const quickWeek = document.getElementById('quick-audit-week');
  if (quickWeek) quickWeek.style.display = 'none';

  // تحديث شريط سياق الجولة النشطة المخصص للهواتف الذكية
  const mobileContextBranch = document.getElementById('mobile-context-branch');
  if (mobileContextBranch) mobileContextBranch.innerText = branchDisplay;

  const mobileContextWeek = document.getElementById('mobile-context-week');
  if (mobileContextWeek) mobileContextWeek.remove();

  const printStore = document.getElementById('print-header-store');
  if (printStore) printStore.innerText = branchDisplay;

  const printBranch = document.getElementById('print-header-branch');
  if (printBranch) printBranch.innerText = branchDisplay;

  const printDate = document.getElementById('print-header-date');
  if (printDate) printDate.innerText = currentAudit.auditDate || new Date().toISOString().split('T')[0];

  const printAuditor = document.getElementById('print-header-auditor');
  if (printAuditor) printAuditor.innerText = auditorDisplay;

  const printSign = document.getElementById('print-sign-auditor');
  if (printSign) printSign.innerText = auditorDisplay;

  const printSignBranch = document.getElementById('print-sign-branch');
  if (printSignBranch) printSignBranch.innerText = branchDisplay;

  const printCount = document.getElementById('print-header-count');
  if (printCount) printCount.innerText = (currentAudit.sections ? currentAudit.sections.length : 0) + ' أقسام';

  const printScore = document.getElementById('print-header-readiness-score');
  if (printScore) {
    const score = calculateReadinessScore(currentAudit);
    if ((currentAudit.sections || []).length === 0) {
      printScore.innerText = '—';
      printScore.className = 'font-black text-[10px] px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-300';
    } else {
      printScore.innerText = score.text;
      printScore.className = `font-black text-[10px] px-1.5 py-0.5 rounded border ${score.badgeClass}`;
    }
  }

  syncBrandingUI();
  updateKPIs();
}

// مزامنة الهوية البصرية وشعار الشركة مع عناصر التقرير
export function syncBrandingUI() {
  const branding = getBrandingSettings();

  // 1. شارة اسم الشركة في رأس تقرير الطباعة والمعاينة
  const badgeCompanyName = document.getElementById('print-badge-company-name');
  if (badgeCompanyName) {
    badgeCompanyName.innerText = branding.companyName || 'SAMX-VM';
  }

  // 2. العنوان الفرعي للتنسيق التجاري
  const headerSubtitle = document.getElementById('print-header-subtitle');
  if (headerSubtitle) {
    headerSubtitle.innerText = branding.companySubtitle || 'العرض المرئي والتنسيق التجاري';
  }

  // 3. الشعار الرسمي الموسط في الترويسة
  const printLogoImg = document.getElementById('print-header-logo-img');
  const logoContainer = document.getElementById('print-header-logo-container');
  if (printLogoImg) {
    printLogoImg.src = branding.logoData || '/assets/alshiak_logo_2x.png';
    printLogoImg.alt = branding.companyName || 'الشعار الرسمي';
  } else if (logoContainer) {
    logoContainer.innerHTML = `
      <img id="print-header-logo-img" src="${branding.logoData || '/assets/alshiak_logo_2x.png'}" alt="${branding.companyName || 'الشعار الرسمي'}" class="max-h-12 max-w-[210px] w-auto h-auto object-contain drop-shadow-sm" />
    `;
  }

  // 4. التذييل والملاحظات القانونية الرسمية مع التحكم بخيار الإظهار/الإخفاء
  const footerDisclaimer = document.getElementById('print-footer-disclaimer');
  const footerDisclaimerWrapper = document.getElementById('print-footer-disclaimer-wrapper');
  const showCompliance = branding.showFooterCompliance !== false;
  
  const toggleComplianceInput = document.getElementById('toggle-print-compliance');
  if (toggleComplianceInput) {
    toggleComplianceInput.checked = showCompliance;
  }

  if (footerDisclaimer) {
    if (showCompliance && branding.footerDisclaimer && branding.footerDisclaimer.trim()) {
      footerDisclaimer.innerText = branding.footerDisclaimer.trim();
      if (footerDisclaimerWrapper) footerDisclaimerWrapper.classList.remove('hidden');
    } else {
      footerDisclaimer.innerText = '';
      if (footerDisclaimerWrapper) footerDisclaimerWrapper.classList.add('hidden');
    }
  }

  // 5. رسم ملخص إنجازات وتعديلات الزيارة الميدانية
  renderVisitSummary();

  // 6. تحديث نافذة المعاينة الحية إن كانت مفتوحة
  updateBrandingLivePreview();
}

/**
 * رسم ملخص إنجازات وتعديلات الزيارة الميدانية في واجهة التقرير المطبوع والمعاينة
 * مع مقياس متكيف ديناميكياً يضمن احتواء حتى 15 قسماً في الصفحة الأولى دون أي انقسام
 */
export function renderVisitSummary() {
  const container = document.getElementById('print-visit-summary-list');
  const wrapper = document.getElementById('print-visit-summary-wrapper');
  const page1 = document.getElementById('print-page-1-container');
  const liveInput = document.getElementById('report-visit-summary-input');
  const liveCount = document.getElementById('visit-summary-live-count');
  if (!container) return;

  const points = getEffectiveVisitSummary(currentAudit);
  if (!points || points.length === 0) {
    if (wrapper) wrapper.classList.add('hidden');
    if (page1) page1.classList.add('no-summary');
    return;
  }

  if (wrapper) wrapper.classList.remove('hidden');
  if (page1) page1.classList.remove('no-summary');

  // مزامنة حقل الإدخال المباشر إذا لم يكن المستخدم يكتب فيه حالياً
  if (liveInput && document.activeElement !== liveInput) {
    liveInput.value = (currentAudit.visitSummary && currentAudit.visitSummary.trim())
      ? currentAudit.visitSummary.trim()
      : points.join('\n');
  }

  if (liveCount) {
    liveCount.innerText = `${points.length} نقاط`;
  }

  // حساب المقياس الديناميكي لحجم الخط والمسافات لاستيعاب حتى 15 قسماً في الصفحة الأولى دون أي تجاوز
  const count = points.length;
  let fontSize = '12px';
  let lineHeight = '1.45';
  let rowGap = '4mm';
  let badgeSize = 'w-4 h-4 text-[10px]';

  if (count <= 5) {
    fontSize = '12px';
    lineHeight = '1.45';
    rowGap = '4mm';
    badgeSize = 'w-4 h-4 text-[10px]';
  } else if (count <= 10) {
    fontSize = '11px';
    lineHeight = '1.35';
    rowGap = '2.5mm';
    badgeSize = 'w-3.5 h-3.5 text-[9px]';
  } else {
    // أكثر من 10 أقسام (حتى 15 قسماً)
    fontSize = '9.8px';
    lineHeight = '1.25';
    rowGap = '1.8mm';
    badgeSize = 'w-3 h-3 text-[8px]';
  }

  container.style.gap = rowGap;

  // إزالة البطاقات الصندوقية الضخمة (bulky boxes) واستبدالها بسطور خفيفة وأنيقة تمنع انقسام الصفحة تماماً
  container.innerHTML = points.map((pt, idx) => `
    <div class="print-break-inside-avoid flex items-start gap-2 py-0.5" style="page-break-inside: avoid; break-inside: avoid; font-size: ${fontSize}; line-height: ${lineHeight};">
      <span class="${badgeSize} rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-xs mt-0.5">
        ${idx + 1}
      </span>
      <div class="flex-1 text-right" dir="rtl">${formatSummaryPointHtml(pt)}</div>
    </div>
  `).join('');
}

// تحديث صندوق المعاينة الحية للهوية البصرية في نافذة الإعدادات
export function updateBrandingLivePreview(tempOverrides = null) {
  const branding = tempOverrides || getBrandingSettings();
  
  const previewLogo = document.getElementById('branding-preview-logo');
  const previewName = document.getElementById('branding-preview-name');
  const previewSub = document.getElementById('branding-preview-sub');
  const previewDisc = document.getElementById('branding-preview-disclaimer');

  if (previewName) {
    previewName.innerText = branding.companyName || 'SAMX-VM';
  }

  if (previewSub) {
    previewSub.innerText = branding.companySubtitle || 'العرض المرئي والتنسيق التجاري';
  }

  if (previewDisc) {
    previewDisc.innerText = branding.footerDisclaimer || 'تقرير تدقيق معتمد صادر من منصة العرض المرئي';
  }

  if (previewLogo) {
    if (branding.logoData) {
      previewLogo.innerHTML = `<img src="${branding.logoData}" alt="شعار الشركة" class="max-h-12 max-w-[130px] w-auto h-auto object-contain rounded" />`;
    } else {
      previewLogo.innerHTML = `
        <div class="w-10 h-10 rounded-lg bg-slate-900 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-sm">
          <span>SX</span>
        </div>
      `;
    }
  }
}

// تعبئة وتحديث القوائم المنسدلة في الشاشة الرئيسية
export function populateBranchSelect() {
  const branchSelect = document.getElementById('select-branch');
  if (!branchSelect) return;

  const activeUser = getActiveAuthSession();
  let branches = getBranches();

  // إذا كان المستخدم أخصائياً ولديه فروع محددة لا تشمل كافة الفروع (*)
  if (activeUser && activeUser.role === 'specialist' && Array.isArray(activeUser.assignedBranches) && !activeUser.assignedBranches.includes('*')) {
    const allowed = activeUser.assignedBranches;
    branches = branches.filter(b => {
      const name = typeof b === 'string' ? b : (b.name || '');
      return allowed.includes(name);
    });
  }

  if (branches.length === 0) {
    if (currentAudit.branchName) {
      branchSelect.innerHTML = `<option value="${currentAudit.branchName}" selected>${currentAudit.branchName}</option>`;
    } else {
      branchSelect.innerHTML = '<option value="">-- لا توجد فروع متاحة --</option>';
    }
    return;
  }

  const branchNames = branches.map(b => typeof b === 'string' ? b : (b.name || ''));

  if (!currentAudit.branchName && branchNames.length > 0) {
    currentAudit.branchName = branchNames[0];
  } else if (currentAudit.branchName && !branchNames.includes(currentAudit.branchName)) {
    // If not a restricted specialist, keep current audit branch as option
    if (!activeUser || activeUser.role === 'admin' || (activeUser.assignedBranches && activeUser.assignedBranches.includes('*'))) {
      branchNames.unshift(currentAudit.branchName);
    } else {
      currentAudit.branchName = branchNames[0];
    }
  }

  let html = '';
  branches.forEach(b => {
    const name = typeof b === 'string' ? b : (b.name || '');
    const id = typeof b === 'object' && b.id ? b.id : '';
    const selected = (name === currentAudit.branchName) ? 'selected' : '';
    html += `<option value="${name}" data-id="${id}" ${selected}>${name}</option>`;
  });

  branchSelect.innerHTML = html;
  if (currentAudit.branchName) {
    branchSelect.value = currentAudit.branchName;
  }
}

export function populateSpecialistSelect() {
  const specialistSelect = document.getElementById('select-specialist');
  if (!specialistSelect) return;

  const activeUser = getActiveAuthSession();
  if (activeUser && activeUser.role === 'specialist') {
    const spName = activeUser.displayName || activeUser.username;
    currentAudit.auditorName = spName;
    specialistSelect.innerHTML = `<option value="${spName}" selected>${spName}</option>`;
    specialistSelect.value = spName;
    specialistSelect.disabled = true;
    return;
  }

  const specialists = getSpecialists();
  const existingNames = specialists.map(s => typeof s === 'string' ? s : (s.name || ''));

  // Ensure currentAudit.auditorName is always represented in options
  const fullList = [...specialists];
  if (currentAudit.auditorName && !existingNames.includes(currentAudit.auditorName)) {
    fullList.unshift({ id: 'active_specialist', name: currentAudit.auditorName });
  } else if (!currentAudit.auditorName && existingNames.length > 0) {
    currentAudit.auditorName = existingNames[0];
  }

  if (fullList.length === 0) {
    if (currentAudit.auditorName) {
      specialistSelect.innerHTML = `<option value="${currentAudit.auditorName}" selected>${currentAudit.auditorName}</option>`;
    } else {
      specialistSelect.innerHTML = '<option value="">-- أضف أخصائياً من زر (⚙️ إدارة الأخصائيين) --</option>';
    }
    return;
  }

  let html = '';
  fullList.forEach(s => {
    const name = typeof s === 'string' ? s : (s.name || '');
    const id = typeof s === 'object' && s.id ? s.id : '';
    const selected = (name === currentAudit.auditorName) ? 'selected' : '';
    html += `<option value="${name}" data-id="${id}" ${selected}>${name}</option>`;
  });

  specialistSelect.innerHTML = html;
  if (currentAudit.auditorName) {
    specialistSelect.value = currentAudit.auditorName;
  }
}

export function refreshMainSelects() {
  populateBranchSelect();
  populateSpecialistSelect();
  syncQuickDisplays();
  saveAuditToStorage();
}

export function refreshBranchesUI() {
  refreshMainSelects();
  renderModalList();
  renderInlineDrawerList();
}

export function refreshSpecialistsUI() {
  refreshMainSelects();
  renderModalList();
  renderInlineDrawerList();
}

// رسم عناصر القائمة في النافذة المنبثقة مع العزل التام بين التبويبين
export function renderModalList(targetTab = null) {
  try {
    const branches = getBranches() || [];
    const specialists = getSpecialists() || [];

    const badgeBranches = document.getElementById('badge-branches-count');
    const badgeSpecialists = document.getElementById('badge-specialists-count');
    const counterBranches = document.getElementById('counter-branches-list');
    const counterSpecialists = document.getElementById('counter-specialists-list');
    const legacyCounter = document.getElementById('management-list-counter');

    if (badgeBranches) badgeBranches.innerText = branches.length;
    if (badgeSpecialists) badgeSpecialists.innerText = specialists.length;
    if (counterBranches) counterBranches.innerText = branches.length;
    if (counterSpecialists) counterSpecialists.innerText = specialists.length;

    const activeTab = targetTab || modalState.currentModalTab || 'branches';
    if (legacyCounter) {
      legacyCounter.innerText = (activeTab === 'branches') ? branches.length : specialists.length;
    }

    // 1. رسم قائمة الفروع المخصصة
    const branchesContainer = document.getElementById('list-mgmt-branches');
    if (branchesContainer) {
      if (branches.length === 0) {
        branchesContainer.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-500 space-y-1">
            <i data-lucide="map-pin-off" class="w-6 h-6 mx-auto text-slate-600 mb-1"></i>
            <p>لا توجد فروع مسجلة حتى الآن.</p>
            <p class="text-[10px] text-slate-600">أضف فرعك الأول من الحقل أعلاه ليتم حفظه في D1 محلياً وسحابياً.</p>
          </div>
        `;
      } else {
        branchesContainer.innerHTML = branches.map((item, index) => {
          const name = typeof item === 'string' ? item : (item && item.name ? item.name : '');
          const id = typeof item === 'object' && item && (item.id || item.id === 0) ? item.id : (name || index);
          const isCurrent = currentAudit.branchName && String(currentAudit.branchName).trim().toLowerCase() === String(name).trim().toLowerCase();

          return `
            <div class="px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-corp-850/60 transition group">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
                  <i data-lucide="store" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs text-slate-100 truncate ${isCurrent ? 'font-bold text-gold-400' : 'font-medium'}">${name}</span>
                  ${id ? `<span class="text-[9px] font-mono text-slate-500 bg-corp-900 px-1 py-0.2 rounded border border-corp-800" title="معرف D1">${id}</span>` : ''}
                </div>
                ${isCurrent ? `<span class="bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-gold-400"></span>المعرض المحدد</span>` : ''}
              </div>
              <button type="button" onclick="deleteEntity('branches', '${id}')" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition active:scale-90 cursor-pointer" title="حذف الفرع">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // 2. رسم قائمة الأخصائيين المخصصة
    const specialistsContainer = document.getElementById('list-mgmt-specialists');
    if (specialistsContainer) {
      if (specialists.length === 0) {
        specialistsContainer.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-500 space-y-1">
            <i data-lucide="user-x" class="w-6 h-6 mx-auto text-slate-600 mb-1"></i>
            <p>لا يوجد أخصائيو عرض مسجلون حتى الآن.</p>
            <p class="text-[10px] text-slate-600">أضف اسم الأخصائي من الحقل أعلاه لبدء توثيق الزيارات.</p>
          </div>
        `;
      } else {
        specialistsContainer.innerHTML = specialists.map((item, index) => {
          const name = typeof item === 'string' ? item : (item && item.name ? item.name : '');
          const id = typeof item === 'object' && item && (item.id || item.id === 0) ? item.id : (name || index);
          const isCurrent = currentAudit.auditorName && String(currentAudit.auditorName).trim().toLowerCase() === String(name).trim().toLowerCase();

          return `
            <div class="px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-corp-850/60 transition group">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs text-slate-100 truncate ${isCurrent ? 'font-bold text-emerald-400' : 'font-medium'}">${name}</span>
                  ${id ? `<span class="text-[9px] font-mono text-slate-500 bg-corp-900 px-1 py-0.2 rounded border border-corp-800" title="معرف D1">${id}</span>` : ''}
                </div>
                ${isCurrent ? `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>المسؤول النشط</span>` : ''}
              </div>
              <button type="button" onclick="deleteEntity('specialists', '${id}')" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition active:scale-90 cursor-pointer" title="حذف الأخصائي">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // 3. رسم الحاوية القديمة كـ Fallback للتوافق التام
    const legacyContainer = document.getElementById('management-items-list');
    if (legacyContainer) {
      const items = (activeTab === 'branches') ? branches : specialists;
      if (items.length === 0) {
        legacyContainer.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">لا توجد عناصر مسجلة حالياً</div>`;
      } else {
        legacyContainer.innerHTML = items.map((item, index) => {
          const name = typeof item === 'string' ? item : (item && item.name ? item.name : '');
          const id = typeof item === 'object' && item && item.id ? item.id : '';
          const activeName = (activeTab === 'branches') ? currentAudit.branchName : currentAudit.auditorName;
          const isCurrent = activeName && String(activeName).trim().toLowerCase() === String(name).trim().toLowerCase();

          const iconName = (activeTab === 'branches') ? 'map-pin' : 'user';
          const iconColor = (activeTab === 'branches') ? 'text-gold-400' : 'text-emerald-400';
          const activeBadgeText = (activeTab === 'branches') ? 'المحدد حالياً' : 'المسؤول النشط';
          const activeBadgeClass = (activeTab === 'branches') 
            ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' 
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

          return `
            <div class="px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-corp-850/50 transition">
              <div class="flex items-center gap-2 min-w-0">
                <i data-lucide="${iconName}" class="w-3.5 h-3.5 ${iconColor} shrink-0"></i>
                <div class="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs text-slate-200 truncate ${isCurrent ? 'font-bold text-gold-300' : ''}">${name}</span>
                  ${id ? `<span class="text-[9px] font-mono text-slate-500 bg-corp-900 px-1 py-0.2 rounded border border-corp-800">${id}</span>` : ''}
                </div>
                ${isCurrent ? `<span class="${activeBadgeClass} text-[10px] font-bold px-1.5 py-0.5 rounded border">${activeBadgeText}</span>` : ''}
              </div>
              <button type="button" onclick="deleteEntity('${activeTab}', '${id || index}')" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="حذف">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          `;
        }).join('');
      }
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch(e){}
    }
  } catch (err) {
    console.error('Error rendering modal list:', err);
  }
}

// رسم عناصر القائمة في الدرج المدمج السريع
export function renderInlineDrawerList() {
  try {
    const container = document.getElementById('drawer-items-list');
    const counter = document.getElementById('drawer-list-counter');
    const badgeBranches = document.getElementById('drawer-badge-branches');
    const badgeSpecialists = document.getElementById('drawer-badge-specialists');

    const branches = getBranches() || [];
    const specialists = getSpecialists() || [];

    if (badgeBranches) badgeBranches.innerText = branches.length;
    if (badgeSpecialists) badgeSpecialists.innerText = specialists.length;

    const items = (modalState.currentDrawerTab === 'branches') ? branches : specialists;
    if (counter) counter.innerText = items.length;
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="p-3 text-center text-xs text-slate-500">لا توجد عناصر مسجلة حالياً</div>`;
      return;
    }

    container.innerHTML = items.map((item, index) => {
      const name = typeof item === 'string' ? item : (item && item.name ? item.name : '');
      const id = typeof item === 'object' && item && (item.id || item.id === 0) ? item.id : (name || index);
      const activeName = (modalState.currentDrawerTab === 'branches') ? currentAudit.branchName : currentAudit.auditorName;
      const isCurrent = activeName && String(activeName).trim().toLowerCase() === String(name).trim().toLowerCase();

      const iconName = (modalState.currentDrawerTab === 'branches') ? 'store' : 'user';
      const iconColor = (modalState.currentDrawerTab === 'branches') ? 'text-gold-400' : 'text-emerald-400';
      const activeBadgeText = (modalState.currentDrawerTab === 'branches') ? 'المحدد حالياً' : 'المسؤول النشط';
      const activeBadgeClass = (modalState.currentDrawerTab === 'branches') 
        ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' 
        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

      return `
        <div class="px-3 py-2 flex items-center justify-between gap-2 hover:bg-corp-850/60 transition">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="${iconName}" class="w-3.5 h-3.5 ${iconColor} shrink-0"></i>
            <div class="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span class="text-xs text-slate-200 truncate ${isCurrent ? 'font-bold text-gold-300' : ''}">${name}</span>
              ${id ? `<span class="text-[9px] font-mono text-slate-500 bg-corp-950 px-1 py-0.2 rounded border border-corp-800">${id}</span>` : ''}
            </div>
            ${isCurrent ? `<span class="${activeBadgeClass} text-[10px] font-bold px-1.5 py-0.2 rounded border">${activeBadgeText}</span>` : ''}
          </div>
          <button type="button" onclick="deleteInlineEntity('${modalState.currentDrawerTab}', '${id || index}')" class="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer" title="حذف">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch(e){}
    }
  } catch (err) {
    console.error('renderInlineDrawerList error:', err);
  }
}

// ملء قائمة تحديد قسم المعرض ديناميكياً
export function populateSectionTypeSelect(selectedVal = null) {
  const select = document.getElementById('modal-section-type');
  if (!select) return;

  const sections = getStoreSections();
  const currentVal = selectedVal || select.value || (sections.length > 0 ? sections[0] : '');

  let html = '';
  sections.forEach(sec => {
    const isSelected = (sec === currentVal);
    html += `<option value="${sec.replace(/"/g, '&quot;')}" ${isSelected ? 'selected' : ''}>${sec}</option>`;
  });
  html += `<option value="__custom_section__" ${currentVal === '__custom_section__' ? 'selected' : ''}>+ تصنيف أو زاوية مخصصة...</option>`;

  select.innerHTML = html;
  if (currentVal && (sections.includes(currentVal) || currentVal === '__custom_section__')) {
    select.value = currentVal;
  }
}

// عرض معايير الـ VM التفاعلية حسب القسم مع إمكانية التعديل والحذف المباشر
export function renderCategoryChecklist(categoryName) {
  const container = document.getElementById('category-checklist-container');
  if (!container) return;

  const effectiveCategory = (categoryName === '__custom_section__') ? 'default' : categoryName;
  const standards = getSectionStandards(effectiveCategory);

  if (!standards || standards.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-4 text-center text-xs text-slate-400 bg-corp-900/40 rounded-xl border border-dashed border-corp-800">
        <span>لا توجد معايير مسجلة لهذا القسم حالياً.</span>
        <button type="button" onclick="openInlineAddStandard()" class="text-gold-400 font-bold underline mr-1 hover:text-gold-300">
          انقر هنا لإضافة أول معيار +
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = standards.map((std, idx) => {
    const isChecked = modalState.activeModalChecklist.includes(std);
    const escapedStd = std.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const escapedCat = effectiveCategory.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `
      <div class="group relative rounded-xl text-[11px] font-semibold border transition flex items-center justify-between gap-1.5 p-1.5 ${
        isChecked
          ? 'bg-gold-500/15 border-gold-400 text-gold-300 ring-1 ring-gold-500 shadow-sm'
          : 'bg-corp-900 border-corp-800 text-slate-300 hover:border-corp-700'
      }">
        <button type="button" onclick="toggleChecklistItem('${escapedStd}')" class="flex-1 text-right flex items-start gap-2 min-w-0 py-0.5">
          <span class="w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
            isChecked
              ? 'bg-gold-500 text-slate-950 border-gold-400 font-black text-xs'
              : 'border-corp-700 bg-corp-950 text-transparent'
          }">✓</span>
          <span class="leading-snug break-words">${std}</span>
        </button>
        <div class="flex items-center gap-0.5 shrink-0 pr-1">
          <button type="button" onclick="openEditStandardModal('${escapedCat}', '${escapedStd}')" class="p-1 text-slate-400 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition" title="تعديل نص المعيار">
            <i data-lucide="pencil" class="w-3 h-3"></i>
          </button>
          <button type="button" onclick="confirmDeleteStandard('${escapedCat}', '${escapedStd}')" class="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="حذف المعيار">
            <i data-lucide="trash-2" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

// رسم عناصر نافذة إدارة وتخصيص أقسام المعرض ومعايير الـ VM
export function renderSectionManager() {
  const sectionsListContainer = document.getElementById('sec-mgr-sections-list');
  const standardsListContainer = document.getElementById('sec-mgr-standards-list');
  const activeSectionTitle = document.getElementById('sec-mgr-active-section-title');
  const sectionsCountBadge = document.getElementById('sec-mgr-sections-count');
  const standardsCountBadge = document.getElementById('sec-mgr-standards-count');

  const sections = getStoreSections();
  if (sectionsCountBadge) sectionsCountBadge.innerText = sections.length;

  if (!modalState.selectedManagerSection || !sections.includes(modalState.selectedManagerSection)) {
    modalState.selectedManagerSection = sections.length > 0 ? sections[0] : '';
  }

  const currentSection = modalState.selectedManagerSection;
  if (activeSectionTitle) {
    activeSectionTitle.innerText = currentSection || 'اختر قسماً';
  }

  // 1. رسم قائمة الأقسام
  if (sectionsListContainer) {
    if (sections.length === 0) {
      sectionsListContainer.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">لا توجد أقسام مسجلة</div>';
    } else {
      sectionsListContainer.innerHTML = sections.map(sec => {
        const isSelected = (sec === currentSection);
        const standards = getSectionStandards(sec);
        const escapedSec = sec.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
          <div class="px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
            isSelected 
              ? 'bg-gold-500/15 border-gold-500/60 text-gold-300 font-bold shadow-sm'
              : 'bg-corp-950/80 border-corp-800 text-slate-200 hover:border-corp-700'
          }" onclick="selectManagerSection('${escapedSec}')">
            <div class="min-w-0 flex-1 flex items-center gap-2">
              <i data-lucide="layout-grid" class="w-3.5 h-3.5 ${isSelected ? 'text-gold-400' : 'text-slate-500'} shrink-0"></i>
              <span class="text-xs truncate">${sec}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-gold-500/20 text-gold-300' : 'bg-corp-850 text-slate-400'}">${standards.length}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation();">
              <button type="button" onclick="promptRenameSection('${escapedSec}')" class="p-1 text-slate-400 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition" title="تعديل اسم القسم">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="confirmDeleteStoreSection('${escapedSec}')" class="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="حذف القسم">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. رسم معايير القسم المختار
  if (standardsListContainer) {
    if (!currentSection) {
      standardsListContainer.innerHTML = '<div class="p-6 text-center text-xs text-slate-500">اختر قسماً من القائمة لعرض معاييره</div>';
      if (standardsCountBadge) standardsCountBadge.innerText = '0';
    } else {
      const standards = getSectionStandards(currentSection);
      if (standardsCountBadge) standardsCountBadge.innerText = standards.length;

      if (standards.length === 0) {
        standardsListContainer.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-400 border border-dashed border-corp-800 rounded-xl bg-corp-950/40">
            <span>لا توجد معايير مسجلة لقسم "${currentSection}". اكتب معياراً في الحقل أعلاه وأضفه.</span>
          </div>
        `;
      } else {
        standardsListContainer.innerHTML = standards.map((std, idx) => {
          const escapedStd = std.replace(/'/g, "\\'").replace(/"/g, '&quot;');
          const escapedSec = currentSection.replace(/'/g, "\\'").replace(/"/g, '&quot;');
          return `
            <div class="px-3 py-2 bg-corp-950/90 border border-corp-800 rounded-xl flex items-center justify-between gap-2 hover:border-corp-700 transition">
              <div class="flex items-start gap-2 min-w-0 flex-1">
                <span class="w-4 h-4 rounded bg-corp-850 text-gold-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">#${idx + 1}</span>
                <span class="text-xs text-slate-200 leading-snug break-words">${std}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="openEditStandardModal('${escapedSec}', '${escapedStd}')" class="p-1 text-slate-400 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition" title="تعديل المعيار">
                  <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" onclick="confirmDeleteStandard('${escapedSec}', '${escapedStd}')" class="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="حذف المعيار">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

// ==================== رندرة وسوم المعالجة السريعة (Quick Processing Tags) ====================
export function renderQuickTagsList() {
  const container = document.getElementById('modal-tags-list');
  if (!container) return;

  const tags = getQuickTags();
  container.innerHTML = '';

  tags.forEach(tag => {
    const isSelected = modalState.activeModalTags && (
      modalState.activeModalTags.includes(tag) || 
      modalState.activeModalTags.some(t => t.trim().toLowerCase() === tag.trim().toLowerCase())
    );

    const chip = document.createElement('div');
    chip.className = `group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition select-none cursor-pointer ${
      isSelected
        ? 'bg-gold-500 text-slate-950 font-bold border-gold-400 shadow-sm'
        : 'bg-corp-950 border-corp-700 text-slate-300 hover:border-gold-500/50 hover:text-slate-100'
    }`;

    // زر نص الوسم للتحديد السريع
    const labelSpan = document.createElement('span');
    labelSpan.innerText = tag;
    labelSpan.className = 'py-0.5';
    labelSpan.onclick = () => {
      if (typeof window.toggleModalTag === 'function') {
        window.toggleModalTag(chip, tag);
      }
    };
    chip.appendChild(labelSpan);

    // زر الحذف المصغر
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.title = `حذف وسم "${tag}"`;
    delBtn.className = `w-4 h-4 rounded-full flex items-center justify-center text-[11px] font-black opacity-60 hover:opacity-100 hover:bg-rose-500 hover:text-white transition ${
      isSelected ? 'text-slate-900' : 'text-slate-400'
    }`;
    delBtn.innerHTML = '×';
    delBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.confirmDeleteQuickTag === 'function') {
        window.confirmDeleteQuickTag(tag, e);
      }
    };
    chip.appendChild(delBtn);

    container.appendChild(chip);
  });

  // زر "+ وسم جديد"
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'text-xs px-2.5 py-1 rounded-lg border border-dashed border-gold-500/50 text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 transition inline-flex items-center gap-1 font-bold';
  addBtn.innerHTML = '<span class="text-sm font-black leading-none">+</span><span>وسم جديد</span>';
  addBtn.onclick = () => {
    if (typeof window.toggleInlineAddTag === 'function') {
      window.toggleInlineAddTag(true);
    }
  };
  container.appendChild(addBtn);

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// ==================== رندرة خيارات المسؤول عن التنفيذ (Quick Assignees) ====================
export function renderQuickAssigneesList() {
  const container = document.getElementById('quick-assignees-container');
  if (!container) return;

  const assignees = getQuickAssignees();
  const inputEl = document.getElementById('modal-action-assignee');
  const currentValue = inputEl ? inputEl.value.trim() : '';

  container.innerHTML = '';

  assignees.forEach(role => {
    const isSelected = (currentValue === role);
    const item = document.createElement('div');
    item.className = `group inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition cursor-pointer select-none ${
      isSelected 
        ? 'bg-gold-500 text-slate-950 font-bold border-gold-400 shadow-sm'
        : 'bg-corp-850 hover:bg-corp-800 text-slate-300 border-corp-700 hover:border-gold-500/40'
    }`;

    const labelSpan = document.createElement('span');
    labelSpan.innerText = role;
    labelSpan.onclick = () => {
      if (typeof window.setQuickAssignee === 'function') {
        window.setQuickAssignee(role);
      }
    };
    item.appendChild(labelSpan);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.title = `حذف "${role}" من الخيارات السريعة`;
    delBtn.className = `w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold opacity-60 hover:opacity-100 hover:bg-rose-500 hover:text-white transition ${
      isSelected ? 'text-slate-900' : 'text-slate-400'
    }`;
    delBtn.innerHTML = '×';
    delBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.confirmDeleteQuickAssignee === 'function') {
        window.confirmDeleteQuickAssignee(role, e);
      }
    };
    item.appendChild(delBtn);

    container.appendChild(item);
  });

  // زر "+ جهة"
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'text-[10px] px-2 py-0.5 rounded border border-dashed border-gold-500/40 text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 font-bold flex items-center gap-0.5 transition';
  addBtn.innerHTML = '<span>+ جهة تكليف</span>';
  addBtn.onclick = () => {
    if (typeof window.toggleInlineAddAssignee === 'function') {
      window.toggleInlineAddAssignee(true);
    }
  };
  container.appendChild(addBtn);
}

// استخراج تنسيق التحجيم والمحاذاة للصور
export function getImageTransformStyle(cfg) {
  if (!cfg) return '';
  const scale = (typeof cfg.scale === 'number' ? cfg.scale : 100) / 100;
  const align = cfg.align || 'center';
  const pos = (align === 'top') ? 'top center' : (align === 'bottom' ? 'bottom center' : 'center center');
  return `transform: scale(${scale}); transform-origin: ${pos}; object-position: ${pos};`;
}

// عرض بطاقات الأقسام في شاشة الجولة الميدانية
export function renderAuditCards(customSections = null) {
  const container = document.getElementById('audit-cards-container');
  const emptyState = document.getElementById('audit-empty-state');
  if (!container) return;
  container.innerHTML = '';

  const sections = Array.isArray(customSections) ? customSections : (currentAudit.sections || []);

  if (sections.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    updateKPIs();
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  sections.forEach((sec, idx) => {
    const card = document.createElement('div');
    card.className = "bg-corp-900 border border-corp-800 rounded-2xl p-4 md:p-5 shadow-md hover:border-corp-700 transition";
    
    const tagsHtml = (sec.tags || []).map(t => `
      <span class="bg-corp-900 border border-corp-700/80 text-gold-400 text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 shadow-xs">
        <i data-lucide="tag" class="w-3 h-3 text-gold-500"></i>
        <span>${t}</span>
      </span>
    `).join('');

    const statusBadgeHtml = getStatusBadgeHtml(sec);
    const hasBoth = sec.beforeImg && sec.afterImg && !sec.beforeImg.includes('placehold.co') && !sec.afterImg.includes('placehold.co');
    const isSlider = hasBoth && modalState.cardViewModes[sec.id] === 'slider';
    const beforeStyle = getImageTransformStyle(sec.beforeConfig);
    const afterStyle = getImageTransformStyle(sec.afterConfig);
    const panoStyle = getImageTransformStyle(sec.afterConfig || sec.beforeConfig);

    card.innerHTML = `
      <!-- 1. ترويسة بطاقة القسم: توسيط الرقم والاسم في منتصف السطر مع حفظ توازن الأزرار -->
      <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-corp-800">
        <div class="hidden sm:flex w-24"></div>
        <div class="flex items-center justify-center gap-2.5 mx-auto text-center">
          <span class="w-7 h-7 rounded-lg bg-corp-800 text-gold-400 font-black text-xs flex items-center justify-center border border-corp-700 shadow-sm">#${idx + 1}</span>
          <h3 class="font-black text-sm md:text-base text-white tracking-tight text-center">${sec.title}</h3>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="moveSection(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-30 p-1.5"' : 'class="text-slate-400 hover:text-white p-1.5 hover:bg-corp-800 rounded-lg"'} title="نقل لأعلى">
            <i data-lucide="arrow-up" class="w-4 h-4"></i>
          </button>
          <button onclick="moveSection(${idx}, 1)" ${idx === currentAudit.sections.length - 1 ? 'disabled class="opacity-30 p-1.5"' : 'class="text-slate-400 hover:text-white p-1.5 hover:bg-corp-800 rounded-lg"'} title="نقل لأسفل">
            <i data-lucide="arrow-down" class="w-4 h-4"></i>
          </button>
          <button onclick="editSectionEntry('${sec.id}')" class="text-slate-300 hover:text-gold-400 p-1.5 hover:bg-corp-800 rounded-lg" title="تعديل">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteSectionEntry('${sec.id}')" class="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/40 rounded-lg" title="حذف">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- 2. شريط الإجراءات والوسوم السريعة المستقل (Dedicated Action Bar) أسفل العنوان وقبل الصور -->
      <div class="w-full bg-corp-950/80 border border-corp-800 rounded-xl px-3 py-2 mb-3 flex items-center justify-center flex-wrap gap-2 shadow-inner">
        ${statusBadgeHtml}
        ${tagsHtml}
      </div>

      <!-- شريط التحكم بنمط العرض والتأشير -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        ${hasBoth ? `
          <button type="button" onclick="toggleCardViewMode('${sec.id}')" class="text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-bold transition ${isSlider ? 'bg-gold-500 text-slate-950 border-gold-400 shadow' : 'bg-corp-950 text-slate-400 border-corp-800 hover:text-white'}">
            <i data-lucide="${isSlider ? 'layout-grid' : 'columns'}" class="w-3.5 h-3.5"></i>
            <span>${isSlider ? 'عرض جنباً إلى جنب' : 'مقارنة منزلقة تفاعلية ↔'}</span>
          </button>
        ` : '<div></div>'}
        
        <button type="button" onclick="openAnnotatorForSection('${sec.id}')" class="text-[11px] px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 flex items-center gap-1.5 font-bold transition active:scale-95">
          <i data-lucide="pen-tool" class="w-3.5 h-3.5 text-rose-400"></i>
          <span>أشر على صورة قبل</span>
        </button>
      </div>

      <!-- عرض الصور: وفق نمط التخطيط (بانوراما عريضة / بانوراما مكدسة / مقارنة جانبية) -->
      ${isSlider ? `
        <div class="relative w-full aspect-video rounded-xl overflow-hidden select-none bg-corp-950 border border-corp-800 mb-3 shadow-inner" id="slider-box-${sec.id}">
          <img src="${sec.afterImg}" class="absolute inset-0 w-full h-full object-cover pointer-events-none">
          <div class="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex items-center justify-center px-3 py-0.5 rounded-full bg-[#064e3b]/90 text-emerald-200 border border-emerald-500/50 shadow text-[10px] font-bold select-none" dir="ltr">
            <span>After</span>
          </div>

          <img id="slider-before-img-${sec.id}" src="${sec.beforeImg}" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" style="clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);">
          <div class="absolute top-2 right-4 z-20 pointer-events-none flex items-center justify-center px-3 py-0.5 rounded-full bg-[#881337]/90 text-rose-200 border border-rose-500/50 shadow text-[10px] font-bold select-none" dir="ltr">
            <span>Before</span>
          </div>

          <div id="slider-handle-${sec.id}" class="absolute top-0 bottom-0 pointer-events-none z-20 flex items-center justify-center -translate-x-1/2" style="left: 50%;">
            <div class="w-0.5 h-full bg-gold-400 shadow-xl"></div>
            <div class="absolute w-8 h-8 bg-gold-500 text-slate-950 rounded-full shadow-2xl flex items-center justify-center border-2 border-slate-900 font-black text-xs">
              ↔
            </div>
          </div>

          <input type="range" min="0" max="100" value="50" oninput="updateSliderPosition('${sec.id}', this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" style="margin: 0; padding: 0;">
        </div>
      ` : (sec.layoutType === 'dual_panorama' ? `
        <!-- عرض بانوراما مزدوجة مرنة (خيارات: متجانبتان أفقياً أو فوق بعضهما عمودياً) -->
        <div class="mb-3.5">
          <div class="flex justify-center w-full mb-1.5">
            <div class="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-md text-xs font-black tracking-wide select-none" dir="rtl">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1"></span>
              <span>${sec.panoramaTitle ? sec.panoramaTitle : 'عرض بانورامي مزدوج (Dual Panorama View)'}</span>
            </div>
          </div>
          ${sec.panoramaOrientation === 'stacked_vertical' ? `
            <div class="space-y-3">
              <div class="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-corp-950 aspect-[21/9] sm:aspect-[16/7] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.beforeImg}', '${sec.title} - Panorama 1')">
                <img src="${sec.beforeImg || 'https://placehold.co/1200x500/0f172a/94a3b8?text=Panorama+1'}" style="${beforeStyle}" class="w-full h-full object-cover transition duration-300">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                  <i data-lucide="zoom-in" class="w-4 h-4"></i>
                  <span>تكبير بانوراما 1</span>
                </div>
              </div>
              <div class="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-corp-950 aspect-[21/9] sm:aspect-[16/7] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.afterImg}', '${sec.title} - Panorama 2')">
                <img src="${sec.afterImg || 'https://placehold.co/1200x500/0f172a/94a3b8?text=Panorama+2'}" style="${afterStyle}" class="w-full h-full object-cover transition duration-300">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                  <i data-lucide="zoom-in" class="w-4 h-4"></i>
                  <span>تكبير بانوراما 2</span>
                </div>
              </div>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-corp-950 aspect-[16/9] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.beforeImg}', '${sec.title} - Panorama 1')">
                <img src="${sec.beforeImg || 'https://placehold.co/1200x675/0f172a/94a3b8?text=Panorama+1'}" style="${beforeStyle}" class="w-full h-full object-cover transition duration-300">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                  <i data-lucide="zoom-in" class="w-4 h-4"></i>
                  <span>تكبير بانوراما 1</span>
                </div>
              </div>
              <div class="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-corp-950 aspect-[16/9] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.afterImg}', '${sec.title} - Panorama 2')">
                <img src="${sec.afterImg || 'https://placehold.co/1200x675/0f172a/94a3b8?text=Panorama+2'}" style="${afterStyle}" class="w-full h-full object-cover transition duration-300">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                  <i data-lucide="zoom-in" class="w-4 h-4"></i>
                  <span>تكبير بانوراما 2</span>
                </div>
              </div>
            </div>
          `}
        </div>
      ` : (sec.layoutType === 'single_panorama' ? `
        <!-- عرض بانوراما عريضة موحدة مع شارة مخصصة موسطة فوق الصورة تماماً -->
        <div class="mb-3.5">
          <div class="flex justify-center w-full mb-1.5">
            <div class="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-md text-xs font-black tracking-wide select-none" dir="rtl">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1"></span>
              <span>${sec.panoramaTitle ? sec.panoramaTitle : 'نظرة بانورامية شاملة (Panorama View)'}</span>
            </div>
          </div>
          <div class="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-corp-950 aspect-[21/9] sm:aspect-[16/7] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.afterImg || sec.beforeImg}', '${sec.title} - Panorama')">
            <img src="${sec.afterImg || sec.beforeImg || 'https://placehold.co/1200x500/0f172a/94a3b8?text=No+Panorama+Image'}" style="${panoStyle}" class="w-full h-full object-cover transition duration-300">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
              <i data-lucide="zoom-in" class="w-4 h-4"></i>
              <span>تكبير البانوراما</span>
            </div>
          </div>
        </div>
      ` : (sec.layoutType === 'stacked_panorama' ? `
        <!-- عرض بانوراما رأسية مكدسة مع شارات مخصصة فوق كل صورة -->
        <div class="space-y-3 mb-3.5">
          ${sec.panoramaTitle ? `
            <div class="flex justify-center w-full mb-1">
              <div class="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-md text-xs font-black tracking-wide select-none" dir="rtl">
                <span>${sec.panoramaTitle}</span>
              </div>
            </div>
          ` : ''}
          <div>
            <div class="flex justify-center w-full mb-1.5">
              <div class="inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#881337]/90 text-rose-100 border border-rose-400/60 backdrop-blur-md shadow-sm text-[10px] font-bold tracking-wide select-none" dir="ltr">
                <span>Before</span>
              </div>
            </div>
            <div class="relative rounded-2xl overflow-hidden border border-rose-500/40 bg-corp-950 aspect-[21/9] sm:aspect-[16/7] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.beforeImg}', '${sec.title} - Before')">
              <img src="${sec.beforeImg || 'https://placehold.co/1200x500/0f172a/94a3b8?text=No+Image'}" style="${beforeStyle}" class="w-full h-full object-cover transition duration-300">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                <i data-lucide="zoom-in" class="w-4 h-4"></i>
                <span>تكبير الصورة</span>
              </div>
            </div>
          </div>
          <div>
            <div class="flex justify-center w-full mb-1.5">
              <div class="inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#064e3b]/90 text-emerald-100 border border-emerald-400/60 backdrop-blur-md shadow-sm text-[10px] font-bold tracking-wide select-none" dir="ltr">
                <span>After</span>
              </div>
            </div>
            <div class="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-corp-950 aspect-[21/9] sm:aspect-[16/7] w-full group cursor-pointer shadow-md" onclick="openLightbox('${sec.afterImg}', '${sec.title} - After')">
              <img src="${sec.afterImg || 'https://placehold.co/1200x500/0f172a/94a3b8?text=No+Image'}" style="${afterStyle}" class="w-full h-full object-cover transition duration-300">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                <i data-lucide="zoom-in" class="w-4 h-4"></i>
                <span>تكبير الصورة</span>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <!-- مقارنة جانبية افتراضية مع شارات خارجية فوق كل صورة تماماً -->
        <div class="grid grid-cols-2 gap-3.5 mb-3.5">
          <!-- اليمين: قبل التعديل -->
          <div class="flex flex-col">
            <div class="flex justify-center w-full mb-1.5">
              <div class="inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#881337]/90 text-rose-100 border border-rose-400/60 backdrop-blur-md shadow-sm text-[10px] font-bold tracking-wide select-none" dir="ltr">
                <span>Before</span>
              </div>
            </div>
            <div class="relative rounded-2xl overflow-hidden border border-rose-500/40 bg-corp-950 aspect-[16/10] sm:aspect-[4/3] group cursor-pointer shadow-md" onclick="openLightbox('${sec.beforeImg}', '${sec.title} - Before')">
              <img src="${sec.beforeImg || 'https://placehold.co/600x400/0f172a/94a3b8?text=No+Image'}" style="${beforeStyle}" class="w-full h-full object-cover transition duration-300">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                <i data-lucide="zoom-in" class="w-4 h-4"></i>
                <span>تكبير الصورة</span>
              </div>
            </div>
          </div>

          <!-- اليسار: بعد التنفيذ والتعديل -->
          <div class="flex flex-col">
            <div class="flex justify-center w-full mb-1.5">
              <div class="inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#064e3b]/90 text-emerald-100 border border-emerald-400/60 backdrop-blur-md shadow-sm text-[10px] font-bold tracking-wide select-none" dir="ltr">
                <span>After</span>
              </div>
            </div>
            <div class="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-corp-950 aspect-[16/10] sm:aspect-[4/3] group cursor-pointer shadow-md" onclick="openLightbox('${sec.afterImg}', '${sec.title} - After')">
              <img src="${sec.afterImg || 'https://placehold.co/600x400/0f172a/94a3b8?text=No+Image'}" style="${afterStyle}" class="w-full h-full object-cover transition duration-300">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                <i data-lucide="zoom-in" class="w-4 h-4"></i>
                <span>تكبير الصورة</span>
              </div>
            </div>
          </div>
        </div>
      `)))}

      <!-- بنود معايير الـ VM المؤكدة -->
      ${sec.checklist && sec.checklist.length > 0 ? `
        <div class="mb-3 bg-corp-950/70 p-2.5 rounded-xl border border-corp-800">
          <span class="text-[11px] font-bold text-gold-400 block mb-1.5 flex items-center gap-1.5">
            <i data-lucide="check-check" class="w-3.5 h-3.5 text-gold-500"></i>
            <span>معايير الـ VM المؤكدة للقسم (${sec.checklist.length}):</span>
          </span>
          <div class="flex flex-wrap gap-1.5">
            ${sec.checklist.map(c => `
              <span class="bg-gold-500/10 text-gold-300 border border-gold-500/20 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                <span class="text-gold-400 font-bold">✓</span>
                <span>${c}</span>
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- صندوق متابعة وتكليف الإجراء والمهمة -->
      ${(sec.status === 'store_followup' || sec.status === 'management_action') ? `
        <div class="mb-3.5 p-3 rounded-2xl border ${
          sec.status === 'store_followup' 
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
            : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
        } text-xs shadow-md">
          <div class="flex items-center justify-between flex-wrap gap-2 pb-2 mb-2 border-b border-corp-800/80">
            <span class="font-black flex items-center gap-1.5 ${sec.status === 'store_followup' ? 'text-amber-400' : 'text-rose-400'}">
              <i data-lucide="${sec.status === 'store_followup' ? 'clock' : 'alert-triangle'}" class="w-4 h-4"></i>
              <span>${sec.status === 'store_followup' ? 'مهمة متابعة ملزمة للفرع' : 'طلب إجراء صيانة / تدخل إداري'}</span>
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${sec.status === 'store_followup' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}">
              قيد المتابعة
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 font-medium">👤 المسؤول عن التنفيذ:</span>
              <span class="font-bold text-white bg-corp-950 px-2 py-0.5 rounded-lg border border-corp-800">${sec.actionAssignee || 'مدير المعرض'}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 font-medium">📅 تاريخ الإنجاز المستهدف:</span>
              <span class="font-bold text-gold-400 bg-corp-950 px-2 py-0.5 rounded-lg border border-corp-800">${sec.actionDueDate || 'خلال أسبوع'}</span>
            </div>
          </div>
        </div>
      ` : ''}


      <!-- تفاصيل ومبررات التعديل الميداني كقائمة رأسية متسلسلة -->
      <div class="bg-corp-950/80 p-3 rounded-xl border border-corp-800 text-xs text-slate-300">
        <div class="text-gold-400 font-bold pb-1.5 mb-2 border-b border-corp-800/80 flex items-center gap-1.5 text-[11px]">
          <span class="w-4 h-4 rounded bg-corp-900 text-gold-400 flex items-center justify-center text-[10px] shrink-0 font-bold border border-corp-700">📋</span>
          <span>الملاحظات والمبررات الميدانية:</span>
        </div>
        <div class="flex flex-col gap-1.5">
          ${parseJustificationNotes(sec.notes).map(item => `
            <div class="flex items-start gap-2 text-[11px] leading-relaxed">
              <span class="w-3.5 h-3.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5">✔</span>
              <span class="font-normal text-slate-200">${item}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  syncQuickDisplays();
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

// عرض قائمة الأقسام في تقرير الطباعة الرسمي بنظام العرض الأفقي التنفيذي (A4 Landscape)
export function renderPrintSections(customSections = null) {
  const container = document.getElementById('print-sections-container');
  if (!container) return;
  container.innerHTML = '';

  const sections = Array.isArray(customSections) ? customSections : (currentAudit.sections || []);

  if (sections.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl p-6">
        لا توجد أقسام مسجلة حتى الآن في مسودة هذا التقرير. يرجى توثيق قسم واحد على الأقل للمعاينة.
      </div>
    `;
    return;
  }

  sections.forEach((sec, idx) => {
    const item = document.createElement('div');
    item.className = "print-page-section print-card print-break-inside-avoid border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between";
    
    const tagsBadge = (sec.tags || []).map(t => `
      <span class="bg-white text-slate-800 border border-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-xs">
        ${t}
      </span>
    `).join(' ');

    const beforeStyle = getImageTransformStyle(sec.beforeConfig);
    const afterStyle = getImageTransformStyle(sec.afterConfig);
    const panoStyle = getImageTransformStyle(sec.afterConfig || sec.beforeConfig);

    const isStackedMode = (sec.layoutType === 'stacked_panorama') || 
                          (sec.layoutType === 'dual_panorama' && sec.panoramaOrientation === 'stacked_vertical');

    item.innerHTML = `
      <!-- 1. ترويسة القسم المكونة من سطرين متناسقين -->
      <div class="w-full shrink-0">
        <!-- السطر الأول: رقم القسم واسمه موسطان في الأعلى -->
        <div class="flex items-center justify-center gap-2 mb-1 w-full text-center">
          <span class="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 text-xs font-black flex items-center justify-center shrink-0 shadow-xs">${idx + 1}</span>
          <h4 class="font-black text-slate-900 text-base md:text-lg tracking-tight m-0 text-center">${sec.title}</h4>
        </div>
        <!-- السطر الثاني: شريط مقسم يضم شارات الحالة على اليمين والوسوم على اليسار -->
        <div class="flex items-center justify-between flex-wrap gap-2 pb-[4mm] border-b border-slate-100 w-full" dir="rtl">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${getStatusBadgeHtml(sec, true)}
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${tagsBadge}
          </div>
        </div>
      </div>

      <!-- 2. ساحة الصور الطبيعية بدون أي قص (True Uncropped Natural Images - contain + auto aspect ratio) -->
      ${isStackedMode ? `
        <!-- وضع البانوراما المكدسة رأسياً (صفين فوق بعضهما) بحد أقصى 50mm للصورة لمنع أي تداخل -->
        <div class="flex flex-col gap-[6mm] w-full items-center justify-center flex-1 my-auto overflow-hidden">
          <!-- الصورة العلوية (قبل / صورة 1) -->
          <div class="relative inline-block max-w-full text-center">
            ${sec.panoramaTitle ? `
              <span class="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/80 shadow-md text-[9.5px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs whitespace-nowrap">
                ${sec.panoramaTitle}
              </span>
            ` : `
              <span class="absolute top-2 right-2 z-10 px-2.5 py-0.5 rounded-full bg-[#881337]/90 text-white border border-rose-400/80 shadow-md text-[9px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs" dir="ltr">Before</span>
            `}
            <img src="${sec.beforeImg}" alt="Before" class="print-img-stacked" style="width: auto; height: auto; max-width: 100%; max-height: 50mm; object-fit: contain; display: block; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); ${beforeStyle}">
          </div>

          <!-- الصورة السفلية (بعد / صورة 2) -->
          <div class="relative inline-block max-w-full text-center">
            ${(!sec.panoramaTitle) ? `
              <span class="absolute top-2 left-2 z-10 px-2.5 py-0.5 rounded-full bg-[#064e3b]/90 text-white border border-emerald-400/80 shadow-md text-[9px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs" dir="ltr">After</span>
            ` : ''}
            <img src="${sec.afterImg}" alt="After" class="print-img-stacked" style="width: auto; height: auto; max-width: 100%; max-height: 50mm; object-fit: contain; display: block; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); ${afterStyle}">
          </div>
        </div>
      ` : (sec.layoutType === 'single_panorama' ? `
        <!-- وضع البانوراما المنفردة العريضة -->
        <div class="flex items-center justify-center flex-1 w-full my-auto overflow-hidden">
          <div class="relative inline-block max-w-full text-center">
            <span class="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3.5 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/80 shadow-md text-[10px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs whitespace-nowrap">
              ${sec.panoramaTitle || 'نظرة بانورامية شاملة (Panorama View)'}
            </span>
            <img src="${sec.afterImg || sec.beforeImg}" alt="Panorama View" class="print-img-side-by-side" style="width: auto; height: auto; max-width: 100%; max-height: 105mm; object-fit: contain; display: block; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); ${panoStyle}">
          </div>
        </div>
      ` : `
        <!-- الوضع المتجانب الافتراضي (Side-by-Side: عمودان متجاوران مع فراغ 14mm وأقصى ارتفاع 105mm) -->
        <div class="grid grid-cols-2 gap-[14mm] w-full items-center justify-center flex-1 my-auto overflow-hidden">
          <!-- اليمين: قبل التعديل -->
          <div class="relative w-full flex items-center justify-center overflow-hidden">
            <div class="relative inline-block max-w-full text-center">
              ${(sec.layoutType === 'dual_panorama' && sec.panoramaTitle) ? `
                <span class="absolute top-2 right-2 z-10 px-3 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/80 shadow-md text-[9.5px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs whitespace-nowrap">
                  ${sec.panoramaTitle} (1)
                </span>
              ` : `
                <span class="absolute top-2 right-2 z-10 px-2.5 py-0.5 rounded-full bg-[#881337]/90 text-white border border-rose-400/80 shadow-md text-[9px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs" dir="ltr">Before</span>
              `}
              <img src="${sec.beforeImg}" alt="Before" class="print-img-side-by-side" style="width: auto; height: auto; max-width: 100%; max-height: 105mm; object-fit: contain; display: block; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); ${beforeStyle}">
            </div>
          </div>

          <!-- اليسار: بعد التنفيذ والتعديل -->
          <div class="relative w-full flex items-center justify-center overflow-hidden">
            <div class="relative inline-block max-w-full text-center">
              ${(sec.layoutType === 'dual_panorama' && sec.panoramaTitle) ? `
                <span class="absolute top-2 left-2 z-10 px-3 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/80 shadow-md text-[9.5px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs whitespace-nowrap">
                  ${sec.panoramaTitle} (2)
                </span>
              ` : `
                <span class="absolute top-2 left-2 z-10 px-2.5 py-0.5 rounded-full bg-[#064e3b]/90 text-white border border-emerald-400/80 shadow-md text-[9px] font-black tracking-wide pointer-events-none select-none backdrop-blur-xs" dir="ltr">After</span>
              `}
              <img src="${sec.afterImg}" alt="After" class="print-img-side-by-side" style="width: auto; height: auto; max-width: 100%; max-height: 105mm; object-fit: contain; display: block; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); ${afterStyle}">
            </div>
          </div>
        </div>
      `)}

      <!-- 3. اللوحة السفلية المدمجة من عمودين (Right: 42% VM Standards + Action, Left: 58% Field Justifications) مع فراغ 14mm -->
      <div class="grid grid-cols-12 gap-[14mm] pt-[4mm] border-t border-slate-200 mt-auto shrink-0 w-full text-[11px] leading-snug" dir="rtl">
        <!-- العمود الأيمن (42% / 5 أعمدة): معايير الـ VM والتكليف الرسمي -->
        <div class="col-span-5 space-y-1">
          <!-- معايير الـ VM المعتمدة المطبقة -->
          ${sec.checklist && sec.checklist.length > 0 ? `
            <div>
              <span class="text-[9.5px] font-bold text-slate-700 block mb-0.5 flex items-center gap-1">
                <span class="text-amber-600 font-bold">✓</span>
                <span>معايير الـ VM المطبقة (${sec.checklist.length}):</span>
              </span>
              <div class="flex flex-wrap gap-1">
                ${sec.checklist.map(c => `
                  <span class="bg-amber-50/80 text-amber-900 border border-amber-300/80 text-[9px] px-1.5 py-0.5 rounded font-medium">
                    ✓ ${c}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- صندوق تكليف ومتابعة الإجراء إذا وُجد -->
          ${(getSectionStatuses(sec).includes('store_followup') || getSectionStatuses(sec).includes('management_action')) ? `
            <div class="p-1 rounded-lg border ${
              getSectionStatuses(sec).includes('management_action') 
                ? 'bg-rose-50/90 border-rose-200 text-rose-900' 
                : 'bg-amber-50/90 border-amber-200 text-amber-900'
            } text-[10px]">
              <div class="flex items-center justify-between pb-0.5 mb-0.5 border-b ${getSectionStatuses(sec).includes('management_action') ? 'border-rose-200' : 'border-amber-200'}">
                <span class="font-bold text-[9.5px]">
                  ${getSectionStatuses(sec).includes('management_action') && getSectionStatuses(sec).includes('store_followup')
                    ? '⚠️ متابعة موجهة للمتجر وطلب صيانة'
                    : (getSectionStatuses(sec).includes('management_action') ? '🚨 طلب صيانة وتدخل إداري' : '⚠️ مهمة متابعة للفرع')
                  }
                </span>
                <span class="text-[8.5px] px-1 rounded font-bold bg-white border border-slate-200">إجراء رسمي</span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[9px]">
                <div>المسؤول: <strong class="underline">${sec.actionAssignee || 'مدير المعرض'}</strong></div>
                <div>التاريخ: <strong class="underline">${sec.actionDueDate || 'خلال أسبوع'}</strong></div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- العمود الأيسر (58% / 7 أعمدة): تفاصيل ومبررات التعديل الميداني -->
        <div class="col-span-7">
          <div class="font-bold text-slate-800 pb-0.5 mb-1 border-b border-slate-200 flex items-center gap-1.5 text-[10.5px]">
            <span class="w-3.5 h-3.5 rounded bg-slate-900 text-amber-400 flex items-center justify-center text-[8.5px] shrink-0 font-bold">📋</span>
            <span>تفاصيل ومبررات التعديل الميداني:</span>
          </div>
          <div class="flex flex-col gap-0.5">
            ${getDynamicJustifications(sec).map(item => `
              <div class="flex items-start gap-1.5 text-[10px] leading-snug">
                <span class="w-3 h-3 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[7.5px] font-black shrink-0 mt-0.5">✔</span>
                <span class="font-medium text-slate-800">${item}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.appendChild(item);
  });
}

// ==================== رسم وإدارة واجهة التصدير المجمع (Bulk Export UI Renderer) ====================

export function updateBulkExportSelectionCounter() {
  const container = document.getElementById('bulk-selected-counter');
  if (!container) return;

  const allAudits = getArchivedAudits();
  const checkedBoxes = document.querySelectorAll('.bulk-audit-checkbox:checked');
  const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.id);
  const selectedAudits = allAudits.filter(a => selectedIds.includes(a.id));

  let totalSections = 0;
  let totalPhotos = 0;
  selectedAudits.forEach(aud => {
    (aud.sections || []).forEach(sec => {
      totalSections++;
      if (sec.beforeImg) totalPhotos++;
      if (sec.afterImg) totalPhotos++;
    });
  });

  const selectAllCb = document.getElementById('bulk-select-all-checkbox');
  const totalVisibleCheckboxes = document.querySelectorAll('.bulk-audit-checkbox').length;
  if (selectAllCb) {
    selectAllCb.checked = (totalVisibleCheckboxes > 0 && checkedBoxes.length === totalVisibleCheckboxes);
    selectAllCb.indeterminate = (checkedBoxes.length > 0 && checkedBoxes.length < totalVisibleCheckboxes);
  }

  // تحديث حالة زر حذف المحدد
  const deleteBtn = document.getElementById('btn-delete-selected-audits');
  if (deleteBtn) {
    const hasSelection = selectedAudits.length > 0;
    deleteBtn.disabled = !hasSelection;
    if (hasSelection) {
      deleteBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    } else {
      deleteBtn.classList.add('opacity-40', 'cursor-not-allowed');
    }
  }

  if (selectedAudits.length === 0) {
    container.innerHTML = `
      <span class="text-slate-400 font-medium">لم يتم تحديد أي جولات للتصدير المجمع</span>
    `;
  } else {
    container.innerHTML = `
      <span class="text-gold-400 font-bold">${selectedAudits.length} جولات محددة</span>
      <span class="text-slate-500">•</span>
      <span class="text-slate-200">${totalSections} قسماً بالدورة</span>
      <span class="text-slate-500">•</span>
      <span class="text-emerald-400 font-semibold">${totalPhotos} صورة ميدانية</span>
    `;
  }
}

export function renderBulkExportUI() {
  const listContainer = document.getElementById('bulk-audits-list-container');
  const monthFilter = document.getElementById('bulk-month-filter');
  const specialistFilter = document.getElementById('bulk-specialist-filter');
  const specialistFilterContainer = document.getElementById('bulk-specialist-filter-container');
  const searchInput = document.getElementById('bulk-search-input');
  if (!listContainer) return;

  const activeUser = getActiveAuthSession() || { username: 'sam', role: 'admin' };
  let allAudits = getArchivedAudits();

  // 1. عزل البيانات: إذا كان المستخدم أخصائياً، لا يرى إلا جولاته الخاصة
  if (activeUser.role === 'specialist') {
    if (specialistFilterContainer) specialistFilterContainer.style.display = 'none';
    const myUsername = (activeUser.username || '').toLowerCase();
    const myDisplayName = (activeUser.displayName || '').toLowerCase();
    allAudits = allAudits.filter(a => {
      const oUser = (a.ownerUsername || '').toLowerCase();
      const aName = (a.auditorName || '').toLowerCase();
      const sName = (a.specialistName || '').toLowerCase();
      return oUser === myUsername || aName === myDisplayName || sName === myDisplayName;
    });
  } else {
    // مدير النظام sam: إظهار فلتر الأخصائيين وتعبئته بالأسماء المتاحة
    if (specialistFilterContainer) specialistFilterContainer.style.display = 'block';
    if (specialistFilter) {
      const currentSpecialist = specialistFilter.value || 'all';
      const specialistNames = new Set();
      allAudits.forEach(a => {
        const name = a.specialistName || a.auditorName;
        if (name && name !== 'أخصائي العرض المرئي' && name !== 'أخصائي الـ VM') {
          specialistNames.add(name);
        }
      });
      let specOptionsHtml = '<option value="all">جميع الأخصائيين</option>';
      specialistNames.forEach(name => {
        specOptionsHtml += `<option value="${name}" ${currentSpecialist === name ? 'selected' : ''}>${name}</option>`;
      });
      specialistFilter.innerHTML = specOptionsHtml;
      if (currentSpecialist && (specialistNames.has(currentSpecialist) || currentSpecialist === 'all')) {
        specialistFilter.value = currentSpecialist;
      }
    }
  }

  // 2. تحديث قائمة خيارات الأشهر تلقائياً بناءً على محتوى الأرشيف
  if (monthFilter) {
    const currentSelectedMonth = monthFilter.value || 'all';
    const monthsMap = new Map();
    allAudits.forEach(a => {
      const k = a.monthKey || 'general';
      const n = a.monthName || a.monthKey || 'أخرى';
      if (!monthsMap.has(k)) monthsMap.set(k, n);
    });

    let monthOptionsHtml = `<option value="all">جميع الفترات والدورات (${allAudits.length} جولات)</option>`;
    monthsMap.forEach((name, key) => {
      const count = allAudits.filter(a => (a.monthKey || 'general') === key).length;
      monthOptionsHtml += `<option value="${key}" ${currentSelectedMonth === key ? 'selected' : ''}>${name} (${count} جولات)</option>`;
    });
    monthFilter.innerHTML = monthOptionsHtml;
    if (monthsMap.has(currentSelectedMonth) || currentSelectedMonth === 'all') {
      monthFilter.value = currentSelectedMonth;
    }
  }

  // 3. تصفية القائمة حسب الشهر والأخصائي والبحث
  const filterMonth = monthFilter ? monthFilter.value : 'all';
  const filterSpecialist = (specialistFilter && activeUser.role === 'admin') ? specialistFilter.value : 'all';
  const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();

  let filtered = allAudits.filter(aud => {
    if (filterMonth !== 'all' && (aud.monthKey || 'general') !== filterMonth) {
      return false;
    }
    if (filterSpecialist !== 'all') {
      const sp = aud.specialistName || aud.auditorName || '';
      if (sp !== filterSpecialist) {
        return false;
      }
    }
    if (searchTerm) {
      const bName = (aud.branchName || '').toLowerCase();
      const aName = (aud.auditorName || '').toLowerCase();
      const sName = (aud.specialistName || '').toLowerCase();
      const wNum = String(aud.weekNumber || '');
      const dStr = String(aud.auditDate || '');
      if (!bName.includes(searchTerm) && !aName.includes(searchTerm) && !sName.includes(searchTerm) && !wNum.includes(searchTerm) && !dStr.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  // فرز تنازلي حسب التاريخ للأحدث أولاً
  filtered.sort((a, b) => new Date(b.auditDate || 0) - new Date(a.auditDate || 0));

  if (allAudits.length === 0) {
    listContainer.innerHTML = `
      <div class="py-12 px-4 text-center border-2 border-dashed border-corp-800 rounded-2xl bg-corp-950/60">
        <div class="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-400 mx-auto flex items-center justify-center mb-3">
          <i data-lucide="archive" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-white mb-1">الأرشيف فارغ حالياً</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
          لا توجد جولات تدقيق محفوظة في الأرشيف حتى الآن. يمكنك حفظ مسودة الجولة الحالية بعد توثيقها أو استيراد ملفات JSON سابقة.
        </p>
        <button type="button" onclick="archiveCurrentAuditToStorage()" class="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow active:scale-95 transition cursor-pointer">
          <i data-lucide="bookmark-plus" class="w-4 h-4"></i>
          <span>حفظ مسودة الجولة الحالية في الأرشيف 💾</span>
        </button>
      </div>
    `;
    updateBulkExportSelectionCounter();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch(e){}
    }
    return;
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="py-12 px-4 text-center border-2 border-dashed border-corp-800 rounded-2xl bg-corp-950/60">
        <div class="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-400 mx-auto flex items-center justify-center mb-3">
          <i data-lucide="folder-search" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-white mb-1">لا توجد جولات تدقيق مطابقة للبحث أو الفترة المحددة</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
          يمكنك تعديل كلمات البحث أو اختيار شهر آخر من القائمة المنسدلة أعلاه.
        </p>
      </div>
    `;
    updateBulkExportSelectionCounter();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch(e){}
    }
    return;
  }

  // 3. رسم عناصر القائمة
  listContainer.innerHTML = filtered.map((aud, idx) => {
    const sections = aud.sections || [];
    const secCount = sections.length;
    let photoCount = 0;
    let resolvedCount = 0;
    let followupCount = 0;
    let actionCount = 0;

    sections.forEach(s => {
      if (s.beforeImg) photoCount++;
      if (s.afterImg) photoCount++;
      if (s.status === 'store_followup') followupCount++;
      else if (s.status === 'management_action') actionCount++;
      else resolvedCount++;
    });

    return `
      <div class="group p-3.5 bg-corp-950 hover:bg-corp-900/90 border border-corp-800 hover:border-gold-500/40 rounded-xl transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3" data-audit-row="${aud.id}">
        
        <!-- خانة الاختيار وبيانات الجولة الأساسية -->
        <div class="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <label class="cursor-pointer flex items-center pt-1 sm:pt-0 shrink-0">
            <input type="checkbox" checked data-id="${aud.id}" onchange="updateBulkExportSelectionCounter()" class="bulk-audit-checkbox w-4 h-4 rounded text-gold-500 bg-corp-900 border-corp-700 focus:ring-gold-500 focus:ring-offset-corp-950 cursor-pointer">
          </label>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="text-xs sm:text-sm font-black text-white hover:text-gold-400 transition">${aud.branchName || 'معرض غير محدد'}</span>
              <span class="text-[10px] text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1 font-mono font-bold">
                <i data-lucide="calendar" class="w-3 h-3 text-gold-400"></i>
                <span>${aud.auditDate || 'تاريخ غير محدد'}</span>
              </span>
            </div>

            <div class="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
              <span class="flex items-center gap-1">
                <i data-lucide="user" class="w-3 h-3 text-sky-400"></i>
                <span class="text-slate-300">${aud.auditorName || 'أخصائي الـ VM'}</span>
              </span>
              <span>•</span>
              <span class="font-semibold text-slate-300">${secCount} أقسام</span>
              <span>•</span>
              <span>${photoCount} صور</span>
              <span>•</span>
              <span class="inline-flex items-center gap-1">
                <span class="text-emerald-400 font-bold">✅ ${resolvedCount}</span>
                ${followupCount > 0 ? `<span class="text-amber-400 font-bold">⏳ ${followupCount}</span>` : ''}
                ${actionCount > 0 ? `<span class="text-rose-400 font-bold">⚠️ ${actionCount}</span>` : ''}
              </span>
            </div>
          </div>
        </div>

        <!-- أزرار الإجراءات السريعة للجولة -->
        <div class="flex items-center gap-1.5 shrink-0 justify-end border-t md:border-t-0 border-corp-800/80 pt-2 md:pt-0">
          <button type="button" onclick="previewArchivedAudit('${aud.id}')" class="px-2.5 py-1.5 bg-corp-850 hover:bg-corp-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-corp-700/60 transition flex items-center gap-1 cursor-pointer" title="معاينة وطباعة تقرير هذه الجولة">
            <i data-lucide="printer" class="w-3.5 h-3.5 text-gold-400"></i>
            <span class="hidden sm:inline">معاينة</span>
          </button>
          <button type="button" onclick="loadArchivedAuditToEditor('${aud.id}')" class="px-2.5 py-1.5 bg-corp-850 hover:bg-corp-800 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1 cursor-pointer" title="استعادة الجولة للتعديل كمسودة نشطة">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">استعادة</span>
          </button>
          <button type="button" onclick="downloadSingleArchivedAuditJson('${aud.id}')" class="p-1.5 bg-corp-850 hover:bg-corp-800 text-slate-400 hover:text-sky-300 rounded-lg border border-corp-700/60 transition cursor-pointer" title="تحميل ملف JSON لهذه الجولة">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
          </button>
          <button type="button" onclick="confirmDeleteArchivedAudit('${aud.id}')" class="p-1.5 bg-corp-850 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg border border-corp-700/60 hover:border-rose-500/40 transition cursor-pointer" title="حذف الجولة من الأرشيف">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

      </div>
    `;
  }).join('');

  updateBulkExportSelectionCounter();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

export function openArchivedAuditPreview(auditId) {
  const audit = getArchivedAuditById(auditId);
  if (!audit) {
    showToast('تعذر العثور على بيانات الجولة المطلوبة', 'error');
    return;
  }

  const modal = document.getElementById('archived-audit-preview-modal');
  const title = document.getElementById('archived-modal-store-title');
  const meta = document.getElementById('archived-modal-meta-info');
  const body = document.getElementById('archived-modal-sections-body');

  if (title) title.innerText = audit.branchName || 'معرض غير محدد';
  if (meta) {
    meta.innerHTML = `
      التاريخ: <strong>${audit.auditDate || 'غير محدد'}</strong> | الأخصائي: <strong>${audit.auditorName || 'غير محدد'}</strong> | الأقسام: <strong>${(audit.sections || []).length}</strong>
    `;
  }

  if (body) {
    const sections = audit.sections || [];
    if (sections.length === 0) {
      body.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">لا توجد أقسام مسجلة في هذا التقرير</div>`;
    } else {
      body.innerHTML = sections.map((sec, i) => `
        <div class="p-3 bg-corp-950 border border-corp-800 rounded-xl space-y-2">
          <div class="flex items-center justify-between pb-1 border-b border-corp-800">
            <span class="font-bold text-xs text-white">#${i + 1} ${sec.title}</span>
            ${getStatusBadgeHtml(sec.status || 'resolved')}
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="aspect-[16/10] rounded-lg overflow-hidden relative border border-corp-800 bg-corp-900">
              <span class="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40">Before</span>
              <img src="${sec.beforeImg}" alt="Before" class="w-full h-full object-cover">
            </div>
            <div class="aspect-[16/10] rounded-lg overflow-hidden relative border border-corp-800 bg-corp-900">
              <span class="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">After</span>
              <img src="${sec.afterImg}" alt="After" class="w-full h-full object-cover">
            </div>
          </div>
          ${sec.notes ? `<p class="text-[11px] text-slate-300 bg-corp-900 p-2 rounded-lg border border-corp-800/80">${sec.notes}</p>` : ''}
        </div>
      `).join('');
    }
  }

  const previewBtn = document.getElementById('archived-modal-open-preview-btn');
  const restoreBtn = document.getElementById('archived-modal-restore-btn');
  if (previewBtn) {
    previewBtn.onclick = () => {
      closeArchivedAuditPreview();
      if (typeof window.previewArchivedAudit === 'function') {
        window.previewArchivedAudit(auditId);
      }
    };
  }
  if (restoreBtn) {
    restoreBtn.onclick = () => {
      closeArchivedAuditPreview();
      if (typeof window.loadArchivedAuditToEditor === 'function') {
        window.loadArchivedAuditToEditor(auditId);
      }
    };
  }

  if (modal) {
    modal.style.display = 'flex';
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

export function closeArchivedAuditPreview() {
  const modal = document.getElementById('archived-audit-preview-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * إدارة وعرض فريق العمل والأخصائيين المعتمدين في تبويب مدير النظام (خاص بـ sam)
 */
export async function renderTeamManagementUI() {
  const membersListContainer = document.getElementById('team-members-list');
  const branchesContainer = document.getElementById('team-branches-checkboxes');
  const countBadge = document.getElementById('team-members-count');
  if (!membersListContainer) return;

  // 1. تعبئة قائمة مربعات اختيار الفروع
  if (branchesContainer) {
    const allBranches = getBranches();
    if (allBranches.length === 0) {
      branchesContainer.innerHTML = '<span class="text-xs text-slate-500 col-span-4 py-2">لا توجد فروع مسجلة حالياً في النظام. أضف فروعاً من إدارة الفروع أولاً.</span>';
    } else {
      branchesContainer.innerHTML = allBranches.map(b => {
        const name = typeof b === 'string' ? b : (b.name || '');
        return `
          <label class="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer select-none bg-corp-950/70 p-2 rounded-lg border border-corp-800 transition">
            <input type="checkbox" name="team-branch" value="${name}" class="team-branch-cb rounded text-amber-500 bg-corp-900 border-corp-700 focus:ring-amber-500 cursor-pointer" />
            <span class="truncate">${name}</span>
          </label>
        `;
      }).join('');
    }
  }

  // 2. جلب قائمة المستخدمين (من السحابة أو الكاش المحلي)
  let users = [];
  try {
    const { fetchUsersCloud } = await import('./api.js');
    const cloudRes = await fetchUsersCloud();
    if (cloudRes && cloudRes.success && Array.isArray(cloudRes.data)) {
      users = cloudRes.data;
      localStorage.setItem(STORAGE_KEY_USERS_REGISTRY, JSON.stringify(users));
    }
  } catch (e) {}

  if (!users || users.length === 0) {
    const raw = localStorage.getItem(STORAGE_KEY_USERS_REGISTRY);
    if (raw) {
      try { users = JSON.parse(raw); } catch (_) {}
    }
  }

  // التأكد من وجود sam
  if (!users.some(u => u && u.username === 'sam')) {
    users.unshift({
      username: 'sam',
      password: '7701',
      displayName: 'سمير سلطان (مدير النظام)',
      role: 'admin',
      assignedBranches: ['*']
    });
  }

  if (countBadge) {
    countBadge.innerText = `${users.length} حسابات مسجلة`;
  }

  // 3. رسم كروت المستخدمين
  membersListContainer.innerHTML = users.map(user => {
    const isAdmin = user.role === 'admin';
    const isSam = user.username === 'sam';
    const branches = Array.isArray(user.assignedBranches) ? user.assignedBranches : ['*'];
    const isAllBranches = branches.includes('*');

    return `
      <div class="bg-corp-950 p-4 rounded-xl border ${isAdmin ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-corp-800'} flex flex-col justify-between gap-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl ${isAdmin ? 'bg-gradient-to-br from-amber-500/20 to-gold-500/10 text-amber-400 border border-amber-500/30' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'} flex items-center justify-center text-lg font-black shrink-0">
              ${isAdmin ? '👑' : '👤'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-xs md:text-sm font-black text-white">${user.displayName || user.username}</h4>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isAdmin ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' : 'bg-sky-400/10 text-sky-300 border border-sky-400/20'}">
                  ${isAdmin ? 'مدير النظام' : 'أخصائي VM'}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                <span>اسم الدخول: <strong class="text-slate-200">@${user.username}</strong></span>
              </div>
            </div>
          </div>

          <!-- كلمة المرور مع زر الكشف -->
          <div class="flex items-center gap-1.5 bg-corp-900 border border-corp-800 px-2 py-1 rounded-lg text-xs font-mono">
            <span class="text-slate-500 text-[10px]">الرمز:</span>
            <span id="pass-display-${user.username}" class="text-slate-300 font-bold" data-pass="${user.password || ''}">••••••••</span>
            <button type="button" onclick="toggleCardPasswordReveal('${user.username}')" class="text-slate-400 hover:text-amber-400 cursor-pointer p-0.5" title="كشف / إخفاء كلمة المرور">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- الفروع المخصصة -->
        <div class="space-y-1">
          <span class="text-[10px] text-slate-500 font-bold">الفروع المخصصة للمعاينة:</span>
          <div class="flex flex-wrap gap-1">
            ${isAllBranches ? `
              <span class="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                كافة الفروع والمناطق (*)
              </span>
            ` : branches.length > 0 ? branches.map(b => `
              <span class="text-[10px] font-semibold bg-corp-900 text-slate-300 border border-corp-750 px-2 py-0.5 rounded-md">
                ${b}
              </span>
            `).join('') : `
              <span class="text-[10px] text-rose-400 font-bold">لم تُحدد فروع بعد</span>
            `}
          </div>
        </div>

        <!-- إجراءات الأخصائي -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-corp-850">
          <button type="button" onclick="editSpecialistUser('${user.username}')" class="px-2.5 py-1 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer">
            <i data-lucide="edit-2" class="w-3 h-3"></i>
            <span>تعديل</span>
          </button>
          ${isSam ? '' : `
            <button type="button" onclick="deleteSpecialistUserPrompt('${user.username}')" class="px-2.5 py-1 text-xs font-bold text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 border border-rose-400/30 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
              <span>حذف</span>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

// تصدير دوال العرض للنافذة العامة (Zero Regression Global Bridge)
if (typeof window !== 'undefined') {
  window.getStatusBadgeHtml = getStatusBadgeHtml;
  window.showToast = showToast;
  window.showModalInlineFeedback = showModalInlineFeedback;
  window.updateKPIs = updateKPIs;
  window.syncQuickDisplays = syncQuickDisplays;
  window.populateBranchSelect = populateBranchSelect;
  window.populateSpecialistSelect = populateSpecialistSelect;
  window.refreshMainSelects = refreshMainSelects;
  window.refreshBranchesUI = refreshBranchesUI;
  window.refreshSpecialistsUI = refreshSpecialistsUI;
  window.renderModalList = renderModalList;
  window.renderInlineDrawerList = renderInlineDrawerList;
  window.populateSectionTypeSelect = populateSectionTypeSelect;
  window.renderCategoryChecklist = renderCategoryChecklist;
  window.renderSectionManager = renderSectionManager;
  window.renderAuditCards = renderAuditCards;
  window.renderPrintSections = renderPrintSections;
  window.renderQuickTagsList = renderQuickTagsList;
  window.renderQuickAssigneesList = renderQuickAssigneesList;
  window.syncBrandingUI = syncBrandingUI;
  window.updateBrandingLivePreview = updateBrandingLivePreview;
  window.updateBulkExportSelectionCounter = updateBulkExportSelectionCounter;
  window.renderBulkExportUI = renderBulkExportUI;
  window.renderTeamManagementUI = renderTeamManagementUI;
  window.openArchivedAuditPreview = openArchivedAuditPreview;
  window.closeArchivedAuditPreview = closeArchivedAuditPreview;
  window.renderVisitSummary = renderVisitSummary;
  window.aggregateVisitAchievements = aggregateVisitAchievements;
  window.getEffectiveVisitSummary = getEffectiveVisitSummary;
}
