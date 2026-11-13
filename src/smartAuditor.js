/**
 * SAMX-VM Smart AI Readiness Auditor Engine (SAMX_ReadinessAuditor)
 * Version: 1.7.5
 * 
 * Features:
 * - Scans all documented tour section notes, checklist items, and executive summary bullet points.
 * - Dual-Nature semantic awareness: rewards executed field improvements while tracking pending follow-ups.
 * - Context-aware recognition of negative triggers and expanded autocorrection of Arabic field dictation typos.
 * - Accurately reduces the Readiness Score percentage when negative operational notes exist.
 * - Provides structured breakdown of positive vs. negative field findings for the modal.
 */

// الكلمات والعبارات التشغيلية السلبية الحرجة (Operational Negative Triggers)
export const OPERATIONAL_NEGATIVE_TRIGGERS = [
  'متسخ',
  'عدم المحافظة',
  'عدم المحافظة على الشكل العام',
  'عدم تجهيز القسم',
  'عدم تجهيز القسم للتعديل',
  'قصور',
  'تأخير',
  'فوضى',
  'غير جاهز',
  'غير مطبق',
  'تلف',
  'تالف',
  'غير مطابق',
  'إهمال',
  'عدم التزام',
  'سوء تنظيم',
  'سوء التنظيم',
  'سواء تنظيم',
  'سواء التنظيم',
  'سوء العرض',
  'سواء العرض',
  'سوء الترتيب',
  'سوء النظافة',
  'معالجة جزئية',
  'معالجة جزئيه',
  'ملاحظة حرجة',
  'لم يتم الإنجاز',
  'لم يتم التنفيذ',
  'لم يتم تطبيق',
  'لم يتم',
  'عدم تطبيق',
  'نقص معروضات',
  'نقص قطع',
  'نقص',
  'عطل في',
  'غياب',
  'متابعة طلب',
  'العمل على إزالة',
  'تعديل التسعير',
  'بانتظار الصيانة'
];

// الكلمات والعبارات الإيجابية لإنجاز المعايير (Positive Achievement Keywords)
export const POSITIVE_ACHIEVEMENT_KEYWORDS = [
  'تم إنجاز',
  'تم انجاز',
  'تم التنفيذ',
  'تم تطبيق',
  'بالكامل',
  'إحلال',
  'تطوير',
  'تنسيق',
  'إعادة تخطيط',
  'إعادة ترتيب',
  'إعادة تنسيق',
  'نقل',
  'تهيئة',
  'تحرير مسارات',
  'تحرير',
  'ترتيب',
  'تنظيم',
  'ضبط',
  'توحيد',
  'معالجة تامة',
  'تنسيق متناسق',
  'تطبيق الدليل',
  'تمت المعالجة',
  'مكتمل',
  'جاهز',
  'معتمد',
  'وفق المعيار',
  'مطابق',
  'ممتاز',
  'ترتيب مثالي',
  'إعادة توزيع متقنة',
  'تعديل ناجح',
  'معايير مكتملة'
];

const TEXT_NEGATIVE_CHECK_REGEX = /(لم\s+يتم|عدم\s+|سوء\s+|سواء\s+(?:التنظيم|تنظيم|العرض|عرض|الترتيب|النظافة)|نقص(?:\s|$)|عطل|عطال|تلف|تالف|غياب|قصور|تأخير|فوضى|إهمال|غير\s+مطابق|غير\s+مطبق|غير\s+جاهز|غير\s+مكتمل|معالجة\s+جزئية|متابعة\s+طلب|العمل\s+على\s+إزالة|تعديل\s+التسعير|بانتظار|ملاحظة\s+حرجة)/i;

/**
 * المحلل الذكي لمؤشر الجاهزية (SAMX_ReadinessAuditor)
 * @param {Object} audit - كائن التقرير الحالي (currentAudit)
 * @returns {Object} نتائج التدقيق الدقيقة والمؤشر المحسوب
 */
export function analyzeTourWithAI(audit) {
  const sections = (audit && Array.isArray(audit.sections)) ? audit.sections : [];
  const summaryText = (audit && typeof audit.visitSummary === 'string') ? audit.visitSummary : '';
  const summaryPoints = summaryText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 2);

  if (sections.length === 0 && summaryPoints.length === 0) {
    return {
      hasSections: false,
      score: 0,
      label: '—',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      positiveFindings: [],
      negativeFindings: [],
      stats: {
        totalSections: 0,
        positiveCount: 0,
        negativeCount: 0,
        criticalPenalty: 0
      }
    };
  }

  const positiveFindings = [];
  const negativeFindings = [];

  let baseScoreSum = 0;
  let penaltyPoints = 0;

  // 1. مسح وتدقيق الأقسام الموثقة مع فرز الأقسام ثنائية الطبيعة (Dual-Nature)
  sections.forEach((sec, idx) => {
    const rawSecTitle = sec.title || sec.name || `القسم ${idx + 1}`;
    const secTitle = rawSecTitle
      .replace(/\(\)\s*([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*)/g, '($1)')
      .replace(/[:;]\s*\)\s*([A-Za-z][A-Za-z0-9\s&’'\-\/\.]*)/g, ' ($1)')
      .trim();
    const rawNotes = (sec.notes || sec.note || sec.justification || '').trim();
    const notes = autocorrectVmText(rawNotes);
    const checklist = Array.isArray(sec.checklist) ? sec.checklist : [];
    const statuses = Array.isArray(sec.statuses) && sec.statuses.length > 0 
      ? sec.statuses 
      : (sec.status ? [sec.status] : ['resolved']);

    const lowerNotes = notes.toLowerCase();
    // إزالة التراكيب السلبية قبل فحص الكلمات الإيجابية لمنع تطابق "تنظيم" داخل "سوء التنظيم" أو "تطبيق" داخل "لم يتم تطبيق"
    const strippedPositiveSource = lowerNotes.replace(
      /(?:سوء|سواء|عدم|لم\s+يتم|غير|نقص|عطل\s+في|تلف\s+في|قصور\s+في)\s+(?:ال)?[\u0600-\u06FF]+/g,
      ' '
    );
    const hasPositiveAchievementInNotes = POSITIVE_ACHIEVEMENT_KEYWORDS.some(kw => strippedPositiveSource.includes(kw.toLowerCase()));
    const hasPositiveChecklist = checklist.some(c => !TEXT_NEGATIVE_CHECK_REGEX.test(autocorrectVmText(c)));
    const hasAnyExecutedWork = hasPositiveAchievementInNotes || hasPositiveChecklist;

    let secScore = 80;

    // احتساب الدرجة المبدئية للحالة مع احترام الأقسام ثنائية الطبيعة
    if (statuses.includes('resolved') && statuses.length === 1) {
      secScore = 100;
      positiveFindings.push({
        source: secTitle,
        type: 'status_resolved',
        text: `تم استيفاء معايير قسم "${secTitle}" بالكامل وحالته منجزة ميدانياً.`
      });
    } else if (statuses.includes('store_followup')) {
      secScore = hasAnyExecutedWork ? 82 : 72;
      if (hasAnyExecutedWork) {
        positiveFindings.push({
          source: secTitle,
          type: 'dual_achievement',
          text: `تم إنجاز تطوير وتنسيق ميداني في قسم "${secTitle}" مع وجود بند متابعة للفرع.`
        });
      }
      negativeFindings.push({
        source: secTitle,
        type: 'status_followup',
        text: `تكليف متابعة في "${secTitle}": ${(sec.actionNotes || sec.actionRequired || 'متابعة المعايير اليومية والتشغيلية').slice(0, 80)}`
      });
    } else if (statuses.includes('management_action')) {
      secScore = hasAnyExecutedWork ? 68 : 55;
      if (hasAnyExecutedWork) {
        positiveFindings.push({
          source: secTitle,
          type: 'dual_achievement',
          text: `تم تنفيذ معالجات ميدانية في "${secTitle}" بانتظار التدخل الإداري/الصيانة.`
        });
      }
      negativeFindings.push({
        source: secTitle,
        type: 'status_escalation',
        text: `قسم "${secTitle}" يتطلب تدخلاً عاجلاً من الإدارة / الصيانة.`
      });
    }

    // فحص المحفزات السلبية التشغيلية داخل الملاحظات والبنود
    let sectionHasCriticalNegative = false;
    const matchedTriggers = new Set();

    OPERATIONAL_NEGATIVE_TRIGGERS.forEach(trigger => {
      if (lowerNotes.includes(trigger.toLowerCase()) && !matchedTriggers.has(trigger)) {
        matchedTriggers.add(trigger);
        sectionHasCriticalNegative = true;
        penaltyPoints += 4;
        negativeFindings.push({
          source: secTitle,
          type: 'operational_negative',
          text: `رصد ملحوظة تتطلب المعالجة (${trigger}): "${notes.slice(0, 80)}"`
        });
      }
    });

    checklist.forEach(c => {
      const cleanC = autocorrectVmText(c);
      if (TEXT_NEGATIVE_CHECK_REGEX.test(cleanC)) {
        sectionHasCriticalNegative = true;
        penaltyPoints += 3;
        negativeFindings.push({
          source: secTitle,
          type: 'unapplied_standard',
          text: `عدم التزام بـ: ${cleanC}`
        });
      }
    });

    // مكافأة المعايير الإيجابية الموثقة
    if (hasPositiveAchievementInNotes) {
      secScore = Math.min(100, secScore + (sectionHasCriticalNegative ? 2 : 5));
    }

    if (sectionHasCriticalNegative && !hasAnyExecutedWork) {
      secScore = Math.max(30, secScore - 20);
    } else if (sectionHasCriticalNegative) {
      secScore = Math.max(45, secScore - 10);
    }

    baseScoreSum += secScore;
  });

  // 2. مسح وتدقيق نقاط ملخص الزيارة التنفيذي (Summary Points)
  summaryPoints.forEach(point => {
    const cleanPt = autocorrectVmText(point);
    const lowerPoint = cleanPt.toLowerCase();
    let pointHasNegative = false;

    if (TEXT_NEGATIVE_CHECK_REGEX.test(lowerPoint) && !lowerPoint.includes('تم إنجاز التطوير الميداني')) {
      pointHasNegative = true;
      penaltyPoints += 3;
      negativeFindings.push({
        source: 'ملخص الزيارة',
        type: 'summary_negative',
        text: `ملحوظة قصور في الملخص: "${cleanPt.slice(0, 90)}"`
      });
    }

    if (!pointHasNegative && POSITIVE_ACHIEVEMENT_KEYWORDS.some(kw => lowerPoint.includes(kw.toLowerCase()))) {
      positiveFindings.push({
        source: 'ملخص الزيارة',
        type: 'summary_positive',
        text: `نقطة إنجاز موثقة في الملخص: "${cleanPt.slice(0, 90)}"`
      });
    }
  });

  // حساب النسبة الموزونة مع تطبيق الخصومات الدقيقة
  const effectiveSectionsCount = Math.max(1, sections.length);
  let rawPercent = Math.round(baseScoreSum / effectiveSectionsCount);

  let finalPercent = rawPercent - Math.min(35, penaltyPoints);
  finalPercent = Math.max(25, Math.min(100, finalPercent));

  let label = 'ممتاز';
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';

  if (finalPercent >= 88) {
    label = 'ممتاز ومطابق للمعايير';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (finalPercent >= 75) {
    label = 'جيد مع بنود متابعة';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
  } else {
    label = 'يحتاج إجراءات تصحيحية عاجلة';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return {
    hasSections: true,
    score: finalPercent,
    label,
    badgeClass,
    text: `${finalPercent}% • ${label}`,
    positiveFindings,
    negativeFindings,
    stats: {
      totalSections: sections.length,
      positiveCount: positiveFindings.length,
      negativeCount: negativeFindings.length,
      criticalPenalty: penaltyPoints
    }
  };
}

/**
 * التصحيح اللغوي الذكي لمصطلحات وتوصيفات العرض المرئي ومعالجة الأخطاء الإملائية الشائعة
 */
export function autocorrectVmText(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;
  const B = '(^|[\\s\\(\\[\\"\\\'،؛:\\-•])';
  const E = '(?=[\\s\\)\\]\\.,،؛:\\n\\-]|$)';

  // 1. تصحيح خطأ "سواء" الشائع بدلاً من "سوء" عند التوصيف السلبي (مع دعم واو العطف "وسواء")
  str = str.replace(/(^|[\s\(\[\"\'،؛:])(و)?سواء\s+(التنظيم|تنظيم|العرض|عرض|الترتيب|ترتيب|التوزيع|توزيع|النظافة|نظافة|الحالة|حالة|الاستخدام|استخدام|المظهر|مظهر|التخزين|تخزين)/gi, (match, p1, w, target) => {
    return (p1 || '') + (w ? 'وسوء ' : 'سوء ') + target;
  });

  // 2. قاموس تصحيح الإملاء الميداني (Field Dictation Auto-Corrector)
  str = str.replace(new RegExp(`${B}(و|ل)?(اعادت|أعادة|اعاده|أعادت)${E}`, 'g'), '$1$2إعادة');
  str = str.replace(new RegExp(`${B}(و|ل)?(ازالت|ازالة|ازاله)${E}`, 'g'), '$1$2إزالة');
  str = str.replace(new RegExp(`${B}(و|ب|ل)?المضهر${E}`, 'g'), '$1$2المظهر');
  str = str.replace(new RegExp(`${B}(و|ب)?مضهر${E}`, 'g'), '$1$2مظهر');
  str = str.replace(new RegExp(`${B}(و|ب|ل)?الرئية${E}`, 'g'), '$1$2الرؤية');
  str = str.replace(new RegExp(`${B}(و|ب)?رئية${E}`, 'g'), '$1$2رؤية');
  str = str.replace(new RegExp(`${B}(و|ب|ل)?الادرة${E}`, 'g'), '$1$2الإدارة');
  str = str.replace(new RegExp(`${B}(و|ب|ل)?ادرة${E}`, 'g'), '$1$2إدارة');
  str = str.replace(/الحراية/g, 'الحرارية');
  str = str.replace(new RegExp(`${B}(و)?مزاياء${E}`, 'g'), '$1$2مزايا');
  str = str.replace(new RegExp(`${B}(و|ل)?البيح${E}`, 'g'), '$1$2البيج');
  str = str.replace(new RegExp(`${B}(و|ل|ب)?المنكانات${E}`, 'g'), '$1$2المانيكانات');
  str = str.replace(new RegExp(`${B}(و|ل|ب)?منكانات${E}`, 'g'), '$1$2مانيكانات');
  str = str.replace(new RegExp(`${B}(و|ل|ب)?المنكان${E}`, 'g'), '$1$2المانيكان');
  str = str.replace(new RegExp(`${B}(و|ل|ب)?منكان${E}`, 'g'), '$1$2مانيكان');
  str = str.replace(new RegExp(`${B}ع\\s+الشكل`, 'g'), '$1على الشكل');
  str = str.replace(new RegExp(`${B}ع\\s+الجانب`, 'g'), '$1على الجانب');
  str = str.replace(new RegExp(`${B}الي(?=\\s|$)`, 'g'), '$1إلى');
  str = str.replace(new RegExp(`${B}(و)?تنظيمة${E}`, 'g'), '$1$2تنظيمه');
  str = str.replace(new RegExp(`${B}(و)?ضبظ${E}`, 'g'), '$1$2ضبط');

  // 3. تصحيحات إضافية سابقة في العرض المرئي
  str = str.replace(/(^|[\s\(\[\"\'،؛])لم\s+[يب][تث][نم](?=[\s\)\]\"\'،؛\.]|$)/g, '$1لم يتم');
  str = str.replace(/(^|[\s\(\[\"\'،؛])عدو\s+(تطبيق|التزام|توفر|وجود|اكتمال)/g, '$1عدم $2');
  str = str.replace(/معالج[هة]\s+جزئي[هة]/g, 'معالجة جزئية');
  str = str.replace(/المانيكان\s*ات/g, 'المانيكانات');
  str = str.replace(/مانيكان\s*ات/g, 'مانيكانات');
  str = str.replace(/(^|[\s\(\[\"\'،؛])عطال\s+في/g, '$1عطل في');

  // 4. تصحيح أقواس المسميات الإنجليزية المكسورة (مثل ()POSM -> (POSM))
  str = str.replace(/\(\)\s*([A-Za-z0-9&\-\/\s]{2,25})/g, '($1)');
  str = str.replace(/([A-Za-z0-9&\-]{2,25})\s*\(\)/g, '($1)');

  return str;
}

export function proofreadText(text) {
  if (!text || typeof text !== 'string') return '';
  return autocorrectVmText(text.trim());
}

// تصدير دوال المدقق الذكي للنافذة العامة (Global Scope Bridge)
if (typeof window !== 'undefined') {
  window.analyzeTourWithAI = analyzeTourWithAI;
  window.proofreadText = proofreadText;
  window.autocorrectVmText = autocorrectVmText;
}
