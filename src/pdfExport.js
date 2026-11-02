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

if (typeof window !== 'undefined') {
  window.exportAuditToPdf = exportAuditToPdf;
}
