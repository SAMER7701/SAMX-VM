/**
 * SAMX-VM PowerPoint Export Engine (.pptx)
 * Version: 1.4.0
 * Architecture: Client-Side Native Presentation Generator
 * Generates fully editable, executive 16:9 widescreen slides for store audit reports.
 */

import pptxgen from 'pptxgenjs';
import { currentAudit } from './store.js';
import { showToast } from './renderers.js';

/**
 * دالة مساعدة للتحقق من سلامة صور Base64 / Data URLs
 */
function isValidImageData(data) {
  if (!data || typeof data !== 'string') return false;
  return data.startsWith('data:image/') || data.startsWith('http://') || data.startsWith('https://');
}

/**
 * الدالة الرئيسية لتوليد وتحميل ملف PowerPoint (.pptx)
 */
export async function exportAuditToPptx() {
  const sections = currentAudit.sections || [];

  if (sections.length === 0) {
    showToast('⚠️ لا توجد أقسام موثقة في هذا التقرير لتصديرها إلى PowerPoint!', 'error');
    return;
  }

  showToast('⏳ جارٍ إعداد وتوليد عرض PowerPoint (.pptx)...', 'info');

  try {
    // إنشاء كائن العرض التقديمي بصيغة 16:9 عريضة
    const PptxConstructor = typeof pptxgen === 'function' ? pptxgen : (pptxgen.default || pptxgen);
    const pres = new PptxConstructor();
    
    pres.layout = 'LAYOUT_16x9';
    pres.title = `SAMX-VM Audit - ${currentAudit.branchName || 'Store Audit'}`;
    pres.subject = 'Visual Merchandising Field Audit Report';
    pres.author = currentAudit.auditorName || 'VM Specialist';
    pres.company = 'SAMX-VM Retail Solutions';

    const branchName = currentAudit.branchName || 'معرض غير محدد';
    const auditorName = currentAudit.auditorName || 'أخصائي العرض المرئي';
    const auditDate = currentAudit.auditDate || new Date().toISOString().split('T')[0];
    const weekNumber = currentAudit.weekNumber || 43;

    // حساب الإحصائيات العامة للجولة
    let totalPhotos = 0;
    let resolvedCount = 0;
    let followupCount = 0;
    let actionCount = 0;

    sections.forEach(s => {
      if (s.beforeImg) totalPhotos++;
      if (s.afterImg) totalPhotos++;
      if (s.status === 'store_followup') followupCount++;
      else if (s.status === 'management_action') actionCount++;
      else resolvedCount++;
    });

    // =========================================================================
    // 1. الشريحة الأولى: الغلاف التنفيذي والملخص العام (Cover Slide)
    // =========================================================================
    const coverSlide = pres.addSlide();
    coverSlide.background = { color: '0B132B' }; // خلفية كحلية داكنة فخمة

    // شريط علوي ذهبي جذاب
    coverSlide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.12,
      fill: { color: 'EAB308' },
      line: { color: 'EAB308', width: 0 }
    });

    // شعار وعنوان المنظومة
    coverSlide.addShape(pres.ShapeType.roundRect, {
      x: 0.6,
      y: 0.5,
      w: 3.2,
      h: 0.5,
      rectRadius: 0.1,
      fill: { color: '1C2541' },
      line: { color: 'EAB308', width: 1.2 }
    });

    coverSlide.addText('SAMX-VM | تقرير التدقيق الميداني', {
      x: 0.6,
      y: 0.5,
      w: 3.2,
      h: 0.5,
      fontSize: 13,
      fontFace: 'Arial',
      bold: true,
      color: 'FACC15',
      align: 'center',
      valign: 'middle',
      rtlMode: true
    });

    // العنوان الرئيسي (اسم الفرع / المعرض)
    coverSlide.addText(branchName, {
      x: 0.6,
      y: 1.25,
      w: 8.8,
      h: 0.85,
      fontSize: 26,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      align: 'right',
      valign: 'middle',
      rtlMode: true
    });

    // العنوان الفرعي لإدارة الـ VM
    coverSlide.addText('إدارة العرض المرئي والتنسيق التجاري • Visual Merchandising Field Audit Report', {
      x: 0.6,
      y: 2.1,
      w: 8.8,
      h: 0.4,
      fontSize: 13,
      fontFace: 'Arial',
      color: '94A3B8',
      align: 'right',
      rtlMode: true
    });

    // 4 بطاقات بيانات سريعة متناسقة
    const cardData = [
      { label: 'رقم الأسبوع', value: `الأسبوع ${weekNumber}`, icon: '🗓️', col: 'F59E0B' },
      { label: 'تاريخ التدقيق', value: auditDate, icon: '📅', col: '10B981' },
      { label: 'أخصائي الـ VM', value: auditorName, icon: '👤', col: '38BDF8' },
      { label: 'الأقسام الموثقة', value: `${sections.length} أقسام`, icon: '🏬', col: 'EAB308' }
    ];

    const cardWidth = 2.05;
    const cardGap = 0.2;
    const startX = 0.6;
    const cardY = 2.75;

    cardData.forEach((c, i) => {
      const cx = startX + i * (cardWidth + cardGap);

      // خلفية البطاقة
      coverSlide.addShape(pres.ShapeType.roundRect, {
        x: cx,
        y: cardY,
        w: cardWidth,
        h: 1.1,
        rectRadius: 0.12,
        fill: { color: '1C2541' },
        line: { color: '334155', width: 1 }
      });

      // شريط تمييز جانبي
      coverSlide.addShape(pres.ShapeType.rect, {
        x: cx + cardWidth - 0.08,
        y: cardY + 0.15,
        w: 0.08,
        h: 0.8,
        fill: { color: c.col },
        line: { color: c.col, width: 0 }
      });

      // نص العنوان الصغير
      coverSlide.addText(c.label, {
        x: cx + 0.1,
        y: cardY + 0.12,
        w: cardWidth - 0.25,
        h: 0.3,
        fontSize: 10,
        fontFace: 'Arial',
        color: '94A3B8',
        align: 'right',
        rtlMode: true
      });

      // القيمة البارزة
      coverSlide.addText(`${c.value}`, {
        x: cx + 0.1,
        y: cardY + 0.45,
        w: cardWidth - 0.25,
        h: 0.5,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
        align: 'right',
        valign: 'middle',
        rtlMode: true
      });
    });

    // شريط إحصائيات الإنجاز والمهام في الأسفل
    coverSlide.addShape(pres.ShapeType.roundRect, {
      x: 0.6,
      y: 4.15,
      w: 8.8,
      h: 0.85,
      rectRadius: 0.12,
      fill: { color: '111D4A' },
      line: { color: '38BDF8', width: 0.8 }
    });

    coverSlide.addText([
      { text: `📊 ملخص إحصاءات الجولة:   `, options: { bold: true, color: '38BDF8', fontSize: 11 } },
      { text: `إجمالي الصور: ${totalPhotos}   |   `, options: { color: 'E2E8F0', fontSize: 11 } },
      { text: `تم المعالجة: ${resolvedCount}   |   `, options: { color: '10B981', fontSize: 11, bold: true } },
      { text: `متابعة الفرع: ${followupCount}   |   `, options: { color: 'F59E0B', fontSize: 11, bold: true } },
      { text: `إجراء إداري / صيانة: ${actionCount}`, options: { color: 'F87171', fontSize: 11, bold: true } }
    ], {
      x: 0.8,
      y: 4.15,
      w: 8.4,
      h: 0.85,
      align: 'right',
      valign: 'middle',
      rtlMode: true
    });

    // تذييل الشريحة
    coverSlide.addText('منظومة SAMX-VM لإدارة وتوثيق العرض المرئي • تم الإنشاء تلقائياً وقابل للتعديل الكامل', {
      x: 0.6,
      y: 5.2,
      w: 8.8,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: '64748B',
      align: 'center',
      rtlMode: true
    });

    // =========================================================================
    // 2. الشرائح الميدانية: شريحة لكل قسم موثق مع صور (Before / After)
    // =========================================================================
    sections.forEach((sec, idx) => {
      const slide = pres.addSlide();
      slide.background = { color: 'F8FAFC' }; // خلفية فاتحة نظيفة مريحة للعرض

      // 1) الهيدر العلوي للقسم
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4,
        y: 0.3,
        w: 9.2,
        h: 0.85,
        rectRadius: 0.1,
        fill: { color: '0F172A' },
        line: { color: '1E293B', width: 1 }
      });

      // شارة رقم القسم الذهبية
      slide.addShape(pres.ShapeType.roundRect, {
        x: 9.0,
        y: 0.45,
        w: 0.45,
        h: 0.55,
        rectRadius: 0.08,
        fill: { color: 'EAB308' },
        line: { color: 'EAB308', width: 0 }
      });

      slide.addText(`#${idx + 1}`, {
        x: 9.0,
        y: 0.45,
        w: 0.45,
        h: 0.55,
        fontSize: 14,
        fontFace: 'Arial',
        bold: true,
        color: '0F172A',
        align: 'center',
        valign: 'middle'
      });

      // عنوان القسم
      slide.addText(sec.title || `القسم رقم ${idx + 1}`, {
        x: 2.8,
        y: 0.35,
        w: 6.0,
        h: 0.45,
        fontSize: 16,
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
        align: 'right',
        valign: 'middle',
        rtlMode: true
      });

      // شارة الحالة (Status Badge)
      let statusText = 'تم المعالجة والتنسيق';
      let statusColor = '10B981';
      let statusBg = '064E3B';
      if (sec.status === 'store_followup') {
        statusText = 'مهمة متابعة للفرع';
        statusColor = 'F59E0B';
        statusBg = '78350F';
      } else if (sec.status === 'management_action') {
        statusText = 'إجراء صيانة / تدخل إداري';
        statusColor = 'F87171';
        statusBg = '7F1D1D';
      }

      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.6,
        y: 0.45,
        w: 2.0,
        h: 0.35,
        rectRadius: 0.08,
        fill: { color: statusBg },
        line: { color: statusColor, width: 1 }
      });

      slide.addText(statusText, {
        x: 0.6,
        y: 0.45,
        w: 2.0,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Arial',
        bold: true,
        color: statusColor,
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });

      // وسوم المعالجة السريعة تحت العنوان إذا وُجدت
      const tagsList = sec.tags && sec.tags.length > 0 ? sec.tags.join('  •  ') : '';
      if (tagsList) {
        slide.addText(`الوسوم: ${tagsList}`, {
          x: 2.8,
          y: 0.8,
          w: 6.0,
          h: 0.3,
          fontSize: 9.5,
          fontFace: 'Arial',
          color: 'E2E8F0',
          align: 'right',
          rtlMode: true
        });
      }

      // 2) مربعات مقارنة الصور (Before / After)
      const colWidth = 4.45;
      const colHeight = 2.45;
      const colY = 1.3;

      // --- عمود اليمين: الوضع السابق (Before) ---
      const beforeX = 5.15; // في العرض العربي اليمين يمثل البداية
      slide.addShape(pres.ShapeType.roundRect, {
        x: beforeX,
        y: colY,
        w: colWidth,
        h: 0.35,
        rectRadius: 0.08,
        fill: { color: 'FEE2E2' },
        line: { color: 'EF4444', width: 1 }
      });

      slide.addText('🔴 الوضع السابق (Before Audit)', {
        x: beforeX,
        y: colY,
        w: colWidth,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Arial',
        bold: true,
        color: '991B1B',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });

      // إطار صورة Before
      slide.addShape(pres.ShapeType.rect, {
        x: beforeX,
        y: colY + 0.35,
        w: colWidth,
        h: colHeight,
        fill: { color: 'E2E8F0' },
        line: { color: 'CBD5E1', width: 1 }
      });

      if (isValidImageData(sec.beforeImg)) {
        try {
          slide.addImage({
            data: sec.beforeImg,
            x: beforeX,
            y: colY + 0.35,
            w: colWidth,
            h: colHeight,
            sizing: { type: 'contain', w: colWidth, h: colHeight }
          });
        } catch (imgErr) {
          console.warn('Could not add Before image to slide:', imgErr);
          slide.addText('تعذر إدراج صورة الوضع السابق', {
            x: beforeX,
            y: colY + 1.2,
            w: colWidth,
            h: 0.5,
            fontSize: 11,
            color: '64748B',
            align: 'center',
            rtlMode: true
          });
        }
      } else {
        slide.addText('لا توجد صورة سابقة مسجلة', {
          x: beforeX,
          y: colY + 1.2,
          w: colWidth,
          h: 0.5,
          fontSize: 11,
          color: '64748B',
          align: 'center',
          rtlMode: true
        });
      }

      // --- عمود اليسار: بعد التنفيذ والتعديل (After VM) ---
      const afterX = 0.4;
      slide.addShape(pres.ShapeType.roundRect, {
        x: afterX,
        y: colY,
        w: colWidth,
        h: 0.35,
        rectRadius: 0.08,
        fill: { color: 'D1FAE5' },
        line: { color: '10B981', width: 1 }
      });

      slide.addText('🟢 بعد التنفيذ والتعديل (After VM Action)', {
        x: afterX,
        y: colY,
        w: colWidth,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Arial',
        bold: true,
        color: '065F46',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });

      // إطار صورة After
      slide.addShape(pres.ShapeType.rect, {
        x: afterX,
        y: colY + 0.35,
        w: colWidth,
        h: colHeight,
        fill: { color: 'E2E8F0' },
        line: { color: 'CBD5E1', width: 1 }
      });

      if (isValidImageData(sec.afterImg)) {
        try {
          slide.addImage({
            data: sec.afterImg,
            x: afterX,
            y: colY + 0.35,
            w: colWidth,
            h: colHeight,
            sizing: { type: 'contain', w: colWidth, h: colHeight }
          });
        } catch (imgErr) {
          console.warn('Could not add After image to slide:', imgErr);
          slide.addText('تعذر إدراج صورة بعد التعديل', {
            x: afterX,
            y: colY + 1.2,
            w: colWidth,
            h: 0.5,
            fontSize: 11,
            color: '64748B',
            align: 'center',
            rtlMode: true
          });
        }
      } else {
        slide.addText('لا توجد صورة بعد التعديل مسجلة', {
          x: afterX,
          y: colY + 1.2,
          w: colWidth,
          h: 0.5,
          fontSize: 11,
          color: '64748B',
          align: 'center',
          rtlMode: true
        });
      }

      // 3) صندوق تفاصيل المعايير والملاحظات في أسفل الشريحة
      const infoBoxY = 4.25;
      const infoBoxH = 1.05;

      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4,
        y: infoBoxY,
        w: 9.2,
        h: infoBoxH,
        rectRadius: 0.08,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 1 }
      });

      // إعداد نص الملاحظات والمعايير
      const textParts = [];

      // إذا كانت هناك معايير معتمدة
      if (sec.checklist && sec.checklist.length > 0) {
        textParts.push({
          text: `معايير الـ VM المعتمدة المطبقة (${sec.checklist.length}): `,
          options: { bold: true, color: 'B45309', fontSize: 10 }
        });
        textParts.push({
          text: `${sec.checklist.join('  •  ')}\n`,
          options: { color: '334155', fontSize: 9.5 }
        });
      }

      // إذا كانت مهمة متابعة أو إجراء إداري
      if (sec.status === 'store_followup' || sec.status === 'management_action') {
        const isFollow = sec.status === 'store_followup';
        textParts.push({
          text: isFollow ? `⚠️ تكليف متابعة للفرع: ` : `🚨 إجراء صيانة / تدخل إداري: `,
          options: { bold: true, color: isFollow ? 'D97706' : 'DC2626', fontSize: 10 }
        });
        textParts.push({
          text: `المسؤول: ${sec.actionAssignee || 'مدير المعرض'}  |  تاريخ الإنجاز المستهدف: ${sec.actionDueDate || 'خلال أسبوع'}\n`,
          options: { bold: true, color: '0F172A', fontSize: 9.5 }
        });
      }

      // الملاحظات الفنية
      textParts.push({
        text: `الملاحظات والمبررات الميدانية: `,
        options: { bold: true, color: '0F172A', fontSize: 10 }
      });
      textParts.push({
        text: sec.notes ? `${sec.notes}` : 'تم تنفيذ وتعديل التنسيق وفق أعلى المعايير المعتمدة.',
        options: { color: '475569', fontSize: 9.5 }
      });

      slide.addText(textParts, {
        x: 0.55,
        y: infoBoxY + 0.08,
        w: 8.9,
        h: infoBoxH - 0.16,
        align: 'right',
        valign: 'top',
        rtlMode: true
      });

      // تذييل الصفحة برقم الشريحة واسم الفرع
      slide.addText(`${branchName}  •  الأسبوع ${weekNumber}  |  صفحة ${idx + 2} من ${sections.length + 2}`, {
        x: 0.4,
        y: 5.35,
        w: 9.2,
        h: 0.22,
        fontSize: 8.5,
        fontFace: 'Arial',
        color: '94A3B8',
        align: 'center',
        rtlMode: true
      });
    });

    // =========================================================================
    // 3. الشريحة الختامية: التواقيع والاعتمادات الرسمية (Sign-off & Approvals)
    // =========================================================================
    const finalSlide = pres.addSlide();
    finalSlide.background = { color: '0B132B' }; // عودة لنمط الهوية الاحترافي الداكن

    // ترويسة الشريحة
    finalSlide.addShape(pres.ShapeType.roundRect, {
      x: 0.6,
      y: 0.5,
      w: 8.8,
      h: 0.8,
      rectRadius: 0.1,
      fill: { color: '1C2541' },
      line: { color: 'EAB308', width: 1 }
    });

    finalSlide.addText('الاعتمادات والتوصيات الميدانية الرسمية | Official Sign-off', {
      x: 0.6,
      y: 0.5,
      w: 8.8,
      h: 0.8,
      fontSize: 16,
      fontFace: 'Arial',
      bold: true,
      color: 'FACC15',
      align: 'center',
      valign: 'middle',
      rtlMode: true
    });

    // 2 صندوق توقيع واعتماد كبيرين
    const signBoxW = 4.25;
    const signBoxH = 2.4;
    const signY = 1.6;

    // صندوق أخصائي الـ VM (اليمين)
    const vmSignX = 5.15;
    finalSlide.addShape(pres.ShapeType.roundRect, {
      x: vmSignX,
      y: signY,
      w: signBoxW,
      h: signBoxH,
      rectRadius: 0.12,
      fill: { color: '1C2541' },
      line: { color: '334155', width: 1 }
    });

    finalSlide.addText([
      { text: `إعداد واعتماد أخصائي العرض المرئي (VM Specialist)\n`, options: { bold: true, color: 'FACC15', fontSize: 12 } },
      { text: `أقر بأن كافة الملاحظات والصور المرفقة تم توثيقها ميدانياً بدقة وفق معايير العلامة التجارية.\n\n`, options: { color: '94A3B8', fontSize: 10 } },
      { text: `اسم الأخصائي: `, options: { bold: true, color: 'FFFFFF', fontSize: 11 } },
      { text: `${auditorName}\n\n`, options: { bold: true, color: '38BDF8', fontSize: 11 } },
      { text: `التوقيع: ....................................................`, options: { color: '64748B', fontSize: 11 } }
    ], {
      x: vmSignX + 0.25,
      y: signY + 0.2,
      w: signBoxW - 0.5,
      h: signBoxH - 0.4,
      align: 'right',
      valign: 'top',
      rtlMode: true
    });

    // صندوق مدير المعرض (اليسار)
    const storeSignX = 0.6;
    finalSlide.addShape(pres.ShapeType.roundRect, {
      x: storeSignX,
      y: signY,
      w: signBoxW,
      h: signBoxH,
      rectRadius: 0.12,
      fill: { color: '1C2541' },
      line: { color: '334155', width: 1 }
    });

    finalSlide.addText([
      { text: `ملاحظات واعتماد إدارة المعرض (Store Manager)\n`, options: { bold: true, color: 'FACC15', fontSize: 12 } },
      { text: `تم الاطلاع على نتائج التدقيق الميداني والالتزام بإنهاء مهام المتابعة المحددة ضمن التواريخ الموضحة.\n\n`, options: { color: '94A3B8', fontSize: 10 } },
      { text: `الفرع: `, options: { bold: true, color: 'FFFFFF', fontSize: 11 } },
      { text: `${branchName}\n\n`, options: { bold: true, color: '38BDF8', fontSize: 11 } },
      { text: `الختم والتوقيع: ............................................`, options: { color: '64748B', fontSize: 11 } }
    ], {
      x: storeSignX + 0.25,
      y: signY + 0.2,
      w: signBoxW - 0.5,
      h: signBoxH - 0.4,
      align: 'right',
      valign: 'top',
      rtlMode: true
    });

    // صندوق الملاحظات والتوصيات الإدارية في الأسفل
    finalSlide.addShape(pres.ShapeType.roundRect, {
      x: 0.6,
      y: 4.25,
      w: 8.8,
      h: 0.85,
      rectRadius: 0.1,
      fill: { color: '111D4A' },
      line: { color: '38BDF8', width: 0.8 }
    });

    finalSlide.addText([
      { text: `📌 توجيهات عامة لفريق المعرض: `, options: { bold: true, color: '38BDF8', fontSize: 11 } },
      { text: `يُرجى الحفاظ على استمرارية ترتيب المقاسات، ضبط الإضاءة دورياً، والمحافظة على قصص الألوان المعتمدة (Color Stories) على كافة جدران العرض.`, options: { color: 'E2E8F0', fontSize: 10 } }
    ], {
      x: 0.8,
      y: 4.25,
      w: 8.4,
      h: 0.85,
      align: 'right',
      valign: 'middle',
      rtlMode: true
    });

    // =========================================================================
    // 4. حفظ وتنزيل الملف بصيغة .pptx
    // =========================================================================
    const cleanBranch = branchName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'فرع';
    const fileName = `تقرير_تدقيق_VM_${cleanBranch}_أسبوع_${weekNumber}.pptx`;

    await pres.writeFile({ fileName });

    showToast(`🎉 تم تحميل عرض PowerPoint بنجاح: ${fileName}`, 'success');
  } catch (err) {
    console.error('exportAuditToPptx error:', err);
    showToast(`فشل تصدير ملف PowerPoint: ${err.message}`, 'error');
  }
}

// تصدير الدالة إلى النطاق العام للمتصفح
if (typeof window !== 'undefined') {
  window.exportAuditToPptx = exportAuditToPptx;
  window.exportPptxReport = exportAuditToPptx;
}
