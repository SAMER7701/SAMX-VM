/**
 * SAMX-VM UI Renderers Layer
 * Version: 1.7.6
 * Architecture: Decoupled UI Rendering Routines + Smart Semantic Engine
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
import { autocorrectVmText } from './smartAuditor.js';

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
    result.push(`تكليف إدارة المعرض (${sec.actionAssignee || 'مدير المعرض'}) بمتابعة تنفيذ التوجيهات التشغيلية للقسم في الموعد المحدد.`);
  } else if (sec?.status === 'management_action') {
    result.push(`رفع طلب الصيانة والتدخل الإداري (${sec.actionAssignee || 'فريق الصيانة والتشغيل'}) لمعالجة الملاحظة فورياً.`);
  } else if (result.length < 2) {
    result.push('اكتمال التعديل الميداني الفوري وضبط معايير العرض.');
  }

  const unique = Array.from(new Set(result));
  return unique.slice(0, 3);
}

/**
 * تنظيف وإصلاح شوائب الاتجاه ثنائي اللغة (BiDi) والأقواس المكسورة والأحرف التائهة وتصحيح ترتيب العبارات الإنجليزية المعكوسة
 */
export function fixBrokenBidiText(str) {
  if (!str || typeof str !== 'string') return '';
  let out = str;

  // 1. إزالة عبارة "استكمال متطلبات" وبقايا البادئات التائهة
  out = out.replace(/استكمال\s+متطلبات\s*/g, '');
  out = out.replace(/(^|\s)[لافي]\s+(?=رصد\s+(?:قصور|ملحوظة)|تم\s+إنجاز)/g, '$1');
  out = out.replace(/(^|\s)\/\s*(?=تم\s+إنجاز|رصد\s+)/g, '$1');

  // 2. إصلاح الأقواس الفارغة أو المعكوسة حول المصطلحات الإنجليزية (مثل ()POSM أو :)Perfumes & Sunglasses)
  out = out.replace(/\(\)\s*([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*[A-Za-z0-9])/g, '($1)');
  out = out.replace(/([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*[A-Za-z0-9])\s*\(\)/g, '($1)');
  out = out.replace(/[:;]\s*\)\s*([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*[A-Za-z0-9])/g, ' ($1)');
  out = out.replace(/\(\s*:\s*/g, '(');
  out = out.replace(/:\s*\)/g, '');
  out = out.replace(/(^|[\u0600-\u06FF\s])\)\s*([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*[A-Za-z0-9])(?!\))/g, '$1($2)');
  out = out.replace(/\(\s*([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*[A-Za-z0-9])\s*\(/g, '($1)');

  // 3. تطبيع وتصحيح ترتيب الكلمات الإنجليزية المعكوسة في مسميات الأقسام المختلطة
  const reversedEnglishFixes = [
    { pattern: /\(\s*\b(?:AREA\s+CASHIER|CASHIER\s+AREA|AREA\s+CASH|CASH\s+AREA)\b\s*\)|\b(?:AREA\s+CASHIER|CASHIER\s+AREA|AREA\s+CASH|CASH\s+AREA)\b/gi, replacement: '(Cash Area)' },
    { pattern: /\(\s*\b(?:SECTION\s+MEN['’]?S|MEN['’]?S\s+SECTION)\b\s*\)|\b(?:SECTION\s+MEN['’]?S|MEN['’]?S\s+SECTION)\b/gi, replacement: '(Men’s Section)' },
    { pattern: /\(\s*\b(?:SECTION\s+WOMEN['’]?S|WOMEN['’]?S\s+SECTION)\b\s*\)|\b(?:SECTION\s+WOMEN['’]?S|WOMEN['’]?S\s+SECTION)\b/gi, replacement: '(Women’s Section)' },
    { pattern: /\(\s*\b(?:SECTION\s+KIDS?|KIDS?\s+SECTION)\b\s*\)|\b(?:SECTION\s+KIDS?|KIDS?\s+SECTION)\b/gi, replacement: '(Kids Section)' },
    { pattern: /\(\s*\b(?:ENTRANCE\s+BRANCH|BRANCH\s+ENTRANCE)\b\s*\)|\b(?:ENTRANCE\s+BRANCH|BRANCH\s+ENTRANCE)\b/gi, replacement: '(Branch Entrance)' },
    { pattern: /\(\s*\b(?:ROOM\s+STOCK|STOCK\s+ROOM)\b\s*\)|\b(?:ROOM\s+STOCK|STOCK\s+ROOM)\b/gi, replacement: '(Stock Room)' },
    { pattern: /\(\s*\b(?:ROOMS?\s+FITTING|FITTING\s+ROOMS?)\b\s*\)|\b(?:ROOMS?\s+FITTING|FITTING\s+ROOMS?)\b/gi, replacement: '(Fitting Rooms)' },
    { pattern: /\(\s*\b(?:DISPLAY\s+FACADE|FACADE\s+DISPLAY)\b\s*\)|\b(?:DISPLAY\s+FACADE|FACADE\s+DISPLAY)\b/gi, replacement: '(Facade Display)' },
    { pattern: /\(\s*\b(?:DISPLAY\s+WINDOW|WINDOW\s+DISPLAY)\b\s*\)|\b(?:DISPLAY\s+WINDOW|WINDOW\s+DISPLAY)\b/gi, replacement: '(Window Display)' },
    { pattern: /\(\s*\b(?:SUNGLASSES\s*&\s*PERFUMES|PERFUMES\s*&\s*SUNGLASSES)\b\s*\)|\b(?:SUNGLASSES\s*&\s*PERFUMES|PERFUMES\s*&\s*SUNGLASSES)\b/gi, replacement: '(Perfumes & Sunglasses)' }
  ];
  reversedEnglishFixes.forEach(({ pattern, replacement }) => {
    out = out.replace(pattern, (match) => {
      // الحفاظ على Cashier Area كما هي إذا كانت مقصودة صراحةً
      if (/cashier\s+area/i.test(match)) return '(Cashier Area)';
      return replacement;
    });
  });

  // إزالة الأقواس المضاعفة وضمان وجود مسافة فاصلة قبل القوس الإنجليزي بعد النص العربي
  out = out.replace(/\(\(\s*([^()]+?)\s*\)\)/g, '($1)');
  out = out.replace(/([\u0600-\u06FF])(\([A-Za-z])/g, '$1 $2');

  return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * عزل المقاطع الإنجليزية الكاملة والأقواس اللاتينية داخل عنصر واحد <bdi dir="ltr"> للعرض الآمن داخل سياق RTL
 * مع ضمان عدم تجزئة العبارات متعددة الكلمات إلى عدة وسوم bdi منفصلة
 */
export function wrapEnglishBidiHtml(str) {
  if (!str || typeof str !== 'string') return '';
  const cleaned = fixBrokenBidiText(str);

  // 1. تغليف أي عبارة إنجليزية بين قوسين مثل (Cash Area) أو (Men’s Section) أو (POSM) ككتلة LTR واحدة
  let html = cleaned.replace(/\(([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*)\)/g, '<bdi dir="ltr">($1)</bdi>');

  // 2. تغليف أي عبارة إنجليزية متصلة خارج وسوم <bdi> (كلمة متعددة الأحرف أو عدة كلمات إنجليزية متتالية)
  const parts = html.split(/(<bdi\b[^>]*>.*?<\/bdi>)/gi);
  html = parts.map(part => {
    if (/^<bdi\b/i.test(part)) return part;
    return part.replace(
      /(^|[\s،:])([A-Za-z]{2,}(?:[’'][A-Za-z]+)?(?:(?:\s+|\/|&)[A-Za-z0-9]+(?:[’'][A-Za-z]+)?)*)(?=[\s،:\.]|$)/g,
      '$1<bdi dir="ltr">$2</bdi>'
    );
  }).join('');

  return html;
}

/**
 * فحص ما إذا كان النص أو القسم يمثل رصداً سلبياً أو معياراً غير مكتمل/معلقاً
 */
export function isNegativeOrUnappliedFinding(text, section = null) {
  if (section) {
    const statuses = getSectionStatuses(section);
    const hasOnlyResolved = statuses.includes('resolved') && statuses.length === 1;
    // إذا كانت حالة القسم تتضمن متابعة للمتجر أو طلب صيانة/إدارة دون أن يكون مكتملاً 100%
    if (!hasOnlyResolved && (statuses.includes('store_followup') || statuses.includes('management_action'))) {
      return true;
    }
  }

  if (!text || typeof text !== 'string') return false;
  const str = text.toLowerCase();

  const negativeKeyPatterns = [
    /لم\s+يتم/i,
    /عدم\s+/i,
    /سوء\s+/i,
    /سواء\s+/i,
    /نقص(?:\s|$)/i,
    /عطل|عطال/i,
    /تلف/i,
    /تالف/i,
    /غياب/i,
    /لا\s+يوجد/i,
    /قصور/i,
    /تأخير/i,
    /فوضى/i,
    /إهمال/i,
    /غير\s+مطابق/i,
    /غير\s+مطبق/i,
    /غير\s+جاهز/i,
    /غير\s+مكتمل/i,
    /معالجة\s+جزئية/i,
    /متابعة\s+طلب/i,
    /العمل\s+على\s+إزالة/i,
    /تعديل\s+التسعير/i,
    /بحاجة\s+(إلى\s+)?(صيانة|تعديل|إصلاح|تغيير|استكمال)/i,
    /بانتظار/i,
    /ملاحظة\s+حرجة/i
  ];

  return negativeKeyPatterns.some(pattern => pattern.test(str));
}

const ACHIEVEMENT_VERB_REGEX = /(تم\s+(?:إنجاز|انجاز|تنفيذ|تطبيق)|إحلال|تطوير|تنسيق|إعادة\s+(?:تخطيط|ترتيب|تنسيق|توزيع|توجيه)|نقل|تهيئة|تحرير(?:\s+مسارات)?|ترتيب|تنظيم|ضبط|توحيد|تحسين|إبراز|تثبيت|توزيع|فرز|معالجة\s+تامة|تجهيز)/i;
const PENDING_DIRECTIVE_REGEX = /(متابعة\s+طلب|العمل\s+على\s+إزالة|تعديل\s+التسعير|تكليف|مطلوب|يرجى|يجب|توفير|رفع\s+طلب|صيانة|إصلاح|استكمال\s+النواقص|تغيير\s+الإضاءة|بانتظار)/i;

/**
 * المحلل الدلالي الموحد للأقسام (Smart Semantic Engine)
 * يفصل القسم إلى:
 * 1) executedAchievements: الإنجازات والتطويرات الميدانية المنفذة فعلياً
 * 2) pendingDirectives: التكليفات المعلقة والقصور التشغيلي والمعايير غير المطبقة
 * مع منع تسمية أي بند سلبي بعبارة "معيار مؤكد" أو "تم إنجاز" (Antonym Blocker).
 */
export function analyzeSectionSemantics(section, idx = 0) {
  const cleanTitle = fixBrokenBidiText(sanitizeSectionTitle(section?.title || section?.name || '', idx));
  const statuses = getSectionStatuses(section);
  const isFollowup = statuses.includes('store_followup');
  const isAction = statuses.includes('management_action');
  const isOnlyResolved = statuses.includes('resolved') && statuses.length === 1;

  const rawNotes = (section?.notes || section?.note || section?.justification || '').trim();
  const correctedNotes = fixBrokenBidiText(
    typeof autocorrectVmText === 'function' ? autocorrectVmText(rawNotes) : rawNotes
  );
  const rawActionNotes = (section?.actionNotes || section?.actionRequired || '').trim();
  const correctedActionNotes = fixBrokenBidiText(
    typeof autocorrectVmText === 'function' ? autocorrectVmText(rawActionNotes) : rawActionNotes
  );

  const checklist = Array.isArray(section?.checklist) ? section.checklist : [];
  const tags = Array.isArray(section?.tags) ? section.tags : [];

  const executedAchievements = [];
  const pendingDirectives = [];

  const stripLegacyPrefixes = (clause) => {
    return fixBrokenBidiText(
      clause
        .replace(/^[\s•\-\*✓▪✔⚠️🚨\d\.\)\-–—]+/, '')
        .replace(/^(معيار\s+مؤكد|ملاحظة\s+غير\s+مطابقة|عدم\s+التزام\s+بـ)\s*[:\-\s]*/i, '')
        .replace(/^تم\s+إنجاز\s+التطوير\s+الميداني\s*—\s*/i, '')
        .replace(/^رصد\s+(?:ملحوظة|قصور)\s+تتطلب\s+المعالجة\s*—\s*/i, '')
        .trim()
    );
  };

  // تفكيك الملاحظات إلى عبارات مستقلة للفرز الدلالي الدقيق
  const splitNoteClauses = (txt) => {
    if (!txt) return [];
    const lines = txt.split(/\n+|\||؛/).map(l => l.trim()).filter(Boolean);
    const clauses = [];
    lines.forEach(line => {
      // تقسيم الجمل المفصولة بنقطة ومسافة أو بفاصلة عند تداخل إنجاز وتكليف
      const subParts = line
        .split(/\.\s+(?=[\u0600-\u06FF])/)
        .flatMap(p => {
          const cleanP = p.trim();
          // إذا احتوت الجملة على فاصلة ثم محفز تكليف/متابعة، افصل التكليف عن الإنجاز
          if (cleanP.includes('،') && /(?:،\s*)(متابعة\s+طلب|العمل\s+على|تعديل\s+التسعير|مع\s+ضرورة|يرجى|مطلوب|لم\s+يتم|عدم\s+|سوء\s+|نقص\s+|عطل|تلف|غياب)/.test(cleanP)) {
            return cleanP.split(/،\s+(?=متابعة\s+طلب|العمل\s+على|تعديل\s+التسعير|مع\s+ضرورة|يرجى|مطلوب|لم\s+يتم|عدم\s+|سوء\s+|نقص\s+|عطل|تلف|غياب)/);
          }
          return [cleanP];
        })
        .map(stripLegacyPrefixes)
        .filter(c => c.length > 2);
      clauses.push(...subParts);
    });
    return clauses;
  };

  const noteClauses = splitNoteClauses(correctedNotes);
  const isGenericBoilerplate = !correctedNotes ||
    correctedNotes.includes('تم التنفيذ والتعديل الميداني وفق المعايير المعتمدة بدليل العرض والتنسيق التجاري') ||
    correctedNotes.includes('التأكد من سلامة وتناسق واجهات العرض وتركيز الإضاءة وزوايا التوجيه');

  if (!isGenericBoilerplate) {
    noteClauses.forEach(clause => {
      if (!clause || /معالجة\s+كاملة|100%/.test(clause)) return;
      const isNeg = isNegativeOrUnappliedFinding(clause, null);
      const isPendingDir = PENDING_DIRECTIVE_REGEX.test(clause);
      const hasAchVerb = ACHIEVEMENT_VERB_REGEX.test(clause);

      if (isNeg || (isPendingDir && !hasAchVerb)) {
        pendingDirectives.push(clause);
      } else if (isPendingDir && hasAchVerb) {
        // إذا وُجد فعل إنجاز وتكليف بنفس العبارة القصيرة بدون فاصل، صنفه كتكليف إذا بدأ به، أو إنجاز
        if (/^(متابعة|العمل\s+على|تعديل\s+التسعير|مطلوب|يرجى|تكليف)/.test(clause)) {
          pendingDirectives.push(clause);
        } else {
          executedAchievements.push(clause);
        }
      } else {
        executedAchievements.push(clause);
      }
    });
  }

  // معالجة actionNotes / actionRequired إن وُجدت
  if (correctedActionNotes) {
    splitNoteClauses(correctedActionNotes).forEach(clause => {
      if (clause && !pendingDirectives.includes(clause)) {
        pendingDirectives.unshift(clause);
      }
    });
  }

  // فحص بنود الـ Checklist بشكل فردي مستقل عن حالة القسم (Antonym Blocker)
  checklist.forEach(rawItem => {
    const item = stripLegacyPrefixes(typeof autocorrectVmText === 'function' ? autocorrectVmText(rawItem) : rawItem);
    if (!item || /معالجة\s+كاملة|100%/.test(item)) return;
    if (isNegativeOrUnappliedFinding(item, null)) {
      pendingDirectives.push(`عدم التزام بـ: ${item}`);
    } else if (executedAchievements.length === 0) {
      executedAchievements.push(item);
    }
  });

  // استخدام الخيارات الفرعية لحالتي المتابعة والصيانة
  const rawResolvedSubs = getSectionSubOptions(section, 'resolved').filter(
    s => s && s !== 'معالجة كاملة 100%' && s !== 'معالجة كاملة' && !s.includes('100%')
  );
  const followupSubs = getSectionSubOptions(section, 'store_followup').map(fixBrokenBidiText).filter(Boolean);
  const mgmtSubs = getSectionSubOptions(section, 'management_action').map(fixBrokenBidiText).filter(Boolean);

  if (isFollowup) {
    followupSubs.forEach(sub => {
      if (!pendingDirectives.some(d => d.includes(sub))) {
        pendingDirectives.push(sub);
      }
    });
  }
  if (isAction) {
    mgmtSubs.forEach(sub => {
      if (!pendingDirectives.some(d => d.includes(sub))) {
        pendingDirectives.push(sub);
      }
    });
  }

  // استكمال احتياطي من الوسوم أو المبررات إذا خلا السجل من النصوص
  if (executedAchievements.length === 0 && pendingDirectives.length === 0) {
    if (tags.length > 0) {
      executedAchievements.push(tags.slice(0, 3).join('، '));
    } else if (!isFollowup && !isAction) {
      const justs = getDynamicJustifications(section);
      if (justs.length > 0) executedAchievements.push(fixBrokenBidiText(justs[0]));
    }
  }

  if ((isFollowup || isAction) && pendingDirectives.length === 0) {
    pendingDirectives.push(
      isAction ? 'طلب صيانة ومعالجة تشغيلية فورية بالقسم' : 'متابعة المعايير اليومية والتشغيلية بالقسم'
    );
  }

  // إزالة التكرار المعياري والتطابق الجزئي بين العبارات السلبية والإنجازات (يمنع تكرار الصف 12)
  const normalizePhraseForDedup = (s) => s
    .replace(/^(?:عدم\s+التزام\s+بـ|ملاحظة\s+غير\s+مطابقة|رصد\s+قصور\s+يتطلب\s+المعالجة\s*—|تمت\s+معالجة\s+وإنهاء\s+ملاحظة)\s*[:\-\s]*/i, '')
    .replace(/[•\.\،,:\-\s]+/g, ' ')
    .trim()
    .toLowerCase();

  const dedup = (arr) => {
    const result = [];
    const resultNorms = [];
    arr.forEach(raw => {
      const cleaned = raw.replace(/[.\s]+$/, '').trim();
      if (!cleaned) return;
      const norm = normalizePhraseForDedup(cleaned);
      if (!norm) return;

      const isPrefixedDuplicate = /^(?:عدم\s+التزام\s+بـ|ملاحظة\s+غير\s+مطابقة)\s*:/i.test(cleaned);
      let shouldSkip = false;
      for (let i = 0; i < resultNorms.length; i++) {
        const existingNorm = resultNorms[i];
        if (existingNorm === norm || existingNorm.includes(norm)) {
          shouldSkip = true;
          break;
        }
        if (norm.includes(existingNorm)) {
          // إذا كانت العبارة الجديدة مجرد تكرار ببادئة "عدم التزام بـ:" على نفس النص الموجود، تخطّاها
          if (isPrefixedDuplicate) {
            shouldSkip = true;
            break;
          }
          // وإلا فالعبارة الجديدة أغنى بدون بادئة تكرارية؛ نستبدل الأقدم المختصرة بالأغنى
          result[i] = cleaned;
          resultNorms[i] = norm;
          shouldSkip = true;
          break;
        }
      }
      if (!shouldSkip) {
        result.push(cleaned);
        resultNorms.push(norm);
      }
    });
    return result;
  };

  const finalAchievements = dedup(executedAchievements);
  const finalPending = dedup(pendingDirectives);

  let nature = 'achievement';
  if (finalAchievements.length > 0 && (finalPending.length > 0 || isFollowup || isAction)) {
    nature = 'dual';
  } else if (finalPending.length > 0 || isFollowup || isAction) {
    nature = 'negative';
  }

  const primaryAchievement = finalAchievements.length > 0
    ? finalAchievements.slice(0, 2).join('، ')
    : (tags.length > 0 ? tags.slice(0, 3).join('، ') : '');

  const primaryPending = finalPending.length > 0
    ? finalPending.slice(0, 2).join(' • ')
    : '';

  const fullAchievementsText = finalAchievements.length > 0
    ? finalAchievements.join(' • ')
    : (tags.length > 0 ? tags.join(' • ') : '');

  const fullPendingText = finalPending.length > 0
    ? finalPending.join(' • ')
    : '';

  const assignee = (section?.actionAssignee && section.actionAssignee.trim())
    ? section.actionAssignee.trim()
    : (isAction ? 'إدارة الصيانة / الإدارة العليا' : 'إدارة المعرض');
  const dueDate = (section?.actionDueDate && section.actionDueDate.trim())
    ? section.actionDueDate.trim()
    : ((isFollowup || isAction) ? 'خلال أسبوع' : '');

  return {
    nature,
    cleanTitle,
    executedAchievements: finalAchievements,
    pendingDirectives: finalPending,
    primaryAchievement,
    primaryPending,
    fullAchievementsText,
    fullPendingText,
    resolvedSubs: rawResolvedSubs,
    followupSubs,
    mgmtSubs,
    tags,
    assignee,
    dueDate,
    isOnlyResolved,
    isFollowup,
    isAction
  };
}

/**
 * صياغة إنجاز أو رصد الـ VM الميداني بمرشح النوايا الذكي (Context-Aware Intent Filter)
 * - يفرز نية التطوير الميداني المنفذ: "تم إنجاز التطوير الميداني — [الإجراء الميداني]"
 * - يفرز نية القصور والبنود غير المطبقة: "رصد قصور يتطلب المعالجة — [توصيف القصور]"
 */
export function formatArabicVmAction(actionSnippet, section = null) {
  if (!actionSnippet || typeof actionSnippet !== 'string') {
    return 'تم إنجاز التطوير الميداني — إعادة ترتيب وتنسيق المعروضات وفق معايير الهوية البصرية';
  }

  // 1. تطبيق التدقيق اللغوي التلقائي وتصحيح الأخطاء الشائعة
  let text = (typeof autocorrectVmText === 'function') 
    ? autocorrectVmText(actionSnippet) 
    : actionSnippet;
  text = fixBrokenBidiText(text);

  text = text
    .replace(/^[\[\(\s]+|[\]\)\s]+$/g, '')
    .replace(/^إنجاز التعديل الميداني الفوري\s*[:\-\s]*/g, '')
    .replace(/^التعديل الميداني الفوري\s*[:\-\s]*/g, '')
    .replace(/\s*واعتماد التنسيق النهائي للموقع(\s*بصورة معتمدة)?\s*\.?/g, '')
    .replace(/\s*واعتماد التنسيق\s*\.?$/g, '')
    .replace(/[:\.\s]+$/g, '')
    .trim();

  if (!text) {
    return 'تم إنجاز التطوير الميداني — إعادة ترتيب وتنسيق المعروضات وفق معايير الهوية البصرية';
  }

  // 2. مرشح النوايا الذكي (Context-Aware Intent Filter)
  const hasNegativeFinding = isNegativeOrUnappliedFinding(text, null);
  const isSectionUnresolved = section && isNegativeOrUnappliedFinding(null, section);

  // أ. مسار رصد القصور الذي يتطلب المعالجة (Negative / Unapplied Finding Intent)
  if (hasNegativeFinding || (isSectionUnresolved && (/^(عدم|لم|سوء|سواء|نقص|عطل|عطال|تلف|تالف|غياب|غير|قصور|ملاحظة)/.test(text)))) {
    text = text.replace(/^تم[ت]?\s+(إنجاز\s+التطوير\s+الميداني\s*—\s*|إنجاز|انجاز|تنفيذ|تطبيق)\s+/, '');
    text = text.replace(/^تم[ت]?\s+/, '');
    text = text.replace(/^رصد\s+(?:ملحوظة|قصور)\s+تتطلب\s+(?:المعالجة|المتابعة)\s*—\s*/, '');
    text = text.replace(/^رصد\s+قصور\s+يتطلب\s+المعالجة\s*—\s*/, '');
    text = text.replace(/^(?:ملاحظة\s+غير\s+مطابقة|عدم\s+التزام\s+بـ)\s*[:\-\s]*/, '');

    if (/^لم\s+يتم\s+تطبيق\s+/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — عدم تطبيق ' + text.replace(/^لم\s+يتم\s+تطبيق\s+/, '');
    }
    if (/^لم\s+يتم\s+/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — عدم ' + text.replace(/^لم\s+يتم\s+/, '');
    }
    if (/^(عدم|سوء|نقص|غياب)\s+/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — ' + text;
    }
    if (/^(عطل|عطال)\s+/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — عطل في ' + text.replace(/^(عطل|عطال)\s+(في\s+)?/, '');
    }
    if (/^تلف\s+/.test(text) || /^تالف/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — تلفيات في ' + text.replace(/^(تلفيات|تلف|تالف)\s+(في\s+)?/, '');
    }
    if (/^غير\s+/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — حالة ' + text;
    }
    if (/^قصور\s+/.test(text)) {
      return 'رصد قصور يتطلب المعالجة — قصور في ' + text.replace(/^قصور\s+(في\s+)?/, '');
    }

    return 'رصد قصور يتطلب المعالجة — ' + text;
  }

  // ب. مسار إنجاز التطوير الميداني (Major Executed Improvement Intent)
  text = text.replace(/^تم[ت]?\s+(إنجاز\s+التطوير\s+الميداني\s*—\s*|إنجاز|انجاز|تنفيذ)\s+/, '');
  text = text.replace(/^تم[ت]?\s+/, '');
  text = text.replace(/^رصد\s+(?:ملحوظة|قصور)\s+(?:تتطلب|يتطلب)\s+(?:المعالجة|المتابعة)\s*—\s*/, '');

  if (/^سلامة\s+ونظافة\s+المانيكان/.test(text)) {
    return 'تم إنجاز التطوير الميداني — ضبط ونظافة المانيكانات والتأكد من استقامة الوقفة والتثبيت';
  }
  if (/^نظافة\s+وضبط\s+المانيكان/.test(text)) {
    return 'تم إنجاز التطوير الميداني — ضبط ونظافة المانيكانات وضبط زوايا التثبيت';
  }
  if (/^(إحلال|تحرير|تطوير|نقل|توحيد|إعادة|تنسيق|ترتيب|ضبط|مراجعة|تطبيق|معالجة|تعديل|تحسين|إبراز|تجديد|توزيع)\s+و/.test(text)) {
    return 'تم إنجاز التطوير الميداني — ' + text;
  }
  if (/^إحلال\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — إحلال وتنسيق ' + text.replace(/^إحلال\s+/, '');
  }
  if (/^تحرير\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — تحرير مسارات الحركة وانسيابية ' + text.replace(/^تحرير\s+(مسارات\s+|مسار\s+)?/, '');
  }
  if (/^تطوير\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — تطوير وتحديث ' + text.replace(/^تطوير\s+/, '');
  }
  if (/^نقل\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — نقل وإعادة تهيئة ' + text.replace(/^نقل\s+/, '');
  }
  if (/^توحيد\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — توحيد فئات وعرض ' + text.replace(/^توحيد\s+/, '');
  }
  if (/^إعادة\s+تنسيق\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — إعادة تنسيق وترتيب ' + text.replace(/^إعادة\s+تنسيق\s+/, '');
  }
  if (/^إعادة\s+ترتيب\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — إعادة ترتيب وتنسيق ' + text.replace(/^إعادة\s+ترتيب\s+/, '');
  }
  if (/^إعادة\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — ' + text;
  }
  if (/^تنسيق\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — إعادة تنسيق وترتيب ' + text.replace(/^تنسيق\s+/, '');
  }
  if (/^ترتيب\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — ترتيب وتنسيق ' + text.replace(/^ترتيب\s+/, '');
  }
  if (/^ضبط\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — ضبط وتحسين ' + text.replace(/^ضبط\s+/, '');
  }
  if (/^مراجعة\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — مراجعة وضبط ' + text.replace(/^مراجعة\s+/, '');
  }
  if (/^تطبيق\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — تطبيق ' + text.replace(/^تطبيق\s+/, '');
  }
  if (/^معالجة\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — معالجة وضبط ' + text.replace(/^معالجة\s+/, '');
  }
  if (/^تعديل\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — تعديل وتنسيق ' + text.replace(/^تعديل\s+/, '');
  }
  if (/^تحسين\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — تحسين وتطوير ' + text.replace(/^تحسين\s+/, '');
  }
  if (/^إبراز\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — إبراز وتنسيق ' + text.replace(/^إبراز\s+/, '');
  }
  if (/^تجديد\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — تجديد وترتيب ' + text.replace(/^تجديد\s+/, '');
  }
  if (/^توزيع\s+/.test(text)) {
    return 'تم إنجاز التطوير الميداني — توزيع وتنظيم ' + text.replace(/^توزيع\s+/, '');
  }

  if (isSectionUnresolved) {
    return 'رصد قصور يتطلب المعالجة — ' + text;
  }

  return 'تم إنجاز التطوير الميداني — ' + text;
}

/**
 * دالة تطهير وتوحيد عناوين الأقسام وإزالة الشوائب المعكوسة الناتجة عن اتجاهات RTL
 * وتحويل المصطلحات الإنجليزية الشائعة لصيغ عربية أنيقة مع وضع الاسم الإنجليزي بين قوسين
 */
export function sanitizeSectionTitle(rawTitle, idx = 0) {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return `القسم ${idx + 1}`;
  }

  let title = fixBrokenBidiText(rawTitle.trim());

  // 1. إزالة المقاطع المكسورة والبادئات المشوهة المعكوسة من نصوص RTL
  title = title
    .replace(/^(لقن\s*مت|مت|لقسم|تم\s*نقل|تم)\s*[:\-\s]*/i, '')
    .replace(/^[:\.\-\s]+|[:\.\-\s]+$/g, '')
    .trim();

  // 2. إزالة الأقواس المربعة والبادئات المتكررة
  title = title.replace(/^\[\s*([^\]]+?)\s*\]$/, '$1').trim();
  title = title.replace(/^(قسم\s+)+/i, 'قسم ').trim();
  title = title.replace(/^(SECTION\s+)+/i, 'SECTION ').trim();

  // 3. تطبيع العناوين الإنجليزية الشائعة وتحويلها لصيغة عربية أنيقة مع وضع الاسم الإنجليزي بين قوسين
  const englishSectionMap = [
    { pattern: /^(branch\s+entrance|entrance|main\s+entrance)$/i, arabic: 'مدخل المعرض (Branch Entrance)' },
    { pattern: /^(section\s+men[’']?s|men[’']?s\s+section|men[’']?s|men)$/i, arabic: 'قسم الملابس الرجالية (Men’s Section)' },
    { pattern: /^(section\s+women[’']?s|women[’']?s\s+section|women[’']?s|women)$/i, arabic: 'قسم الملابس النسائية (Women’s Section)' },
    { pattern: /^(section\s+kids?|kids?\s+section|kids?|children)$/i, arabic: 'قسم الأطفال (Kids Section)' },
    { pattern: /^(footwear|shoes\s+section|shoes)$/i, arabic: 'قسم الأحذية (Footwear)' },
    { pattern: /^(perfumes?|fragrances?|perfumes?\s*&\s*sunglasses)$/i, arabic: 'قسم العطور والنظارات (Perfumes & Sunglasses)' },
    { pattern: /^(accessories|accessory)$/i, arabic: 'قسم الإكسسوارات (Accessories)' },
    { pattern: /^(headgear|ghutra|shemagh)$/i, arabic: 'قسم الأشمغة والغتر (Shemagh & Ghutra)' },
    { pattern: /^(cashier\s+area|cashier|pos)$/i, arabic: 'منطقة المحاسبة والكاشير (Cashier Area)' },
    { pattern: /^(window\s+display|display\s+window|facade)$/i, arabic: 'واجهة المعرض الرئيسية (Facade Display)' },
    { pattern: /^(fitting\s+rooms?|fitting\s+room)$/i, arabic: 'غرف القياس (Fitting Rooms)' },
    { pattern: /^(warehouse|stock\s*room|backstore)$/i, arabic: 'المستودع والمخزن (Stock Room)' },
  ];

  for (const item of englishSectionMap) {
    if (item.pattern.test(title)) {
      return item.arabic;
    }
  }

  // 4. إذا كان الاسم يحتوي على "SECTION Foo"
  if (/^SECTION\s+/i.test(title)) {
    const term = title.replace(/^SECTION\s+/i, '').trim();
    for (const item of englishSectionMap) {
      if (item.pattern.test(term)) {
        return item.arabic;
      }
    }
    return `قسم ${term} (${term})`;
  }

  // 5. إذا كان الاسم نقيًا وإنجليزيًا بالكامل (أحرف لاتينية فقط)
  if (/^[a-zA-Z0-9\s’'\-&]+$/.test(title) && title.length > 2) {
    return `قسم ${title} (${title})`;
  }

  // 6. تنظيف أي أقواس مكسورة أو زيادات
  title = fixBrokenBidiText(title.replace(/[:\.\s]+$/, '').trim());

  return title || `القسم ${idx + 1}`;
}

/**
 * دالة مساعدة لتنقية نصوص نقاط الملخص من أي عبارات نمطية وأقواس أو فواصل زائدة
 */
export function cleanSummaryPointText(line) {
  if (!line || typeof line !== 'string') return '';
  let str = (typeof autocorrectVmText === 'function') ? autocorrectVmText(line) : line;
  str = fixBrokenBidiText(str);
  str = str.replace(/^[\s•\-\*✓▪\d\.\)\-–—\s]+/, '').trim();

  // تنظيف البادئات المعكوسة أو المكسورة
  str = str.replace(/^(لقن\s*مت|مت|لقسم)\s*:\s*/i, '');
  str = str.replace(/^:+[\s\-]*/, '');

  // 1. تنظيف وإزالة عبارة "(معالجة كاملة 100%)" و "(معالجة كاملة)" وكافة لواحقها من الملخص
  str = str.replace(/\s*\(\s*معالجة كاملة(\s*100%?)?\s*\)/g, '');
  str = str.replace(/\s*معالجة كاملة\s*\(?100%?\)?/g, '');
  str = str.replace(/\(\s*([^\)]*?)\s*\(\s*([^)]*?)\s*\)\s*([^\)]*?)\)/g, '($1 $2 $3)');
  str = str.replace(/\(\s*([^()]*?)\s*\(\s*(\d+%?)\s*\)\s*([^()]*?)\)/g, '($1 $2 $3)');

  // 2. إزالة العبارات التكرارية والنمطية مثل "إنجاز التعديل الميداني الفوري" و"استكمال متطلبات"
  str = str.replace(/إنجاز التعديل الميداني الفوري\s*[:\-\s]*/g, '');
  str = str.replace(/التعديل الميداني الفوري\s*[:\-\s]*/g, '');
  str = str.replace(/\s*واعتماد التنسيق النهائي للموقع(\s*بصورة معتمدة)?\s*\.?/g, '');
  str = str.replace(/\s*واعتماد التنسيق\s*\.?$/g, '');
  str = str.replace(/استكمال\s+متطلبات\s*/g, '');

  // 3. إزالة الأقواس المربعة حول اسم القسم في البداية وتنظيف النقطتين والرموز
  str = str.replace(/^\[\s*([^\]:]+?)\s*[:\s]*\]\s*[:\s]*/, '$1: ');
  str = str.replace(/^\[\s*([^\]]+?)\s*\]\s*[:\s]*/, '$1: ');
  str = str.replace(/^([^:]+?)\s*[:\.]+\s*:\s*/, '$1: ');
  str = str.replace(/:\s*\./g, ':');

  // 4. إزالة تكرار النقطتين أو النقاط أو الفواصل الزائدة مع الحفاظ على فاصل الأنبوب |
  str = str.replace(/:\s*:\s*/g, ': ');
  str = str.replace(/\.{2,}/g, '.');
  str = str.replace(/\s*\|\s*/g, ' | ');
  str = str.replace(/\s+/g, ' ');

  // 5. ضبط النقطة الختامية
  str = str.replace(/\s*\.\s*$/, '').trim();
  if (str) {
    str = str + '.';
  }

  return str;
}

/**
 * دالة لتنسيق نقطة الملخص كعنصر HTML يبرز اسم القسم والتكليفات الموجهة للفرع/الصيانة
 * مع دعم التنسيق ثنائي الطبيعة (Inline Pipe |) وعزل الاتجاه ثنائي اللغة (<bdi>)
 */
export function formatSummaryPointHtml(point) {
  const cleaned = cleanSummaryPointText(point);

  let colonIdx = -1;
  const matchAction = cleaned.match(/:\s*(تم إنجاز التطوير الميداني|رصد قصور يتطلب المعالجة|رصد ملحوظة تتطلب المعالجة|تم إنجاز|رصد قصور|رصد ملحوظة|إعادة|تنسيق|ترتيب|ضبط|مراجعة|تطبيق|إحلال|تحرير|تطوير|نقل|توحيد|تكليف|طلب)/);
  if (matchAction && matchAction.index !== undefined) {
    colonIdx = matchAction.index;
  } else {
    colonIdx = cleaned.indexOf(':');
  }
  
  let titleHtml = '';
  let body = cleaned;

  if (colonIdx > 0 && colonIdx < 90) {
    let rawTitle = cleaned.substring(0, colonIdx).trim();
    let title = sanitizeSectionTitle(rawTitle);
    title = title.replace(/[:\.\s]+$/, '');
    titleHtml = `<bdi class="font-black text-slate-950">${wrapEnglishBidiHtml(title)}:</bdi>&lrm; `;
    body = cleaned.substring(colonIdx + 1).trim();
  }

  // تقسيم الأجزاء المفصولة بـ | لعرض كل جزء بنظافة وتنسيق كبسولة مستقل
  const segments = body.split(/\s*\|\s*/).filter(Boolean);
  const formattedSegments = segments.map((seg, segIdx) => {
    let part = wrapEnglishBidiHtml(seg);

    // 1. شارة إنجاز التطوير الميداني (Emerald Pill)
    if (part.includes('تم إنجاز التطوير الميداني — ')) {
      part = part.replace(
        'تم إنجاز التطوير الميداني — ',
        '<span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold ml-1 align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span><span>تم إنجاز التطوير الميداني</span></span> '
      );
    }

    // 2. شارة رصد القصور الذي يتطلب المعالجة (Rose Pill)
    if (part.includes('رصد قصور يتطلب المعالجة — ')) {
      part = part.replace(
        'رصد قصور يتطلب المعالجة — ',
        '<span class="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold ml-1 align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span><span>رصد قصور يتطلب المعالجة</span></span> '
      );
    }
    if (part.includes('رصد ملحوظة تتطلب المعالجة — ')) {
      part = part.replace(
        'رصد ملحوظة تتطلب المعالجة — ',
        '<span class="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold ml-1 align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span><span>رصد قصور يتطلب المعالجة</span></span> '
      );
    }

    // 3. شارة تكليف المتابعة / التكليف العاجل / طلب الصيانة بعد فاصل |
    if (/^تكليف متابعة/.test(seg.trim())) {
      const colonPos = part.indexOf(':');
      if (colonPos > 0) {
        const pillLabel = part.substring(0, colonPos).trim();
        const pillBody = part.substring(colonPos + 1).trim();
        part = `<span class="inline-flex items-center gap-1 text-amber-900 bg-amber-50 border border-amber-300/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold ml-1 align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span><span>${pillLabel}</span></span> <span class="text-amber-950 font-semibold">${pillBody}</span>`;
      } else {
        part = `<span class="inline-flex items-center gap-1 text-amber-900 bg-amber-50 border border-amber-300/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span><span>${part}</span></span>`;
      }
    } else if (/^(تكليف عاجل|طلب صيانة)/.test(seg.trim())) {
      const colonPos = part.indexOf(':');
      if (colonPos > 0) {
        const pillLabel = part.substring(0, colonPos).trim();
        const pillBody = part.substring(colonPos + 1).trim();
        part = `<span class="inline-flex items-center gap-1 text-rose-900 bg-rose-50 border border-rose-300/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold ml-1 align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span><span>${pillLabel}</span></span> <span class="text-rose-950 font-semibold">${pillBody}</span>`;
      } else {
        part = `<span class="inline-flex items-center gap-1 text-rose-900 bg-rose-50 border border-rose-300/90 px-1.5 py-0.5 rounded text-[0.86em] font-bold align-baseline"><span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span><span>${part}</span></span>`;
      }
    }

    // توافق خلفي مع الصيغة القديمة داخل نفس المقطع إن وجدت
    part = part.replace(/—\s*\[(تكليف متابعة[^\]]+)\]/g, (match, content) => {
      return `<span class="inline-flex items-center gap-1 text-amber-900 bg-amber-50 border border-amber-300/80 px-1.5 py-0.5 rounded text-[0.86em] font-bold mx-1 align-baseline">${content}</span>`;
    });
    part = part.replace(/—\s*\[(طلب صيانة[^\]]+)\]/g, (match, content) => {
      return `<span class="inline-flex items-center gap-1 text-rose-900 bg-rose-50 border border-rose-300/80 px-1.5 py-0.5 rounded text-[0.86em] font-bold mx-1 align-baseline">${content}</span>`;
    });

    return part;
  });

  const joinedBody = formattedSegments.join(' <span class="mx-1.5 text-slate-400 font-black select-none">|</span> ');
  return `${titleHtml}<span class="font-medium text-slate-800">${joinedBody}</span>`;
}

/**
 * دالة ذكية لتجميع ملخص إنجازات وتعديلات الزيارة الميدانية تلقائياً من أقسام الجولة الموثقة
 * تعتمد على المحلل الدلالي analyzeSectionSemantics لفصل الأقسام ثنائية الطبيعة (Dual-Nature)
 * ومنع خلط الإنجازات المنفذة مع التكليفات المعلقة أو القصورات التشغيلية.
 */
export function aggregateVisitAchievements(audit = null) {
  const activeAudit = audit || currentAudit;
  const sections = (activeAudit && Array.isArray(activeAudit.sections)) ? activeAudit.sections : [];

  if (sections.length === 0) {
    return [
      'الواجهات ونقاط الجذب: تم إنجاز التطوير الميداني — مراجعة جاهزية الواجهات الرئيسية وتطبيق معايير الهوية البصرية المعتمدة.',
      'التنسيق التجاري: تم إنجاز التطوير الميداني — توحيد فئات العرض وضبط اتساق وتوزيع نقاط الجذب وفق الأدلة المعتمدة.'
    ];
  }

  const points = [];
  const seenGenericDirectives = new Set();
  const genericDirectivePatterns = [
    'استكمال الجاهزية والنواقص',
    'المحافظة على الشكل العام',
    'الالتزام بالمعايير اليومية',
    'متابعة المعايير والتوجيهات',
    'متابعة الصيانة والتوريد'
  ];

  sections.forEach((sec, idx) => {
    const sem = analyzeSectionSemantics(sec, idx);
    const dueClause = sem.dueDate ? ` (الموعد: ${sem.dueDate})` : '';

    if (sem.nature === 'achievement') {
      // قاعدة أ: قسم إنجاز صرف (Pure Achievement)
      let achBody = formatArabicVmAction(sem.primaryAchievement || 'تنسيق وترتيب المعروضات وفق معايير الهوية', null);
      if (sem.resolvedSubs.length > 0 && sem.isOnlyResolved) {
        achBody += ` (${sem.resolvedSubs.join('، ')})`;
      }
      points.push(cleanSummaryPointText(`${sem.cleanTitle}: ${achBody}.`));
      return;
    }

    if (sem.nature === 'dual') {
      // قاعدة ب: قسم ثنائي الطبيعة (Dual-Nature: إنجاز منفذ + تكليف متابعة)
      const achBody = formatArabicVmAction(sem.primaryAchievement, null);

      let rawDirective = sem.primaryPending || 'متابعة المعايير اليومية والتشغيلية';
      const isGeneric = genericDirectivePatterns.some(p => rawDirective.includes(p));
      if (isGeneric) {
        if (seenGenericDirectives.has(rawDirective)) {
          rawDirective = sem.isAction ? 'معالجة فورية للصيانة والتشغيل' : 'متابعة تنفيذ التوجيهات التشغيلية';
        } else {
          seenGenericDirectives.add(rawDirective);
        }
      }

      const directiveLabel = sem.isAction ? 'طلب صيانة/إدارة' : 'تكليف متابعة';
      const fullDual = `${sem.cleanTitle}: ${achBody}. | ${directiveLabel} لـ (${sem.assignee}): ${rawDirective}${dueClause}.`;
      points.push(cleanSummaryPointText(fullDual));
      return;
    }

    // قاعدة ج: قسم قصور سلبي صرف (Pure Negative Finding)
    const rawNeg = sem.pendingDirectives[0] || sem.primaryPending || 'قصور في تطبيق المعايير التشغيلية';
    let negBody = formatArabicVmAction(rawNeg, sec);
    if (!negBody.startsWith('رصد قصور يتطلب المعالجة')) {
      negBody = `رصد قصور يتطلب المعالجة — ${negBody.replace(/^تم إنجاز التطوير الميداني\s*—\s*/, '')}`;
    }

    let actionDirective = sem.pendingDirectives.length > 1
      ? sem.pendingDirectives.slice(1).join('، ')
      : (sem.isAction ? 'معالجة وإصلاح العطل فوراً' : 'معالجة الملاحظة وتصحيح الوضع');

    const isGenericNeg = genericDirectivePatterns.some(p => actionDirective.includes(p));
    if (isGenericNeg && seenGenericDirectives.has(actionDirective)) {
      actionDirective = 'تصحيح الملاحظة فوراً';
    } else if (isGenericNeg) {
      seenGenericDirectives.add(actionDirective);
    }

    const negLabel = sem.isAction ? 'طلب صيانة/إدارة' : 'تكليف عاجل';
    const fullNeg = `${sem.cleanTitle}: ${negBody}. | ${negLabel} لـ (${sem.assignee}): ${actionDirective}${dueClause}.`;
    points.push(cleanSummaryPointText(fullNeg));
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

      <!-- بنود معايير وملاحظات الـ VM للقسم -->
      ${sec.checklist && sec.checklist.length > 0 ? `
        <div class="mb-3 bg-corp-950/70 p-2.5 rounded-xl border border-corp-800">
          <span class="text-[11px] font-bold text-gold-400 block mb-1.5 flex items-center gap-1.5">
            <i data-lucide="check-check" class="w-3.5 h-3.5 text-gold-500"></i>
            <span>معايير وملاحظات الـ VM بالقسم (${sec.checklist.length}):</span>
          </span>
          <div class="flex flex-wrap gap-1.5">
            ${sec.checklist.map(c => {
              const isNeg = isNegativeOrUnappliedFinding(c, null);
              if (isNeg) {
                return `
                  <span class="bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                    <span>عدم التزام بـ: ${c}</span>
                  </span>
                `;
              }
              return `
                <span class="bg-gold-500/10 text-gold-300 border border-gold-500/20 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  <span class="text-gold-400 font-bold">✓</span>
                  <span>معيار مؤكد: ${c}</span>
                </span>
              `;
            }).join('')}
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
          <!-- معايير وملاحظات الـ VM للقسم -->
          ${sec.checklist && sec.checklist.length > 0 ? `
            <div>
              <span class="text-[9.5px] font-bold text-slate-700 block mb-0.5 flex items-center gap-1">
                <span class="text-amber-600 font-bold">📋</span>
                <span>معايير وملاحظات الـ VM (${sec.checklist.length}):</span>
              </span>
              <div class="flex flex-wrap gap-1">
                ${sec.checklist.map(c => {
                  const isNeg = isNegativeOrUnappliedFinding(c, null);
                  if (isNeg) {
                    return `
                      <span class="bg-rose-50/90 text-rose-900 border border-rose-300/80 text-[9px] px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1">
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                        <span>عدم التزام بـ: ${c}</span>
                      </span>
                    `;
                  }
                  return `
                    <span class="bg-amber-50/80 text-amber-900 border border-amber-300/80 text-[9px] px-1.5 py-0.5 rounded font-medium">
                      ✓ معيار مؤكد: ${c}
                    </span>
                  `;
                }).join('')}
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

  // تحديث مصفوفة التدقيق التنفيذي بالصفحة الثانية تلقائياً
  renderExecutiveMatrixPage();
}

/**
 * =========================================================================
 * مصفوفة التدقيق التنفيذي: نقاط القوة والبنود المعلقة (Executive Action Matrix - Page 2)
 * عرض النصوص الكاملة بنسبة 100% دون اقتصاص، مع استغلال كامل ارتفاع صفحة A4 الأفقية (188mm)
 * والتحجيم الذكي ثنائي المرحلة (تضييق الهوامش أولاً ثم التصغير المجهري فقط عند تجاوز 188mm)
 * =========================================================================
 */
export function renderExecutiveMatrixPage() {
  const matrixContainer = document.getElementById('print-page-2-matrix');
  if (!matrixContainer) return;

  // التحقق من حالة التفعيل من التفضيلات المحلية
  const isEnabled = (localStorage.getItem('samx_show_matrix_page') !== 'false');
  const toggleCb = document.getElementById('toggle-matrix-page');
  if (toggleCb && toggleCb.checked !== isEnabled) {
    toggleCb.checked = isEnabled;
  }

  if (!isEnabled) {
    matrixContainer.classList.add('hidden', 'no-print', 'is-hidden-print');
    matrixContainer.style.display = 'none';
    return;
  } else {
    matrixContainer.classList.remove('hidden', 'no-print', 'is-hidden-print');
    matrixContainer.style.display = 'flex';
  }

  const sections = Array.isArray(currentAudit?.sections) ? currentAudit.sections : [];

  // صياغة العبارات الإيجابية للملاحظات التي تمت معالجتها في جدول نقاط القوة بالصفحة الثانية فقط (Row 5 Fix)
  const RESOLVED_FLAW_PREFIX_REGEX = /^(تداخل|عشوائية|تكدس|خاطئة|ازدحام|تبعثر|تراكم|فوضى|اختلاط|عدم\s+ترتيب|سوء\s+تنظيم)(?:\s|$)/i;
  const formatResolvedStrengthClause = (clause) => {
    const cleanClause = (clause || '').trim();
    if (!cleanClause) return '';
    if (/^(?:تمت\s+معالجة|تم\s+إنجاز|تمت\s+إزالة|معالجة\s+وإنهاء)/i.test(cleanClause)) {
      return cleanClause;
    }
    if (RESOLVED_FLAW_PREFIX_REGEX.test(cleanClause)) {
      return `تمت معالجة وإنهاء ملاحظة: ${cleanClause}`;
    }
    return cleanClause;
  };

  // 1. تصنيف ومسح الأقسام عبر المحلل الدلالي مع إبقاء النصوص كاملة 100% (صفر اقتصاص)
  const strengthsList = [];
  const pendingList = [];

  sections.forEach((sec, idx) => {
    const sem = analyzeSectionSemantics(sec, idx);

    // أ. إدراج الإنجازات المنفذة في جدول نقاط القوة بالكامل
    if (sem.executedAchievements.length > 0 && sem.nature !== 'negative') {
      const framedAchievements = sem.executedAchievements.map(formatResolvedStrengthClause).filter(Boolean);
      const achSummary = framedAchievements.join(' • ');
      const tagsLine = sem.tags.length > 0 ? sem.tags.join(' • ') : '';
      const displaySummary = achSummary || tagsLine || 'معايير العرض المرئي مستوفاة بالكامل';
      const isDual = sem.nature === 'dual';

      strengthsList.push({
        num: idx + 1,
        title: sem.cleanTitle,
        standardsSummary: displaySummary,
        statusText: isDual ? 'منجز + متابعة' : 'منجز ميدانياً',
        dotClass: isDual ? 'bg-teal-600' : 'bg-emerald-600',
        badgeClass: isDual
          ? 'bg-teal-50 text-teal-900 border-teal-300'
          : 'bg-emerald-50 text-emerald-900 border-emerald-300'
      });
    }

    // ب. إدراج البنود المعلقة / القصور فقط في جدول المتابعة بالكامل بعد إزالة التكرار
    if (sem.nature === 'dual' || sem.nature === 'negative') {
      const statusLabel = sem.isAction ? 'طلب صيانة / إدارة' : 'متابعة المعرض';
      const dotClass = sem.isAction ? 'bg-rose-600' : 'bg-amber-500';
      const badgeClass = sem.isAction
        ? 'bg-rose-50 text-rose-900 border-rose-300'
        : 'bg-amber-50 text-amber-900 border-amber-300';

      pendingList.push({
        num: idx + 1,
        title: sem.cleanTitle,
        actionNotes: sem.fullPendingText || sem.primaryPending || 'متابعة المعايير اليومية والتشغيلية بالقسم',
        assignee: sem.assignee,
        dueDate: sem.dueDate || 'خلال أسبوع',
        statusLabel,
        dotClass,
        badgeClass
      });
    }
  });

  // استخراج اسم الفرع وتاريخ التدقيق والأسبوع التنفيذي
  const branchName = sanitizeCorporateText(currentAudit?.branchName, 'معرض النخيل مول');
  const auditDate = currentAudit?.auditDate || new Date().toISOString().split('T')[0];
  const auditWeek = currentAudit?.auditWeek || (typeof calculateCurrentWeek === 'function' ? calculateCurrentWeek() : '');

  // 2. بناء قالب المصفوفة التنفيذية بأبعاد الأعمدة المحسّنة (26px / 19% / 64% / 17%) دون أي اقتطاع
  matrixContainer.innerHTML = `
    <div id="matrix-auto-fit-box" class="w-full flex flex-col justify-start transition-all duration-200" style="width: 100%; margin: 0 auto;">
      
      <!-- الشريط العلوي التنفيذي للمصفوفة مع بطاقة هوية الفرع وتاريخ التدقيق -->
      <div id="matrix-header-bar" class="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-900 gap-2 flex-wrap" dir="rtl">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-black shrink-0 border border-amber-500/40">M2</span>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-black text-slate-900 text-xs md:text-sm leading-tight tracking-tight m-0">مصفوفة التدقيق التنفيذي: نقاط القوة والبنود المعلقة</h3>
              <span class="inline-flex items-center gap-1.5 bg-slate-900 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                <span>${branchName}</span>
                <span class="text-slate-500 font-light">|</span>
                <span class="text-slate-200 tabular-nums">${auditDate}</span>
                ${auditWeek ? `<span class="text-slate-500 font-light">|</span><span class="text-amber-300">${auditWeek}</span>` : ''}
              </span>
            </div>
            <p class="text-[9.5px] text-slate-500 font-medium mt-0.5 m-0">
              <bdi dir="ltr">Executive Action Matrix</bdi> • مقارنة متوازنة للإنجازات الميدانية المعتمدة وبنود المتابعة والتكليف
            </p>
          </div>
        </div>

        <!-- مؤشرات سريعة بنقاط CSS ملونة وأرقام ثابتة (tabular-nums) خالية من رموز Unicode المعكوسة -->
        <div class="flex items-center gap-1.5 text-[10px] font-bold shrink-0">
          <span class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 rounded-md">
            <span class="inline-block w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>
            <span>إجمالي الأقسام:</span>
            <strong class="tabular-nums font-black">${sections.length}</strong>
          </span>
          <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
            <span>المكتمل:</span>
            <strong class="tabular-nums font-black">${strengthsList.length}</strong>
          </span>
          <span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span>المعلقات:</span>
            <strong class="tabular-nums font-black">${pendingList.length}</strong>
          </span>
        </div>
      </div>

      <!-- جدول المقارنة الثنائي جنباً إلى جنب (True Side-by-Side Dual Matrix in Screen & Print) -->
      <div class="matrix-dual-grid grid grid-cols-1 md:grid-cols-2 gap-3 w-full items-start" dir="rtl">
        
        <!-- العمود الأيمن: نقاط القوة والمعايير المكتملة (Emerald Theme) -->
        <div class="flex flex-col rounded-xl border border-emerald-300 bg-white w-full overflow-visible">
          <!-- ترويسة العمود الأيمن -->
          <div class="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3 py-1.5 flex items-center justify-between rounded-t-[11px] border-b border-emerald-700">
            <span class="font-black text-[11px] flex items-center gap-1.5">
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-300 shrink-0"></span>
              <span>نقاط القوة والإنجازات الميدانية</span>
            </span>
            <span class="bg-emerald-950/75 text-emerald-200 text-[9.5px] font-bold px-2 py-0.5 rounded border border-emerald-600/60 tabular-nums">${strengthsList.length} بنود</span>
          </div>

          <!-- محتوى الجدول الأيمن -->
          <div class="w-full">
            ${strengthsList.length === 0 ? `
              <div class="p-5 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                <span>لم تُسجل بنود إنجاز ميداني مكتملة حتى الآن في هذه الجولة</span>
              </div>
            ` : `
              <table class="w-full text-right border-collapse" style="table-layout: fixed; width: 100%; border-collapse: collapse;">
                <thead class="bg-emerald-100/95 border-b-2 border-emerald-300 text-emerald-950 font-black text-[9.5px]">
                  <tr>
                    <th class="py-1 px-1 text-center" style="width: 26px;">#</th>
                    <th class="py-1 px-2 text-right" style="width: 19%;">القسم</th>
                    <th class="py-1 px-2 text-right" style="width: 64%;">أبرز الإنجازات والمعايير</th>
                    <th class="py-1 px-1.5 text-center" style="width: 17%;">الحالة</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-emerald-100 text-slate-800">
                  ${strengthsList.map(item => `
                    <tr class="hover:bg-emerald-50/40 align-top">
                      <td class="matrix-fit-cell py-1.5 px-1 text-center font-bold text-emerald-800 tabular-nums text-[9.5px]" style="width: 26px;">${item.num}</td>
                      <td class="matrix-fit-cell py-1.5 px-2 font-black text-slate-900" style="width: 19%; font-size: 9.5px; line-height: 1.3; word-break: break-word; overflow-wrap: break-word; white-space: normal; overflow: visible;">
                        <bdi>${wrapEnglishBidiHtml(item.title)}</bdi>
                      </td>
                      <td class="matrix-fit-cell py-1.5 px-2 text-slate-700 font-medium" style="width: 64%; font-size: 9.8px; line-height: 1.35; word-break: break-word; overflow-wrap: break-word; white-space: normal; overflow: visible;">
                        ${wrapEnglishBidiHtml(item.standardsSummary)}
                      </td>
                      <td class="matrix-fit-cell py-1.5 px-1 text-center" style="width: 17%; overflow: visible;">
                        <span class="matrix-status-badge inline-flex items-center justify-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border ${item.badgeClass} whitespace-nowrap">
                          <span class="inline-block w-1.5 h-1.5 rounded-full ${item.dotClass} shrink-0"></span>
                          <span>${item.statusText}</span>
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- العمود الأيسر: البنود المعلقة وجدول التكليف والمتابعة (Amber/Rose Theme) -->
        <div class="flex flex-col rounded-xl border border-amber-300 bg-white w-full overflow-visible">
          <!-- ترويسة العمود الأيسر -->
          <div class="bg-gradient-to-r from-slate-900 via-amber-950 to-rose-950 text-white px-3 py-1.5 flex items-center justify-between rounded-t-[11px] border-b border-amber-800/80">
            <span class="font-black text-[11px] flex items-center gap-1.5">
              <span class="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span>البنود المعلقة وجدول التكليف والمتابعة</span>
            </span>
            <span class="bg-slate-950/80 text-amber-300 text-[9.5px] font-bold px-2 py-0.5 rounded border border-amber-500/40 tabular-nums">${pendingList.length} بنود</span>
          </div>

          <!-- محتوى الجدول الأيسر -->
          <div class="w-full">
            ${pendingList.length === 0 ? `
              <div class="p-5 text-center text-emerald-700 text-xs font-bold flex flex-col items-center justify-center gap-1 bg-emerald-50/50">
                <span>جاهزية ميدانية كاملة 100% — لا توجد بنود معلقة أو ملاحظات تصحيحية حرجة</span>
              </div>
            ` : `
              <table class="w-full text-right border-collapse" style="table-layout: fixed; width: 100%; border-collapse: collapse;">
                <thead class="bg-amber-100/95 border-b-2 border-amber-300 text-amber-950 font-black text-[9.5px]">
                  <tr>
                    <th class="py-1 px-1 text-center" style="width: 26px;">#</th>
                    <th class="py-1 px-2 text-right" style="width: 19%;">القسم</th>
                    <th class="py-1 px-2 text-right" style="width: 64%;">الإجراء والملاحظة المطلوبة</th>
                    <th class="py-1 px-1.5 text-center" style="width: 17%;">التكليف والموعد</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-amber-100 text-slate-800">
                  ${pendingList.map(item => `
                    <tr class="hover:bg-amber-50/40 align-top">
                      <td class="matrix-fit-cell py-1.5 px-1 text-center font-bold text-amber-800 tabular-nums text-[9.5px]" style="width: 26px;">${item.num}</td>
                      <td class="matrix-fit-cell py-1.5 px-2 font-black text-slate-900" style="width: 19%; font-size: 9.5px; line-height: 1.3; word-break: break-word; overflow-wrap: break-word; white-space: normal; overflow: visible;">
                        <bdi>${wrapEnglishBidiHtml(item.title)}</bdi>
                      </td>
                      <td class="matrix-fit-cell py-1.5 px-2 text-rose-900 font-semibold" style="width: 64%; font-size: 9.8px; line-height: 1.35; word-break: break-word; overflow-wrap: break-word; white-space: normal; overflow: visible;">
                        ${wrapEnglishBidiHtml(item.actionNotes)}
                      </td>
                      <td class="matrix-fit-cell py-1.5 px-1 text-center" style="width: 17%; word-break: break-word; overflow-wrap: break-word; white-space: normal; overflow: visible;">
                        <div class="flex flex-col items-center gap-0.5">
                          <span class="matrix-status-badge inline-flex items-center justify-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${item.badgeClass} whitespace-nowrap">
                            <span class="inline-block w-1.5 h-1.5 rounded-full ${item.dotClass} shrink-0"></span>
                            <span>${item.statusLabel}</span>
                          </span>
                          <span class="text-[8.5px] font-bold text-slate-800 leading-tight">${item.assignee}</span>
                          <span class="text-[8px] font-medium text-slate-500 tabular-nums leading-tight">${item.dueDate}</span>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

      </div>

    </div>
  `;

  // 3. التمدد الطبيعي الكامل مع الملاءمة الذكية عند تجاوز حد 188mm فقط (لا تقليص مسبق ولا اقتطاع)
  fitMatrixToSinglePage();
}

/**
 * التحجيم الذكي عند الحافة السفلية لصفحة A4 Landscape (188mm ≈ 710px)
 * المرحلة 1: السماح بالتمدد الطبيعي الكامل بالصفحة (py-1.5 px-2)
 * المرحلة 2: في حال تجاوز الارتفاع الفعلي 188mm فقط، يتم تضييق الحشو الرأسي تدريجياً (py-1 ثم py-0.5)
 * المرحلة 3: إن استمر التجاوز، يُطبّق تصغير مجهري (micro-zoom) للحفاظ على الصفحة الثانية دون اقتطاع أي حرف
 */
export function fitMatrixToSinglePage() {
  const box = document.getElementById('matrix-auto-fit-box');
  if (!box) return;

  // إعادة التعيين إلى الوضع الطبيعي قبل القياس
  box.style.zoom = '1';
  box.style.transform = 'none';
  const cells = box.querySelectorAll('.matrix-fit-cell');
  cells.forEach(cell => {
    cell.classList.remove('py-1', 'py-0.5');
    if (!cell.classList.contains('py-1.5')) cell.classList.add('py-1.5');
  });

  const headerBar = document.getElementById('matrix-header-bar');
  if (headerBar) {
    headerBar.classList.remove('pb-1', 'mb-1');
    if (!headerBar.classList.contains('pb-2')) headerBar.classList.add('pb-2');
    if (!headerBar.classList.contains('mb-2')) headerBar.classList.add('mb-2');
  }

  // الارتفاع الفعلي القابل للاستخدام في A4 Landscape (188mm ≈ 710px على 96dpi)
  const MAX_USABLE_PAGE_HEIGHT_PX = 710;
  if (box.scrollHeight <= MAX_USABLE_PAGE_HEIGHT_PX) {
    return;
  }

  // المرحلة 1: تضييق الحشو الرأسي تدريجياً إلى py-1
  cells.forEach(cell => {
    cell.classList.remove('py-1.5');
    cell.classList.add('py-1');
  });
  if (headerBar) {
    headerBar.classList.remove('pb-2', 'mb-2');
    headerBar.classList.add('pb-1', 'mb-1');
  }
  if (box.scrollHeight <= MAX_USABLE_PAGE_HEIGHT_PX) {
    return;
  }

  // المرحلة 2: تضييق إضافي إلى py-0.5
  cells.forEach(cell => {
    cell.classList.remove('py-1');
    cell.classList.add('py-0.5');
  });
  if (box.scrollHeight <= MAX_USABLE_PAGE_HEIGHT_PX) {
    return;
  }

  // المرحلة 3: التصغير المجهري (micro-zoom) كخيار أخير لضمان احتواء الصفحة الواحدة بدون قص
  const scaleFactor = Math.max(0.75, Math.min(1, MAX_USABLE_PAGE_HEIGHT_PX / box.scrollHeight));
  box.style.zoom = String(Number(scaleFactor.toFixed(3)));
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
  window.parseJustificationNotes = parseJustificationNotes;
  window.getDynamicJustifications = getDynamicJustifications;
  window.formatArabicVmAction = formatArabicVmAction;
  window.cleanSummaryPointText = cleanSummaryPointText;
  window.formatSummaryPointHtml = formatSummaryPointHtml;
  window.parseVisitSummaryPoints = parseVisitSummaryPoints;
  window.sanitizeCorporateText = sanitizeCorporateText;
  window.getImageTransformStyle = getImageTransformStyle;
  window.renderExecutiveMatrixPage = renderExecutiveMatrixPage;
  window.fitMatrixToSinglePage = fitMatrixToSinglePage;
  window.isNegativeOrUnappliedFinding = isNegativeOrUnappliedFinding;
  window.sanitizeSectionTitle = sanitizeSectionTitle;
  window.analyzeSectionSemantics = analyzeSectionSemantics;
  window.fixBrokenBidiText = fixBrokenBidiText;
  window.wrapEnglishBidiHtml = wrapEnglishBidiHtml;
}
