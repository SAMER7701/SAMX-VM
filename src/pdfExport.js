/**
 * SAMX-VM Client-Side PDF Generation Engine
 * Generates high-fidelity downloadable A4 PDF reports reflecting custom brand identity and logo.
 * Strict Page-Break Guardrails: Discrete A4 page rendering to eliminate any image or text cropping across pages.
 * Responsive Layout & Absolute Centering: Dynamically scales sections and images to eliminate empty gaps,
 * maintaining perfect horizontal and vertical equilibrium around the central axis.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { currentAudit, getBrandingSettings } from './store.js';
import { showToast, renderPrintSections, syncBrandingUI } from './renderers.js';

/**
 * دالة مساعدة لتوليد HTML بطاقة القسم الميداني الموثق بتصميم مؤسسي متوازن وعالي الدقة
 * مع دعم التحجيم الديناميكي للصور وشارات كبسولية مركزية مصغرة أعلى الصورة
 */
function renderPdfSectionCardHtml(sec, globalIndex, isSingleOnPage = false, hasSignatures = false) {
  const layout = sec.layoutType || 'comparison';

  // حساب الأبعاد المثالية لارتفاع الصور لملء الصفحة بانسجام ومنع الفراغات الجانبية أو السفلية
  let imgHeight = 235;
  let stackedImgHeight = 114;

  if (isSingleOnPage) {
    if (hasSignatures) {
      imgHeight = (layout === 'single_panorama') ? 320 : 285;
      stackedImgHeight = 145;
    } else {
      imgHeight = (layout === 'single_panorama') ? 385 : 340;
      stackedImgHeight = 185;
    }
  } else {
    if (hasSignatures) {
      imgHeight = 195;
      stackedImgHeight = 95;
    } else {
      imgHeight = 235;
      stackedImgHeight = 114;
    }
  }

  // شارة الحالة بتوسيط مثالي للنصوص والأيقونات
  let statusBadgeHtml = `
    <span style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2.5px 9px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; line-height: 1; background: #dcfce7; color: #166534; border: 1px solid #86efac; white-space: nowrap; direction: rtl;">
      <span>تم المعالجة ✅</span>
    </span>
  `;
  if (sec.status === 'store_followup') {
    statusBadgeHtml = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2.5px 9px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; line-height: 1; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; white-space: nowrap; direction: rtl;">
        <span>متابعة الفرع ⏳</span>
      </span>
    `;
  } else if (sec.status === 'management_action') {
    statusBadgeHtml = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2.5px 9px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; line-height: 1; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; white-space: nowrap; direction: rtl;">
        <span>صيانة / إدارة ⚠️</span>
      </span>
    `;
  }

  // وسوم الأقسام
  const tagsHtml = (sec.tags || []).map(t => `
    <span style="display: inline-flex; align-items: center; justify-content: center; padding: 2px 7px; border-radius: 6px; font-size: 9px; font-weight: 600; line-height: 1; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; white-space: nowrap;">
      ${t}
    </span>
  `).join(' ');

  // صور التوثيق وفق نمط التخطيط مع الشارات الكبسولية المركزية أعلى الصور
  let imagesHtml = '';

  if (layout === 'single_panorama') {
    // بانوراما كاملة للواجهات أو المستودعات - استغلال العرض الكامل بنقاء عالي
    imagesHtml = `
      <div style="width: 100%; height: ${imgHeight}px; border-radius: 9px; overflow: hidden; position: relative; border: 1.5px solid #cbd5e1; background: #f8fafc; margin-bottom: 8px;">
        <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 10; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 2.5px 12px; border-radius: 9999px; background: #0f172a; color: #fde68a; border: 1px solid #f59e0b; font-size: 9.5px; font-weight: 700; line-height: 1; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; user-select: none;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: #facc15; display: inline-block;"></span>
          <span>● Panorama View</span>
        </div>
        <img src="${sec.afterImg || sec.beforeImg}" alt="Panorama View" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" />
      </div>
    `;
  } else if (layout === 'stacked_panorama') {
    // بانوراما مكدسة رأسياً (قبل فوق وبعد تحت) بعرض كامل
    imagesHtml = `
      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
        <div style="width: 100%; height: ${stackedImgHeight}px; border-radius: 8px; overflow: hidden; position: relative; border: 1.5px solid #cbd5e1; background: #f8fafc;">
          <div style="position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 10; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 2px 10px; border-radius: 9999px; background: #881337; color: #ffffff; border: 1px solid #ef4444; font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; user-select: none;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #fca5a5; display: inline-block;"></span>
            <span>● Before</span>
          </div>
          <img src="${sec.beforeImg}" alt="Before" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" />
        </div>
        <div style="width: 100%; height: ${stackedImgHeight}px; border-radius: 8px; overflow: hidden; position: relative; border: 1.5px solid #cbd5e1; background: #f8fafc;">
          <div style="position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 10; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 2px 10px; border-radius: 9999px; background: #064e3b; color: #ffffff; border: 1px solid #10b981; font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; user-select: none;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #86efac; display: inline-block;"></span>
            <span>● After</span>
          </div>
          <img src="${sec.afterImg}" alt="After" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" />
        </div>
      </div>
    `;
  } else {
    // مقارنة جانبية Side-by-Side (صورتين جنباً لجنب)
    imagesHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 8px;">
        <!-- اليمين: قبل التعديل -->
        <div style="width: 100%; height: ${imgHeight}px; border-radius: 9px; overflow: hidden; position: relative; border: 1.5px solid #cbd5e1; background: #f8fafc;">
          <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 10; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 2.5px 12px; border-radius: 9999px; background: #881337; color: #ffffff; border: 1px solid #ef4444; font-size: 9.5px; font-weight: 700; line-height: 1; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; user-select: none;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #fca5a5; display: inline-block;"></span>
            <span>● Before</span>
          </div>
          <img src="${sec.beforeImg}" alt="Before" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" />
        </div>

        <!-- اليسار: بعد التنفيذ والتعديل -->
        <div style="width: 100%; height: ${imgHeight}px; border-radius: 9px; overflow: hidden; position: relative; border: 1.5px solid #cbd5e1; background: #f8fafc;">
          <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 10; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 2.5px 12px; border-radius: 9999px; background: #064e3b; color: #ffffff; border: 1px solid #10b981; font-size: 9.5px; font-weight: 700; line-height: 1; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; user-select: none;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #86efac; display: inline-block;"></span>
            <span>● After</span>
          </div>
          <img src="${sec.afterImg}" alt="After" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" />
        </div>
      </div>
    `;
  }

  return `
    <div style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.03); direction: rtl; box-sizing: border-box; width: 100%;">
      <!-- شريط عنوان القسم والشارة الملونة والوسوم -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 7px; margin-bottom: 8px; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
          <span style="width: 22px; height: 22px; border-radius: 6px; background: #0f172a; color: #facc15; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1; flex-shrink: 0;">
            ${globalIndex}
          </span>
          <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${sec.title}
          </h4>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          ${statusBadgeHtml}
          ${tagsHtml}
        </div>
      </div>

      <!-- صور التوثيق المحجمة بانسجام تام -->
      ${imagesHtml}

      <!-- معايير الـ VM المطبقة إذا وُجدت -->
      ${sec.checklist && sec.checklist.length > 0 ? `
        <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 4.5px 9px; margin-bottom: 6px; font-size: 9.5px; color: #854d0e; line-height: 1.4;">
          <strong style="color: #713f12;">معايير الـ VM المعتمدة المطبقة (${sec.checklist.length}):</strong>
          <span style="margin-right: 6px;">${sec.checklist.map(c => `✓ ${c}`).join('   •   ')}</span>
        </div>
      ` : ''}

      <!-- صندوق تكليف ومتابعة الإجراء إذا وُجد -->
      ${(sec.status === 'store_followup' || sec.status === 'management_action') ? `
        <div style="background: ${sec.status === 'store_followup' ? '#fffbeb' : '#fef2f2'}; border: 1px solid ${sec.status === 'store_followup' ? '#fde68a' : '#fca5a5'}; border-radius: 6px; padding: 4.5px 9px; margin-bottom: 6px; font-size: 9.5px; color: ${sec.status === 'store_followup' ? '#92400e' : '#991b1b'}; display: flex; justify-content: space-between; align-items: center;">
          <span>⚠️ <strong>المكلف بالإجراء:</strong> ${sec.actionAssignee || 'مدير المعرض'}</span>
          <span>📅 <strong>تاريخ الإنجاز:</strong> ${sec.actionDueDate || 'خلال أسبوع'}</span>
        </div>
      ` : ''}

      <!-- تفاصيل ومبررات التعديل الميداني -->
      <div style="font-size: 9.5px; color: #334155; background: #f8fafc; padding: 5.5px 9px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.4;">
        <strong style="color: #0f172a;">تفاصيل ومبررات التعديل الميداني:</strong> ${sec.notes || 'تم التنفيذ والتعديل وفق معايير التنسيق المعتمدة.'}
      </div>
    </div>
  `;
}

/**
 * تصدير التقرير التنفيذي كملف PDF رقمي جاهز للتحميل
 * يعتمد التقسيم المقاس لصفحات A4 المستقلة مع التوسيط الرأسي والأفقي التام لمنع أي اقتطاع أو فراغات شاذة
 */
export async function exportAuditToPdf() {
  const sections = currentAudit.sections || [];
  if (sections.length === 0) {
    showToast('⚠️ لا توجد أقسام مسجلة في هذا التقرير لتصديرها كـ PDF!', 'error');
    return;
  }

  const btn = document.getElementById('btn-export-pdf');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-slate-900"></i><span>جارٍ تجهيز PDF...</span>`;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  }

  let renderRoot = null;

  try {
    showToast('📄 جارٍ بناء صفحات الـ PDF A4 بتوسيط مثالي واستغلال كامل للمساحة...', 'info');

    // 1. استخراج بيانات الهوية والمعرض
    const branding = getBrandingSettings();
    const companyName = branding.companyName || 'SAMX-VM';
    const companySubtitle = branding.companySubtitle || 'إدارة العرض المرئي والتنسيق التجاري • Visual Merchandising';
    const footerDisclaimer = branding.footerDisclaimer || '';
    const logoData = branding.logoData || null;

    const branchName = currentAudit.branchName || 'فرع المعرض العام';
    const auditorName = currentAudit.auditorName || 'أخصائي الـ VM';
    const auditDate = currentAudit.auditDate || new Date().toISOString().split('T')[0];
    const totalSections = sections.length;

    // 2. تقسيم الأقسام إلى صفحات A4 محددة مسبقاً (قسمان كحد أقصى لكل صفحة لضمان عدم الاقتصاص والتوازن التام)
    const chunkSize = 2;
    const totalPages = Math.max(1, Math.ceil(totalSections / chunkSize));

    // 3. إنشاء حاوية التقديم خارج الشاشة
    renderRoot = document.createElement('div');
    renderRoot.id = 'single-pdf-render-root';
    renderRoot.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 794px;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(renderRoot);

    // 4. بناء كل صفحة A4 كعنصر مستقل تماماً بمقاس (794px × 1123px) مع توسيط محكم
    for (let p = 0; p < totalPages; p++) {
      const pageEl = document.createElement('div');
      pageEl.className = 'single-pdf-page';
      pageEl.style.cssText = `
        width: 794px;
        height: 1123px;
        box-sizing: border-box;
        padding: 32px 38px;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: stretch;
        position: relative;
        overflow: hidden;
      `;

      const startIdx = p * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, totalSections);
      const pageSections = sections.slice(startIdx, endIdx);
      const isSingleOnPage = (pageSections.length === 1);
      const isLastPage = (p === totalPages - 1);

      // --- هيدر الصفحة ---
      let headerHtml = '';
      if (p === 0) {
        // الصفحة الأولى: الترويسة التنفيذية الرسمية الكاملة
        headerHtml = `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 12px; width: 100%;">
            <!-- الشعار وهوية الشركة -->
            <div style="display: flex; align-items: center; gap: 12px;">
              ${logoData ? `
                <div style="height: 52px; max-width: 180px; display: flex; align-items: center; overflow: hidden;">
                  <img src="${logoData}" alt="${companyName}" style="max-height: 52px; max-width: 180px; width: auto; height: auto; object-fit: contain;" />
                </div>
              ` : `
                <div style="width: 48px; height: 48px; border-radius: 12px; background: #0f172a; color: #facc15; border: 1.5px solid #eab308; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; flex-shrink: 0;">
                  <span>SX</span>
                </div>
              `}
              <div>
                <h2 style="margin: 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${companyName}</h2>
                <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #64748b; font-weight: 600;">${companySubtitle}</p>
              </div>
            </div>

            <!-- بطاقة بيانات التقرير الرسمية (ONLY: Store Name, Specialist, Date, Total Sections) -->
            <div style="text-align: right; font-size: 10.5px; background: #f8fafc; padding: 7px 12px; border-radius: 10px; border: 1px solid #e2e8f0; min-width: 200px; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between; gap: 8px;">
                <span style="color: #64748b; font-weight: 600;">اسم المعرض:</span>
                <strong style="color: #0f172a;">${branchName}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 8px;">
                <span style="color: #64748b; font-weight: 600;">أخصائي الـ VM:</span>
                <strong style="color: #0f172a;">${auditorName}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 8px;">
                <span style="color: #64748b; font-weight: 600;">تاريخ التدقيق:</span>
                <strong style="color: #0f172a;">${auditDate}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 8px;">
                <span style="color: #64748b; font-weight: 600;">إجمالي الأقسام:</span>
                <strong style="color: #b45309;">${totalSections} أقسام</strong>
              </div>
            </div>
          </div>
        `;
      } else {
        // الصفحات اللاحقة: ترويسة مقتضبة ونقية بدون تكرار
        headerHtml = `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 13px; color: #0f172a;">${companyName}</strong>
              <span style="color: #94a3b8;">•</span>
              <span style="font-size: 12px; color: #334155; font-weight: bold;">${branchName}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; display: flex; align-items: center; gap: 10px;">
              <span>التاريخ: <strong style="color: #0f172a;">${auditDate}</strong></span>
              <span>•</span>
              <span>الأخصائي: <strong style="color: #0f172a;">${auditorName}</strong></span>
              <span>•</span>
              <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">الأقسام: ${startIdx + 1}-${endIdx} من ${totalSections}</span>
            </div>
          </div>
        `;
      }

      // --- محتوى الأقسام لهذه الصفحة المحكوم بنظام شبكي مركزي متوازن ---
      const sectionsHtml = `
        <div style="display: flex; flex-direction: column; gap: ${isSingleOnPage ? '0px' : '12px'}; width: 100%;">
          ${pageSections.map((sec, localIdx) => renderPdfSectionCardHtml(sec, startIdx + localIdx + 1, isSingleOnPage, isLastPage)).join('')}
        </div>
      `;

      // --- التوقيعات والاعتماد الرسمي (في الصفحة الأخيرة فقط) ---
      let signaturesHtml = '';
      if (isLastPage) {
        signaturesHtml = `
          <div style="border-top: 1.5px solid #cbd5e1; padding-top: 10px; margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 10px; width: 100%;">
            <!-- اعتماد أخصائي العرض المرئي -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px;">
              <div style="font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                إعداد واعتماد أخصائي العرض المرئي (VM Specialist):
              </div>
              <div style="color: #64748b; font-size: 9px; margin-bottom: 5px;">
                أقر بأن التعديلات المذكورة أعلاه تم تنفيذها وتوثيقها ميدانياً وفق المعايير.
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px dashed #94a3b8; padding-bottom: 2px; height: 30px;">
                <span style="font-weight: 800; color: #0f172a; font-size: 11px;">${auditorName}</span>
                <span style="font-size: 9px; color: #94a3b8;">التوقيع: ...........................</span>
              </div>
            </div>

            <!-- اعتماد مدير المعرض -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px;">
              <div style="font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                ملاحظات واعتماد مدير المعرض (Store Manager):
              </div>
              <div style="color: #64748b; font-size: 9px; margin-bottom: 5px;">
                تم الاطلاع على التغييرات والموافقة على خطة التنسيق المنفذة.
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px dashed #94a3b8; padding-bottom: 2px; height: 30px;">
                <span style="font-size: 9px; color: #64748b;">الختم والاعتماد:</span>
                <span style="font-size: 9px; color: #94a3b8;">...................................</span>
              </div>
            </div>
          </div>

          ${footerDisclaimer ? `
            <div style="font-size: 9px; color: #64748b; text-align: center; margin-top: 6px; padding: 4px; background: #f8fafc; border-radius: 4px; width: 100%;">
              ${footerDisclaimer}
            </div>
          ` : ''}
        `;
      }

      // --- تذييل الصفحة النظيف (رقم الصفحة فقط بدون روابط أو إصدارات تقنية) ---
      const footerHtml = `
        <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: #94a3b8; width: 100%;">
          <span>${companyName} • تقرير تدقيق العرض المرئي</span>
          <span>صفحة ${p + 1} من ${totalPages}</span>
        </div>
      `;

      // تركيب الصفحة مع التوسيط الرأسي والأفقي التام للحاوية المركزية
      pageEl.innerHTML = `
        ${headerHtml}
        <div class="pdf-page-content-area" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; margin: auto 0; gap: 10px;">
          ${sectionsHtml}
          ${signaturesHtml}
        </div>
        ${footerHtml}
      `;

      renderRoot.appendChild(pageEl);
    }

    // 5. التقاط كل صفحة مستقلاً عبر html2canvas وتضمينها كصفحة A4 كاملة في jsPDF
    const renderedPages = renderRoot.querySelectorAll('.single-pdf-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfPageWidth = 210;
    const pdfPageHeight = 297;

    for (let i = 0; i < renderedPages.length; i++) {
      const pageNode = renderedPages[i];
      const canvas = await html2canvas(pageNode, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, pdfPageHeight, undefined, 'FAST');

      if (i < renderedPages.length - 1) {
        pdf.addPage();
      }
    }

    // 6. استخراج اسم الملف النظيف
    const cleanCompany = (companyName || 'SAMX_VM').replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanBranch = (branchName || 'Store').replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanDate = (auditDate || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    const fileName = `تقرير_تدقيق_${cleanCompany}_${cleanBranch}_${cleanDate}.pdf`;

    pdf.save(fileName);
    showToast(`✅ تم تحميل تقرير الـ PDF بنجاح: ${fileName}`, 'success');

  } catch (err) {
    console.error('exportAuditToPdf error:', err);
    showToast('حدث خطأ أثناء معالجة PDF، يمكنك استخدام زر "طباعة / نافذة PDF" المباشر.', 'error');
  } finally {
    if (renderRoot && renderRoot.parentNode) {
      renderRoot.parentNode.removeChild(renderRoot);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      if (window.lucide && typeof lucide.createIcons === 'function') {
        try { lucide.createIcons(); } catch(e){}
      }
    }
  }
}

/**
 * =========================================================================
 * محرك تصدير تقرير الدورة الشهرية الشامل المجمع (Bulk Monthly Audit Cycle PDF Engine)
 * =========================================================================
 * يجمع عدة ملفات تدقيق سابقة مخزنة في LocalStorage ويولد تقريراً تنفيذياً شاملاً
 * بمقاس A4 عمودي دون أي اقتطاع للصور أو النصوص مع التوسيط الرأسي والأفقي المتزن
 */
export async function exportBulkMonthlyAuditPdf(selectedAuditIds = null) {
  let targetIds = selectedAuditIds;
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    const checkedBoxes = document.querySelectorAll('.bulk-audit-checkbox:checked');
    targetIds = Array.from(checkedBoxes).map(cb => cb.dataset.id).filter(Boolean);
  }

  if (targetIds.length === 0) {
    showToast('⚠️ يرجى تحديد تقرير تدقيق واحد على الأقل للتصدير المجمع', 'error');
    return;
  }

  const allAudits = typeof window.getArchivedAudits === 'function' ? window.getArchivedAudits() : [];
  const selectedAudits = allAudits.filter(a => targetIds.includes(a.id));

  if (selectedAudits.length === 0) {
    showToast('⚠️ لم يتم العثور على بيانات للجولات المحددة في التخزين المحلي', 'error');
    return;
  }

  // فرز الجولات ترتيباً زمنياً تصاعدياً حسب التاريخ
  selectedAudits.sort((a, b) => new Date(a.auditDate || 0) - new Date(b.auditDate || 0));

  const btn = document.getElementById('btn-export-bulk-pdf');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>جارٍ تجهيز التقرير الشهري المجمع (${selectedAudits.length} جولات)...</span>`;
  }

  showToast(`⏳ جارٍ تجميع ${selectedAudits.length} جولات تدقيق وبناء التقرير الشهري الشامل...`, 'info');

  let renderRoot = null;

  try {
    const branding = getBrandingSettings();
    const companyName = branding.companyName || 'SAMX-VM';
    const companySubtitle = branding.companySubtitle || 'إدارة العرض المرئي والتنسيق التجاري • Visual Merchandising Department';
    const footerDisclaimer = branding.footerDisclaimer || '';

    // احتساب الإحصاءات التجميعية للدورة الشهرية
    let totalSections = 0;
    let totalPhotos = 0;
    let resolvedCount = 0;
    let followupCount = 0;
    let actionCount = 0;
    const branchesSet = new Set();
    const specialistsSet = new Set();

    selectedAudits.forEach(aud => {
      if (aud.branchName) branchesSet.add(aud.branchName);
      if (aud.auditorName) specialistsSet.add(aud.auditorName);
      (aud.sections || []).forEach(sec => {
        totalSections++;
        if (sec.beforeImg) totalPhotos++;
        if (sec.afterImg) totalPhotos++;
        if (sec.status === 'store_followup') followupCount++;
        else if (sec.status === 'management_action') actionCount++;
        else resolvedCount++;
      });
    });

    const complianceRate = totalSections > 0 ? Math.round((resolvedCount / totalSections) * 100) : 100;
    const earliestDate = selectedAudits[0].auditDate || '';
    const latestDate = selectedAudits[selectedAudits.length - 1].auditDate || '';
    const periodTitle = selectedAudits.length === 1 
      ? `تقرير تدقيق • ${selectedAudits[0].branchName}`
      : `دورة تدقيق شهري متكاملة (${earliestDate} إلى ${latestDate})`;

    // إنشاء حاوية التقديم خارج الشاشة
    renderRoot = document.createElement('div');
    renderRoot.id = 'bulk-monthly-pdf-render-root';
    renderRoot.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 794px;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(renderRoot);

    // =========================================================================
    // الصفحة 1: غلاف التقرير الشهري والملخص التنفيذي
    // =========================================================================
    const coverPage = document.createElement('div');
    coverPage.className = 'bulk-pdf-page';
    coverPage.style.cssText = `
      width: 794px;
      height: 1123px;
      box-sizing: border-box;
      padding: 40px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    `;

    coverPage.innerHTML = `
      <div>
        <!-- رأس الغلاف مع شعار وهوية الشركة -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${branding.logoData ? `
              <div style="height: 54px; max-width: 170px; display: flex; align-items: center; overflow: hidden;">
                <img src="${branding.logoData}" alt="${companyName}" style="max-height: 54px; max-width: 170px; width: auto; height: auto; object-fit: contain;" />
              </div>
            ` : `
              <div style="width: 48px; height: 48px; border-radius: 12px; background: #0f172a; color: #facc15; border: 1.5px solid #eab308; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">
                <span>SX</span>
              </div>
            `}
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">${companyName}</h1>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">${companySubtitle}</p>
            </div>
          </div>
          <div style="text-align: right; font-size: 10.5px; background: #f8fafc; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <div style="color: #64748b;">تاريخ التصدير:</div>
            <div style="font-weight: 800; color: #0f172a;">${new Date().toISOString().split('T')[0]}</div>
            <div style="color: #b45309; font-weight: bold; margin-top: 2px;">دورة معتمدة ✅</div>
          </div>
        </div>

        <!-- لافتة عنوان الدورة الشهرية -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 22px 24px; color: #ffffff; margin-bottom: 24px; border: 1px solid #334155; box-shadow: 0 4px 12px rgba(15,23,42,0.1);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="background: #eab308; color: #0f172a; font-size: 10.5px; font-weight: 900; padding: 3px 10px; border-radius: 9999px;">
              دورة تدقيق ميدانية شهرية شاملة
            </span>
            <span style="color: #94a3b8; font-size: 11px;">${selectedAudits.length} جولات ميدانية متكاملة</span>
          </div>
          <h2 style="margin: 0 0 6px 0; font-size: 23px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
            تقرير دورة العرض المرئي الشهرية (Monthly VM Cycle Dossier)
          </h2>
          <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
            ${periodTitle} • يشمل المعارض: ${Array.from(branchesSet).slice(0, 4).join('، ')}${branchesSet.size > 4 ? ' وغيرها...' : ''}
          </p>
        </div>

        <!-- شبكة مؤشرات الأداء السريعة (4 KPI Cards) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #f59e0b; border-radius: 12px; padding: 12px 14px;">
            <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">الجولات المنفذة</div>
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;">${selectedAudits.length}</div>
            <div style="font-size: 9.5px; color: #f59e0b; font-weight: bold; margin-top: 2px;">${branchesSet.size} معارض تجزئة</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #38bdf8; border-radius: 12px; padding: 12px 14px;">
            <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">الأقسام الموثقة</div>
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;">${totalSections}</div>
            <div style="font-size: 9.5px; color: #0284c7; font-weight: bold; margin-top: 2px;">${totalPhotos} صورة قبل وبعد</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #10b981; border-radius: 12px; padding: 12px 14px;">
            <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">المعالجة الفورية</div>
            <div style="font-size: 22px; font-weight: 900; color: #166534; margin-top: 4px;">${resolvedCount}</div>
            <div style="font-size: 9.5px; color: #16a34a; font-weight: bold; margin-top: 2px;">نسبة الامتثال: ${complianceRate}%</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #ef4444; border-radius: 12px; padding: 12px 14px;">
            <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">متابعة وصيانة</div>
            <div style="font-size: 22px; font-weight: 900; color: #991b1b; margin-top: 4px;">${followupCount + actionCount}</div>
            <div style="font-size: 9.5px; color: #dc2626; font-weight: bold; margin-top: 2px;">${followupCount} متابعة • ${actionCount} صيانة</div>
          </div>
        </div>

        <!-- جدول الجولات الميدانية المشمولة بالدورة -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0f172a;">
            📋 سجل جولات التدقيق الميداني المعتمدة بالدورة:
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: right;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #334155;">
                <th style="padding: 8px 10px; font-weight: 800;">#</th>
                <th style="padding: 8px 10px; font-weight: 800;">المعرض / الفرع</th>
                <th style="padding: 8px 10px; font-weight: 800;">التاريخ</th>
                <th style="padding: 8px 10px; font-weight: 800;">أخصائي الـ VM</th>
                <th style="padding: 8px 10px; font-weight: 800;">الأقسام</th>
                <th style="padding: 8px 10px; font-weight: 800;">حالة التنسيق</th>
              </tr>
            </thead>
            <tbody>
              ${selectedAudits.map((aud, i) => {
                const sCount = (aud.sections || []).length;
                const rCount = (aud.sections || []).filter(s => s.status === 'resolved' || !s.status).length;
                const fCount = sCount - rCount;
                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="padding: 8px 10px; font-weight: bold; color: #64748b;">${i + 1}</td>
                    <td style="padding: 8px 10px; font-weight: 800; color: #0f172a;">${aud.branchName || 'معرض غير محدد'}</td>
                    <td style="padding: 8px 10px; color: #475569;">${aud.auditDate || '-'}</td>
                    <td style="padding: 8px 10px; color: #0284c7; font-weight: 600;">${aud.auditorName || '-'}</td>
                    <td style="padding: 8px 10px; font-weight: bold;">${sCount} أقسام</td>
                    <td style="padding: 8px 10px;">
                      <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: bold; background: ${fCount === 0 ? '#dcfce7' : '#fef3c7'}; color: ${fCount === 0 ? '#166534' : '#92400e'}; border: 1px solid ${fCount === 0 ? '#86efac' : '#fde68a'};">
                        ${fCount === 0 ? 'مكتمل ومعتمد ✅' : `${fCount} متابعة ⏳`}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- الملاحظات التنفيذية والملخص الميداني العام -->
        <div style="background: #fdf6b2; border: 1px solid #facc15; border-radius: 12px; padding: 12px 16px; font-size: 11px; line-height: 1.6; color: #713f12;">
          <strong style="display: block; margin-bottom: 3px; font-size: 11.5px; color: #854d0e;">💡 التوجيهات الميدانية العامة للدورة:</strong>
          تم إنجاز التعديلات الميدانية للجولات المسجلة أعلاه وفق معايير العلامة التجارية وقصص الألوان المعتمدة. يُلزم مدراء المعارض المعنيين بمتابعة المهام المفتوحة واستكمال النواقص خلال المدد المحددة.
        </div>
      </div>

      <!-- تذييل صفحة الغلاف النظيف -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>${companyName} • تقرير الدورة الشهرية الشامل</span>
        <span>صفحة 1</span>
      </div>
    `;

    renderRoot.appendChild(coverPage);

    // =========================================================================
    // الصفحات اللاحقة: تقارير الأقسام التفصيلية لكل جولة مع شارات كبسولية وتوسيط متزن
    // =========================================================================
    let pageNumber = 2;

    for (let audIdx = 0; audIdx < selectedAudits.length; audIdx++) {
      const aud = selectedAudits[audIdx];
      const sections = aud.sections || [];

      if (sections.length === 0) continue;

      const chunkSize = 2;
      for (let sIdx = 0; sIdx < sections.length; sIdx += chunkSize) {
        const chunk = sections.slice(sIdx, sIdx + chunkSize);
        const sectionPage = document.createElement('div');
        sectionPage.className = 'bulk-pdf-page';
        sectionPage.style.cssText = `
          width: 794px;
          height: 1123px;
          box-sizing: border-box;
          padding: 32px 38px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: stretch;
          position: relative;
          overflow: hidden;
        `;

        const isSingleOnBulkPage = (chunk.length === 1);

        sectionPage.innerHTML = `
          <!-- هيدر الجولة الميدانية بالأعلى (نظيف وبدون week numbers أو timestamps) -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; width: 100%;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: #0f172a; color: #facc15; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 6px;">
                  الجولة #${audIdx + 1}
                </span>
                <h2 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">
                  ${aud.branchName}
                </h2>
              </div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 3px; font-weight: 600;">
                المعرض: <strong>${aud.branchName}</strong>  |  التاريخ: <strong>${aud.auditDate}</strong>  |  الأخصائي: <strong>${aud.auditorName}</strong>
              </div>
            </div>
            <div style="text-align: left; font-size: 10.5px; font-weight: bold; color: #0f172a; background: #f8fafc; padding: 4px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              الأقسام: ${sIdx + 1}-${Math.min(sIdx + chunkSize, sections.length)} من ${sections.length}
            </div>
          </div>

          <!-- بطاقات الأقسام الموثقة المتمركزة رأسياً وأفقياً -->
          <div class="pdf-page-content-area" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; margin: auto 0; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: ${isSingleOnBulkPage ? '0px' : '12px'}; width: 100%;">
              ${chunk.map((sec, localIdx) => renderPdfSectionCardHtml(sec, sIdx + localIdx + 1, isSingleOnBulkPage, false)).join('')}
            </div>
          </div>

          <!-- تذييل الصفحة النظيف -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8; width: 100%;">
            <span>${aud.branchName}</span>
            <span>صفحة ${pageNumber++}</span>
          </div>
        `;

        renderRoot.appendChild(sectionPage);
      }
    }

    // =========================================================================
    // الصفحة الأخيرة: الاعتمادات الختامية والتوصيات
    // =========================================================================
    const finalPage = document.createElement('div');
    finalPage.className = 'bulk-pdf-page';
    finalPage.style.cssText = `
      width: 794px;
      height: 1123px;
      box-sizing: border-box;
      padding: 40px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    `;

    finalPage.innerHTML = `
      <div>
        <div style="border-bottom: 3px solid #0f172a; padding-bottom: 14px; margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">
            الاعتمادات الختامية والتوصيات الشهرية (Monthly Sign-off)
          </h2>
          <p style="margin: 4px 0 0 0; font-size: 11.5px; color: #64748b;">
            خاتمة الدورة الشهرية لتقارير العرض المرئي والتنسيق التجاري
          </p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0f172a;">
            📊 خلاصة الحوكمة ومتابعة الأداء الشهري:
          </h4>
          <ul style="margin: 0; padding-right: 20px; font-size: 11.5px; color: #334155; line-height: 1.8;">
            <li>تم توثيق ما مجموعه <strong>${totalSections} قسماً</strong> ميدانياً عبر <strong>${selectedAudits.length} جولات تدقيق</strong> شملت <strong>${branchesSet.size} معارض</strong>.</li>
            <li>حققت الدورة نسبة معالجة فورية للملاحظات بلغت <strong>${complianceRate}%</strong> بمجموع <strong>${resolvedCount} قسماً</strong> تم تصحيحه وفق المعايير المعتمدة.</li>
            <li>يتبقى <strong>${followupCount} مهام متابعة</strong> تتطلب إشراف مدراء المعارض، و<strong>${actionCount} طلبات صيانة</strong> تحت متابعة الفريق الهندسي.</li>
            <li>يُعتمد هذا الملف كمرجع رسمي لتقييم معايير الـ VM بالمعارض للدورة المنتهية.</li>
          </ul>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px;">
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 4px;">
              إدارة العرض المرئي والتنسيق التجاري
            </div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 12px;">
              Head of Visual Merchandising
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
              الاسم: <strong>فريق إشراف الـ VM المركزي</strong>
            </div>
            <div style="height: 50px; border-bottom: 1.5px dashed #94a3b8; display: flex; align-items: flex-end; padding-bottom: 4px; font-size: 10px; color: #64748b;">
              الاعتماد والتوقيع: ................................................
            </div>
          </div>

          <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px;">
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 4px;">
              إدارة العمليات وتشغيل المعارض
            </div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 12px;">
              Retail Operations Director
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
              الاسم: <strong>إدارة تشغيل قطاع التجزئة</strong>
            </div>
            <div style="height: 50px; border-bottom: 1.5px dashed #94a3b8; display: flex; align-items: flex-end; padding-bottom: 4px; font-size: 10px; color: #64748b;">
              الختم والاعتماد: ................................................
            </div>
          </div>
        </div>

        ${footerDisclaimer ? `
          <div style="background: #f1f5f9; border-radius: 10px; padding: 12px 16px; font-size: 10.5px; color: #64748b; text-align: center; line-height: 1.5;">
            ${footerDisclaimer}
          </div>
        ` : ''}
      </div>

      <!-- تذييل الصفحة الأخيرة -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>${companyName} • ختام تقرير الدورة الشهرية</span>
        <span>صفحة ${pageNumber}</span>
      </div>
    `;

    renderRoot.appendChild(finalPage);

    // التقاط كل صفحة مستقلاً عبر html2canvas
    const pages = renderRoot.querySelectorAll('.bulk-pdf-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfPageWidth = 210;
    const pdfPageHeight = 297;

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, pdfPageHeight, undefined, 'FAST');

      if (i < pages.length - 1) {
        pdf.addPage();
      }
    }

    const cleanCompany = (companyName || 'SAMX_VM').replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanPeriod = (periodTitle || 'الدورة_الشهرية').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30).trim();
    const fileName = `تقرير_الدورة_الشهرية_المجمعة_${cleanCompany}_${cleanPeriod}.pdf`;

    pdf.save(fileName);
    showToast(`🎉 تم تحميل تقرير الدورة الشهرية المجمع بنجاح: ${fileName}`, 'success');

  } catch (err) {
    console.error('exportBulkMonthlyAuditPdf error:', err);
    showToast(`حدث خطأ أثناء تصدير التقرير الشهري المجمع: ${err.message}`, 'error');
  } finally {
    if (renderRoot && renderRoot.parentNode) {
      renderRoot.parentNode.removeChild(renderRoot);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons(); } catch(e){}
      }
    }
  }
}

/**
 * تصدير ملفات التدقيق المحددة بصيغة JSON مجمعة
 */
export function exportBulkSelectedJson(selectedAuditIds = null) {
  let targetIds = selectedAuditIds;
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    const checkedBoxes = document.querySelectorAll('.bulk-audit-checkbox:checked');
    targetIds = Array.from(checkedBoxes).map(cb => cb.dataset.id).filter(Boolean);
  }

  if (targetIds.length === 0) {
    showToast('⚠️ يرجى تحديد تقرير تدقيق واحد على الأقل لتصدير ملفات JSON', 'error');
    return;
  }

  const allAudits = typeof window.getArchivedAudits === 'function' ? window.getArchivedAudits() : [];
  const selectedAudits = allAudits.filter(a => targetIds.includes(a.id));

  const bundle = {
    exportedAt: new Date().toISOString(),
    system: 'SAMX-VM Core',
    exportType: 'Monthly Audit Cycle JSON Bundle',
    count: selectedAudits.length,
    audits: selectedAudits
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataStr);
  anchor.setAttribute('download', `حزمة_تقارير_الدورة_الشهرية_SAMX_VM_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  showToast(`✅ تم تصدير ${selectedAudits.length} ملفات تدقيق مجمعة بصيغة JSON`, 'success');
}

if (typeof window !== 'undefined') {
  window.exportAuditToPdf = exportAuditToPdf;
  window.exportBulkMonthlyAuditPdf = exportBulkMonthlyAuditPdf;
  window.exportBulkSelectedJson = exportBulkSelectedJson;
}
