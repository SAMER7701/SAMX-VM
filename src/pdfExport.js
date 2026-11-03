/**
 * SAMX-VM Client-Side PDF Generation Engine
 * Generates high-fidelity downloadable A4 PDF reports reflecting custom brand identity and logo.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { currentAudit, getBrandingSettings } from './store.js';
import { showToast, renderPrintSections, syncBrandingUI } from './renderers.js';

/**
 * تصدير التقرير التنفيذي كملف PDF رقمي جاهز للتحميل
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

  try {
    showToast('📄 جارٍ تجهيز ملف الـ PDF عالي الدقة...', 'info');

    // 1. مزامنة بيانات الهوية البصرية ورسم الأقسام
    syncBrandingUI();
    renderPrintSections();

    // 2. فحص عنصر التقرير المطبوع
    const reportSheet = document.getElementById('print-sheet-wrapper');
    if (!reportSheet) {
      throw new Error('لم يتم العثور على ورقة التقرير المطبوعة');
    }

    // 3. التقاط التقرير عبر html2canvas بدقة 2x مع دعم الصور وعبر النطاقات
    const canvas = await html2canvas(reportSheet, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 4. إعداد مستند A4 عمودي في jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // الصفحة الأولى
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // الصفحات اللاحقة إن كان التقرير يمتد لأكثر من صفحة
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    // 5. استخراج اسم الشركة والفرع لتسمية الملف
    const branding = getBrandingSettings();
    const cleanCompany = (branding.companyName || 'SAMX-VM').replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanBranch = (currentAudit.branchName || 'Store').replace(/[\\/:*?"<>|]/g, '_').trim();
    const fileName = `تقرير_تدقيق_${cleanCompany}_${cleanBranch}_W${currentAudit.weekNumber || 1}.pdf`;

    pdf.save(fileName);
    showToast(`✅ تم تحميل تقرير الـ PDF بنجاح: ${fileName}`, 'success');
  } catch (err) {
    console.error('exportAuditToPdf error:', err);
    showToast('حدث خطأ أثناء معالجة PDF، يمكنك استخدام زر "طباعة / حفظ PDF" المباشر.', 'error');
  } finally {
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
 * بمقاس A4 عمودي دون أي اقتطاع للصور أو النصوص
 */
export async function exportBulkMonthlyAuditPdf(selectedAuditIds = null) {
  // 1. تحديد التقارير المختارة
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

  // فرز الجولات ترتيباً زمنياً تصاعدياً حسب التاريخ ورقم الأسبوع
  selectedAudits.sort((a, b) => {
    const dateA = new Date(a.auditDate || 0);
    const dateB = new Date(b.auditDate || 0);
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return (Number(a.weekNumber) || 0) - (Number(b.weekNumber) || 0);
  });

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
    const footerDisclaimer = branding.footerDisclaimer || 'تقرير تدقيق معتمد صادر من منصة العرض المرئي الميداني SAMX-VM • سري وخاص بإدارة المعارض';

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
      ? `جولة أسبوع ${selectedAudits[0].weekNumber} • ${selectedAudits[0].branchName}`
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(renderRoot);

    // =========================================================================
    // الصفحة 1: غلاف التقرير الشهري والملخص التنفيذي (Executive Dossier Cover)
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
      border-bottom: 2px dashed #cbd5e1;
    `;

    coverPage.innerHTML = `
      <div>
        <!-- رأس الغلاف مع شعار وهوية الشركة -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${branding.logoData ? `
              <div style="height: 54px; max-width: 170px; display: flex; align-items: center; overflow: hidden;">
                <img src="${branding.logoData}" alt="${companyName}" style="max-height: 54px; max-width: 170px; width: auto; height: auto; object-contain;" />
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
          <div style="text-align: left; font-size: 10.5px; background: #f8fafc; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
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
                <th style="padding: 8px 10px; font-weight: 800;">الأسبوع</th>
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
                    <td style="padding: 8px 10px; font-weight: 700; color: #b45309;">أسبوع ${aud.weekNumber || 1}</td>
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

      <!-- تذييل صفحة الغلاف -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>منظومة SAMX-VM • تقرير الدورة الشهرية الشامل</span>
        <span>صفحة 1</span>
      </div>
    `;

    renderRoot.appendChild(coverPage);

    // =========================================================================
    // الصفحات اللاحقة: تقارير الأقسام التفصيلية لكل جولة مع شارات كبسولية أنيقة
    // =========================================================================
    let pageNumber = 2;

    for (let audIdx = 0; audIdx < selectedAudits.length; audIdx++) {
      const aud = selectedAudits[audIdx];
      const sections = aud.sections || [];

      // إذا لم يكن بالقسم أقسام موثقة
      if (sections.length === 0) {
        const emptyPage = document.createElement('div');
        emptyPage.className = 'bulk-pdf-page';
        emptyPage.style.cssText = `
          width: 794px;
          height: 1123px;
          box-sizing: border-box;
          padding: 40px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-bottom: 2px dashed #cbd5e1;
        `;
        emptyPage.innerHTML = `
          <div>
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a;">${aud.branchName} • الأسبوع ${aud.weekNumber}</h2>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">التاريخ: ${aud.auditDate} | الأخصائي: ${aud.auditorName}</p>
            </div>
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 13px; border: 2px dashed #e2e8f0; border-radius: 16px;">
              لا توجد أقسام مسجلة في جولة هذا المعرض.
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
            <span>${aud.branchName} | أسبوع ${aud.weekNumber}</span>
            <span>صفحة ${pageNumber++}</span>
          </div>
        `;
        renderRoot.appendChild(emptyPage);
        continue;
      }

      // تقسيم الأقسام بحيث يظهر قسمان كحد أقصى في كل صفحة A4 لضمان عدم اقتصاص أي صورة
      const chunkSize = 2;
      for (let sIdx = 0; sIdx < sections.length; sIdx += chunkSize) {
        const chunk = sections.slice(sIdx, sIdx + chunkSize);
        const sectionPage = document.createElement('div');
        sectionPage.className = 'bulk-pdf-page';
        sectionPage.style.cssText = `
          width: 794px;
          height: 1123px;
          box-sizing: border-box;
          padding: 36px 40px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-bottom: 2px dashed #cbd5e1;
        `;

        const isFirstChunk = (sIdx === 0);

        sectionPage.innerHTML = `
          <div>
            <!-- هيدر الجولة الميدانية بالأعلى -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: #0f172a; color: #facc15; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 6px;">
                    الجولة #${audIdx + 1}
                  </span>
                  <h2 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">
                    ${aud.branchName}
                  </h2>
                </div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 2px; font-weight: 600;">
                  الأسبوع: <strong style="color: #b45309;">${aud.weekNumber}</strong>  |  التاريخ: <strong>${aud.auditDate}</strong>  |  الأخصائي: <strong>${aud.auditorName}</strong>
                </div>
              </div>
              <div style="text-align: left; font-size: 10.5px; font-weight: bold; color: #0f172a; background: #f8fafc; padding: 4px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                الأقسام: ${sIdx + 1}-${Math.min(sIdx + chunkSize, sections.length)} من ${sections.length}
              </div>
            </div>

            <!-- بطاقات الأقسام الموثقة في هذا الجزء -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${chunk.map((sec, localIdx) => {
                const globalIndex = sIdx + localIdx + 1;
                const layout = sec.layoutType || 'comparison';

                // شارة الحالة
                let statusBadge = '<span style="background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: bold;">تم المعالجة ✅</span>';
                if (sec.status === 'store_followup') {
                  statusBadge = '<span style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: bold;">متابعة الفرع ⏳</span>';
                } else if (sec.status === 'management_action') {
                  statusBadge = '<span style="background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 2px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: bold;">صيانة / إدارة ⚠️</span>';
                }

                // حاوية الصور بناءً على نمط التخطيط مع الشارات الكبسولية بوسط أعلى الصورة
                let imagesHtml = '';

                if (layout === 'single_panorama') {
                  // بانوراما كاملة للواجهات أو المخازن
                  imagesHtml = `
                    <div style="width: 100%; height: 215px; border-radius: 10px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; background: #f1f5f9; margin-bottom: 8px;">
                      <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 9999px; background: #0f172a; color: #fde68a; border: 1px solid #f59e0b; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">
                        <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #facc15;"></span>
                        <span>● Panorama View</span>
                      </div>
                      <img src="${sec.afterImg || sec.beforeImg}" alt="Panorama View" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                  `;
                } else if (layout === 'stacked_panorama') {
                  // بانوراما مكدسة
                  imagesHtml = `
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
                      <div style="width: 100%; height: 105px; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; background: #f1f5f9;">
                        <div style="position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 1.5px 8px; border-radius: 9999px; background: #881337; color: #ffffff; border: 1px solid #ef4444; font-size: 8.5px; font-weight: bold;">
                          <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #fca5a5;"></span>
                          <span>● Before</span>
                        </div>
                        <img src="${sec.beforeImg}" alt="Before" style="width: 100%; height: 100%; object-fit: cover;" />
                      </div>
                      <div style="width: 100%; height: 105px; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; background: #f1f5f9;">
                        <div style="position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 1.5px 8px; border-radius: 9999px; background: #064e3b; color: #ffffff; border: 1px solid #10b981; font-size: 8.5px; font-weight: bold;">
                          <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #86efac;"></span>
                          <span>● After</span>
                        </div>
                        <img src="${sec.afterImg}" alt="After" style="width: 100%; height: 100%; object-fit: cover;" />
                      </div>
                    </div>
                  `;
                } else {
                  // مقارنة جانبية أنيقة Side-by-Side (الافتراضي)
                  imagesHtml = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                      <!-- صورة الوضع السابق (اليمين) -->
                      <div style="width: 100%; height: 215px; border-radius: 10px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; background: #f1f5f9;">
                        <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 9999px; background: #881337; color: #ffffff; border: 1px solid #ef4444; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #fca5a5;"></span>
                          <span>● Before</span>
                        </div>
                        <img src="${sec.beforeImg}" alt="Before" style="width: 100%; height: 100%; object-fit: cover;" />
                      </div>

                      <!-- صورة بعد التعديل (اليسار) -->
                      <div style="width: 100%; height: 215px; border-radius: 10px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; background: #f1f5f9;">
                        <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 9999px; background: #064e3b; color: #ffffff; border: 1px solid #10b981; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #86efac;"></span>
                          <span>● After</span>
                        </div>
                        <img src="${sec.afterImg}" alt="After" style="width: 100%; height: 100%; object-fit: cover;" />
                      </div>
                    </div>
                  `;
                }

                return `
                  <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <!-- عنوان وشارة القسم -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 20px; height: 20px; border-radius: 6px; background: #0f172a; color: #facc15; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center;">
                          ${globalIndex}
                        </span>
                        <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">${sec.title}</h4>
                      </div>
                      <div>${statusBadge}</div>
                    </div>

                    <!-- الصور مع الشارات -->
                    ${imagesHtml}

                    <!-- معايير الـ VM المطبقة إذا وُجدت -->
                    ${sec.checklist && sec.checklist.length > 0 ? `
                      <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; font-size: 9.5px; color: #854d0e;">
                        <strong>✓ معايير الـ VM المطبقة (${sec.checklist.length}):</strong> ${sec.checklist.join('  •  ')}
                      </div>
                    ` : ''}

                    <!-- صندوق المتابعة والتكليف إذا وُجد -->
                    ${(sec.status === 'store_followup' || sec.status === 'management_action') ? `
                      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; font-size: 9.5px; color: #92400e; display: flex; justify-content: space-between;">
                        <span>⚠️ <strong>المكلف بالإجراء:</strong> ${sec.actionAssignee || 'مدير المعرض'}</span>
                        <span>📅 <strong>تاريخ الإنجاز:</strong> ${sec.actionDueDate || 'خلال أسبوع'}</span>
                      </div>
                    ` : ''}

                    <!-- الملاحظات الفنية -->
                    <div style="font-size: 10px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.4;">
                      <strong style="color: #0f172a;">الملاحظات الميدانية:</strong> ${sec.notes || 'تم التنفيذ والتعديل وفق معايير التنسيق المعتمدة.'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- تذييل الصفحة برقم الشريحة واسم الفرع -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
            <span>${aud.branchName} • أسبوع ${aud.weekNumber}</span>
            <span>صفحة ${pageNumber++}</span>
          </div>
        `;

        renderRoot.appendChild(sectionPage);
      }
    }

    // =========================================================================
    // الصفحة الأخيرة: الاعتمادات الختامية للدورة الشهرية (Monthly Governance & Sign-off)
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

        <!-- ملخص نتائج الدورة والتوصيات الاستراتيجية -->
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

        <!-- صناديق التواقيع والاعتماد الرسمي -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <!-- توقيع رئيس قسم العرض المرئي -->
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

          <!-- توقيع مدير إدارة العمليات والمعارض -->
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

        <!-- نص التذييل القانوني والسياسة الرسمية -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 12px 16px; font-size: 10.5px; color: #64748b; text-align: center; line-height: 1.5;">
          ${footerDisclaimer}
        </div>
      </div>

      <!-- تذييل الصفحة الأخيرة -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>منظومة SAMX-VM • ختام تقرير الدورة الشهرية</span>
        <span>صفحة ${pageNumber}</span>
      </div>
    `;

    renderRoot.appendChild(finalPage);

    // =========================================================================
    // التقاط الصفحات عبر html2canvas وتوليد مستند jsPDF
    // =========================================================================
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

    // تسمية وحفظ الملف
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
