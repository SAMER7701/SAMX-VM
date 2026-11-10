/**
 * SAMX-VM Smart AI Readiness Auditor Engine (SAMX_ReadinessAuditor)
 * Version: 1.6.8
 * 
 * Features:
 * - Scans all documented tour section notes, checklist items, and executive summary bullet points.
 * - Recognizes operational negative triggers:
 *   e.g. "متسخ", "عدم المحافظة", "عدم المحافظة على الشكل العام", "عدم تجهيز القسم", 
 *   "عدم تجهيز القسم للتعديل", "قصور", "تأخير", "فوضى", "تلف", "إهمال", "غير جاهز"
 * - Accurately reduces the Readiness Score percentage when negative operational notes exist.
 * - Recognizes positive achievement keywords to reward compliant sections.
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
  'تلف',
  'تالف',
  'غير مطابق',
  'إهمال',
  'عدم التزام',
  'سوء تنظيم',
  'معالجة جزئية',
  'معالجة جزئيه',
  'ملاحظة حرجة',
  'لم يتم الإنجاز',
  'لم يتم التنفيذ',
  'نقص معروضات',
  'نقص قطع',
  'بانتظار الصيانة'
];

// الكلمات والعبارات الإيجابية لإنجاز المعايير (Positive Achievement Keywords)
export const POSITIVE_ACHIEVEMENT_KEYWORDS = [
  'تم إنجاز',
  'تم انجاز',
  'تم التنفيذ',
  'بالكامل',
  'تنظيم',
  'ضبط',
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

  // 1. مسح وتدقيق الأقسام الموثقة
  sections.forEach((sec, idx) => {
    const secTitle = sec.title || sec.name || `القسم ${idx + 1}`;
    const notes = (sec.notes || sec.note || sec.justification || '').trim();
    const statuses = Array.isArray(sec.statuses) && sec.statuses.length > 0 
      ? sec.statuses 
      : (sec.status ? [sec.status] : ['resolved']);

    let secScore = 80;

    // احتساب الدرجة المبدئية للحالة
    if (statuses.includes('resolved') && statuses.length === 1) {
      secScore = 100;
      positiveFindings.push({
        source: secTitle,
        type: 'status_resolved',
        text: `تم استيفاء معايير قسم "${secTitle}" بالكامل وحالته منجزة ميدانياً.`
      });
    } else if (statuses.includes('store_followup')) {
      secScore = 75;
      negativeFindings.push({
        source: secTitle,
        type: 'status_followup',
        text: `قسم "${secTitle}" يتطلب متابعة دورية مستمرة من إدارة المعرض.`
      });
    } else if (statuses.includes('management_action')) {
      secScore = 55;
      negativeFindings.push({
        source: secTitle,
        type: 'status_escalation',
        text: `قسم "${secTitle}" يتطلب تدخلاً عاجلاً من إدارة المنطقة / الإدارة العليا.`
      });
    }

    // فحص المحفزات السلبية التشغيلية داخل ملاحظات القسم
    const lowerNotes = notes.toLowerCase();
    let sectionHasCriticalNegative = false;

    OPERATIONAL_NEGATIVE_TRIGGERS.forEach(trigger => {
      if (lowerNotes.includes(trigger.toLowerCase())) {
        sectionHasCriticalNegative = true;
        penaltyPoints += 6; // خصم مباشر للقصور التشغيلي الحرج
        negativeFindings.push({
          source: secTitle,
          type: 'operational_negative',
          text: `رصد ملحوظة تشغيلية سالبة (${trigger}): "${notes.slice(0, 80)}"`
        });
      }
    });

    // فحص المحفزات الإيجابية
    POSITIVE_ACHIEVEMENT_KEYWORDS.forEach(kw => {
      if (lowerNotes.includes(kw.toLowerCase()) && !sectionHasCriticalNegative) {
        secScore = Math.min(100, secScore + 4);
      }
    });

    if (sectionHasCriticalNegative) {
      secScore = Math.max(30, secScore - 20);
    }

    baseScoreSum += secScore;
  });

  // 2. مسح وتدقيق نقاط ملخص الزيارة التنفيذي (Summary Points)
  summaryPoints.forEach(point => {
    const lowerPoint = point.toLowerCase();
    let pointHasNegative = false;

    OPERATIONAL_NEGATIVE_TRIGGERS.forEach(trigger => {
      if (lowerPoint.includes(trigger.toLowerCase())) {
        pointHasNegative = true;
        penaltyPoints += 4;
        negativeFindings.push({
          source: 'ملخص الزيارة',
          type: 'summary_negative',
          text: `ملحوظة قصور في الملخص (${trigger}): "${point.slice(0, 90)}"`
        });
      }
    });

    if (!pointHasNegative) {
      POSITIVE_ACHIEVEMENT_KEYWORDS.forEach(kw => {
        if (lowerPoint.includes(kw.toLowerCase())) {
          positiveFindings.push({
            source: 'ملخص الزيارة',
            type: 'summary_positive',
            text: `نقطة إنجاز موثقة في الملخص: "${point.slice(0, 90)}"`
          });
        }
      });
    }
  });

  // حساب النسبة الموزونة مع تطبيق الخصومات الدقيقة
  const effectiveSectionsCount = Math.max(1, sections.length);
  let rawPercent = Math.round(baseScoreSum / effectiveSectionsCount);

  // خصم المخالفات التشغيلية والقصور الملحوظ
  let finalPercent = rawPercent - penaltyPoints;
  finalPercent = Math.max(25, Math.min(100, finalPercent));

  // تحديد التصنيف والشارة
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

export function proofreadText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim();
}
