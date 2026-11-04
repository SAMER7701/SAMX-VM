/**
 * SAMX-VM PowerPoint Export Engine (.pptx)
 * Version: 1.4.0
 * Architecture: Client-Side Native Presentation Generator
 * Generates fully editable, executive 16:9 widescreen slides for store audit reports.
 */

import pptxgen from 'pptxgenjs';
import { currentAudit, getBrandingSettings } from './store.js';
import { showToast } from './renderers.js';

/**
 * دالة مساعدة لتحويل أي رابط صورة (URL) إلى Base64 عبر Canvas
 * لضمان التضمين المحلي السليم وتفادي قيود CORS وأخطاء pptxgenjs
 */
function fetchImageAsBase64(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve(null);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 2500);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * تجهيز كائن الصورة المتوافق تماماً مع معايير مكتبة pptxgenjs
 * يعالج مشكلة: ERROR: Image `data` value lacks a base64 header!
 */
async function preparePptxImage(src) {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed.includes('placehold.co')) {
    return null;
  }

  // 1. إذا كانت الصورة بصيغة Data URL أو تحتوي على base64
  if (trimmed.toLowerCase().includes('base64,')) {
    let clean = trimmed;
    // إذا كانت تبدأ بـ data:image/... نتأكد من صحتها
    if (!clean.includes('image/')) {
      const parts = clean.split('base64,');
      clean = `image/jpeg;base64,${parts[1] || ''}`;
    }
    return { data: clean };
  }

  // 2. إذا كانت نص Base64 خام بدون ترويسة
  if (trimmed.length > 100 && /^[A-Za-z0-9+/=_\-\r\n\s]+$/.test(trimmed)) {
    const raw = trimmed.replace(/[\r\n\s]/g, '');
    let mime = 'image/jpeg';
    if (raw.startsWith('iVBORw0KGgo')) mime = 'image/png';
    else if (raw.startsWith('R0lGOD')) mime = 'image/gif';
    else if (raw.startsWith('UklGR')) mime = 'image/webp';
    return { data: `image/${mime.split('/')[1]};base64,${raw}` };
  }

  // 3. إذا كانت رابط (HTTP/HTTPS/Blob/Relative)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    const base64Data = await fetchImageAsBase64(trimmed);
    if (base64Data && base64Data.toLowerCase().includes('base64,')) {
      return { data: base64Data };
    }
    // في حال كانت رابط خارجي ولم نتمكن من تحويلها لـ base64، نمررها كـ path وليس data
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { path: trimmed };
    }
  }

  return null;
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
    
    const branding = getBrandingSettings();
    const companyName = branding.companyName || 'SAMX-VM';
    const companySubtitle = branding.companySubtitle || 'العرض المرئي والتنسيق التجاري';
    const footerDisclaimer = branding.footerDisclaimer || 'منظومة SAMX-VM • تقرير تدقيق رسمي مطابق للمعايير المعتمدة';
    const logoObj = branding.logoData ? await preparePptxImage(branding.logoData) : null;

    pres.layout = 'LAYOUT_16x9';
    pres.title = `${companyName} Audit - ${currentAudit.branchName || 'Store Audit'}`;
    pres.subject = 'Visual Merchandising Field Audit Report';
    pres.author = currentAudit.auditorName || 'VM Specialist';
    pres.company = companyName;

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

    // شعار وعنوان المنظومة / شعار الشركة المخصص
    if (logoObj) {
      coverSlide.addImage({
        ...logoObj,
        x: 0.6,
        y: 0.45,
        w: 2.2,
        h: 0.65,
        sizing: { type: 'contain', w: 2.2, h: 0.65 }
      });
      coverSlide.addShape(pres.ShapeType.roundRect, {
        x: 3.0,
        y: 0.5,
        w: 6.4,
        h: 0.5,
        rectRadius: 0.1,
        fill: { color: '1C2541' },
        line: { color: 'EAB308', width: 1.2 }
      });
      coverSlide.addText(companyName, {
        x: 3.0,
        y: 0.5,
        w: 6.4,
        h: 0.5,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: 'FACC15',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });
    } else {
      coverSlide.addShape(pres.ShapeType.roundRect, {
        x: 0.6,
        y: 0.5,
        w: 3.4,
        h: 0.5,
        rectRadius: 0.1,
        fill: { color: '1C2541' },
        line: { color: 'EAB308', width: 1.2 }
      });
      coverSlide.addText(companyName, {
        x: 0.6,
        y: 0.5,
        w: 3.4,
        h: 0.5,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: 'FACC15',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });
    }

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
    coverSlide.addText(companySubtitle, {
      x: 0.6,
      y: 2.1,
      w: 8.8,
      h: 0.4,
      fontSize: 13,
      fontFace: 'Arial',
      color: '94A3B8',
      align: 'right',
    });

    // 4 بطاقات بيانات سريعة متناسقة (ONLY: Store, Specialist, Date, Total Sections)
    const cardData = [
      { label: 'المعرض / الفرع', value: branchName, icon: '🏬', col: 'F59E0B' },
      { label: 'أخصائي الـ VM', value: auditorName, icon: '👤', col: '38BDF8' },
      { label: 'تاريخ التدقيق', value: auditDate, icon: '📅', col: '10B981' },
      { label: 'إجمالي الأقسام', value: `${sections.length} أقسام`, icon: '📋', col: 'EAB308' }
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

    // =========================================================================
    // 2. الشرائح الميدانية: شريحة لكل قسم موثق مع صور (Before / After)
    // =========================================================================
    for (let idx = 0; idx < sections.length; idx++) {
      const sec = sections[idx];
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

      // 2) صور التوثيق وفق نمط التخطيط مع شارات أنيقة في أعلى وسط الصورة (Center-Top Pill Badges)
      const layoutType = sec.layoutType || 'comparison';
      const beforeImgObj = await preparePptxImage(sec.beforeImg);
      const afterImgObj = await preparePptxImage(sec.afterImg);

      if (layoutType === 'single_panorama') {
        // --- نمط البانوراما الكاملة (Single Panorama) ---
        const panoX = 0.4;
        const panoY = 1.25;
        const panoW = 9.2;
        const panoH = 2.85;

        // إطار الصورة
        slide.addShape(pres.ShapeType.rect, {
          x: panoX,
          y: panoY,
          w: panoW,
          h: panoH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        const activeImgObj = afterImgObj || beforeImgObj;
        if (activeImgObj) {
          try {
            slide.addImage({
              ...activeImgObj,
              x: panoX,
              y: panoY,
              w: panoW,
              h: panoH,
              sizing: { type: 'contain', w: panoW, h: panoH }
            });
          } catch (e) {
            console.warn('Could not add Panorama image:', e);
            slide.addText('تعذر إدراج صورة البانوراما', {
              x: panoX,
              y: panoY + 1.2,
              w: panoW,
              h: 0.5,
              fontSize: 11,
              color: '64748B',
              align: 'center',
              rtlMode: true
            });
          }
        } else {
          slide.addText('لا توجد صورة مسجلة للبانوراما', {
            x: panoX,
            y: panoY + 1.2,
            w: panoW,
            h: 0.5,
            fontSize: 11,
            color: '64748B',
            align: 'center',
            rtlMode: true
          });
        }

        // شارة وسط أعلى الصورة: ● Panorama View
        const pillW = 1.8;
        const pillH = 0.28;
        const pillX = panoX + (panoW - pillW) / 2;
        const pillY = panoY + 0.1;

        slide.addShape(pres.ShapeType.roundRect, {
          x: pillX,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.14,
          fill: { color: '0F172A' },
          line: { color: 'F59E0B', width: 1 }
        });

        slide.addText('Panorama View', {
          x: pillX,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 9,
          fontFace: 'Arial',
          bold: true,
          color: 'FDE68A',
          align: 'center',
          valign: 'middle'
        });

      } else if (layoutType === 'stacked_panorama') {
        // --- نمط البانوراما المكدسة رأسياً (Stacked Panorama) ---
        const stackW = 9.2;
        const stackH = 1.38;
        const stackX = 0.4;
        const beforeStackY = 1.25;
        const afterStackY = 2.72;

        // إطار صورة Before
        slide.addShape(pres.ShapeType.rect, {
          x: stackX,
          y: beforeStackY,
          w: stackW,
          h: stackH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (beforeImgObj) {
          try {
            slide.addImage({
              ...beforeImgObj,
              x: stackX,
              y: beforeStackY,
              w: stackW,
              h: stackH,
              sizing: { type: 'contain', w: stackW, h: stackH }
            });
          } catch (e) {
            console.warn('Could not add Before stacked image:', e);
          }
        }

        // شارة وسط أعلى صورة Before
        const pillW = 1.35;
        const pillH = 0.24;
        const pillX = stackX + (stackW - pillW) / 2;
        slide.addShape(pres.ShapeType.roundRect, {
          x: pillX,
          y: beforeStackY + 0.08,
          w: pillW,
          h: pillH,
          rectRadius: 0.12,
          fill: { color: '881337' },
          line: { color: 'EF4444', width: 1 }
        });
        slide.addText('Before', {
          x: pillX,
          y: beforeStackY + 0.08,
          w: pillW,
          h: pillH,
          fontSize: 8.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });

        // إطار صورة After
        slide.addShape(pres.ShapeType.rect, {
          x: stackX,
          y: afterStackY,
          w: stackW,
          h: stackH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (afterImgObj) {
          try {
            slide.addImage({
              ...afterImgObj,
              x: stackX,
              y: afterStackY,
              w: stackW,
              h: stackH,
              sizing: { type: 'contain', w: stackW, h: stackH }
            });
          } catch (e) {
            console.warn('Could not add After stacked image:', e);
          }
        }

        // شارة وسط أعلى صورة After
        slide.addShape(pres.ShapeType.roundRect, {
          x: pillX,
          y: afterStackY + 0.08,
          w: pillW,
          h: pillH,
          rectRadius: 0.12,
          fill: { color: '064E3B' },
          line: { color: '10B981', width: 1 }
        });
        slide.addText('After', {
          x: pillX,
          y: afterStackY + 0.08,
          w: pillW,
          h: pillH,
          fontSize: 8.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });

      } else {
        // --- النمط الافتراضي: مقارنة جانبية (Comparison Side-by-Side) ---
        const colWidth = 4.45;
        const colHeight = 2.85;
        const colY = 1.25;

        // عمود اليمين: الوضع السابق (Before)
        const beforeX = 5.15;
        slide.addShape(pres.ShapeType.rect, {
          x: beforeX,
          y: colY,
          w: colWidth,
          h: colHeight,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (beforeImgObj) {
          try {
            slide.addImage({
              ...beforeImgObj,
              x: beforeX,
              y: colY,
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

        // شارة وسط أعلى صورة Before
        const pillW = 1.4;
        const pillH = 0.26;
        const beforePillX = beforeX + (colWidth - pillW) / 2;
        const pillY = colY + 0.1;

        slide.addShape(pres.ShapeType.roundRect, {
          x: beforePillX,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.13,
          fill: { color: '881337' },
          line: { color: 'EF4444', width: 1 }
        });
        slide.addText('Before', {
          x: beforePillX,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 9,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });

        // عمود اليسار: بعد التنفيذ والتعديل (After)
        const afterX = 0.4;
        slide.addShape(pres.ShapeType.rect, {
          x: afterX,
          y: colY,
          w: colWidth,
          h: colHeight,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (afterImgObj) {
          try {
            slide.addImage({
              ...afterImgObj,
              x: afterX,
              y: colY,
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

        // شارة وسط أعلى صورة After
        const afterPillX = afterX + (colWidth - pillW) / 2;
        slide.addShape(pres.ShapeType.roundRect, {
          x: afterPillX,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.13,
          fill: { color: '064E3B' },
          line: { color: '10B981', width: 1 }
        });
        slide.addText('After', {
          x: afterPillX,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 9,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
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
      slide.addText(`${branchName}  |  صفحة ${idx + 2} من ${sections.length + 2}`, {
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
    }

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
    const fileName = `تقرير_تدقيق_VM_${cleanBranch}_أسبوع_${weekNumber}_16x9.pptx`;

    await pres.writeFile({ fileName });

    showToast(`🎉 تم تحميل عرض PowerPoint بنجاح: ${fileName}`, 'success');
  } catch (err) {
    console.error('exportAuditToPptx error:', err);
    showToast(`فشل تصدير ملف PowerPoint: ${err.message}`, 'error');
  }
}

/**
 * دالة توليد عرض PowerPoint بمقاس A4 طولي (A4 Portrait - 8.27 x 11.69 inches)
 * مطابق تماماً لتنسيق وأبعاد تقرير الـ PDF الميداني المعتمد
 */
export async function exportAuditToPptxA4() {
  const sections = currentAudit.sections || [];

  if (sections.length === 0) {
    showToast('⚠️ لا توجد أقسام موثقة في هذا التقرير لتصديرها إلى PowerPoint مقاس A4!', 'error');
    return;
  }

  showToast('⏳ جارٍ إعداد وتوليد عرض PowerPoint بمقاس A4 طولي (8.27 × 11.69 بوصة)...', 'info');

  try {
    const PptxConstructor = typeof pptxgen === 'function' ? pptxgen : (pptxgen.default || pptxgen);
    const pres = new PptxConstructor();

    const branding = getBrandingSettings();
    const companyName = branding.companyName || 'SAMX-VM';
    const companySubtitle = branding.companySubtitle || 'العرض المرئي والتنسيق التجاري';
    const footerDisclaimer = branding.footerDisclaimer || 'منظومة SAMX-VM • تقرير تدقيق رسمي مطابق لمقاس A4 المطبوع • قابل للتعديل بالكامل';
    const logoObj = branding.logoData ? await preparePptxImage(branding.logoData) : null;

    // ضبط مقاس الشرائح إلى A4 طولي تماماً
    pres.defineLayout({ name: 'A4_PORTRAIT', width: 8.27, height: 11.69 });
    pres.layout = 'A4_PORTRAIT';
    pres.title = `${companyName} A4 Audit - ${currentAudit.branchName || 'Store Audit'}`;
    pres.subject = 'Visual Merchandising Field Audit Report (A4 Portrait)';
    pres.author = currentAudit.auditorName || 'VM Specialist';
    pres.company = companyName;

    const branchName = currentAudit.branchName || 'معرض غير محدد';
    const auditorName = currentAudit.auditorName || 'أخصائي العرض المرئي';
    const auditDate = currentAudit.auditDate || new Date().toISOString().split('T')[0];
    const weekNumber = currentAudit.weekNumber || 43;

    // حساب الإحصاءات
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

    // -------------------------------------------------------------
    // الشريحة 1: الغلاف والملخص التنفيذي مقاس A4 طولي
    // -------------------------------------------------------------
    const coverSlide = pres.addSlide();
    coverSlide.background = { color: '0B132B' };

    // شريط علوي ذهبي
    coverSlide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 8.27,
      h: 0.16,
      fill: { color: 'EAB308' },
      line: { color: 'EAB308', width: 0 }
    });

    // شعار المنظومة / شعار الشركة المخصص
    if (logoObj) {
      coverSlide.addImage({
        ...logoObj,
        x: 0.5,
        y: 0.45,
        w: 2.2,
        h: 0.75,
        sizing: { type: 'contain', w: 2.2, h: 0.75 }
      });
      coverSlide.addShape(pres.ShapeType.roundRect, {
        x: 2.9,
        y: 0.55,
        w: 4.87,
        h: 0.5,
        rectRadius: 0.08,
        fill: { color: '1C2541' },
        line: { color: 'EAB308', width: 1.2 }
      });
      coverSlide.addText(companyName, {
        x: 2.9,
        y: 0.55,
        w: 4.87,
        h: 0.5,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: 'FACC15',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });
    } else {
      coverSlide.addShape(pres.ShapeType.roundRect, {
        x: 0.5,
        y: 0.5,
        w: 3.4,
        h: 0.45,
        rectRadius: 0.08,
        fill: { color: '1C2541' },
        line: { color: 'EAB308', width: 1.2 }
      });
      coverSlide.addText(companyName, {
        x: 0.5,
        y: 0.5,
        w: 3.4,
        h: 0.45,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: 'FACC15',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });
    }

    // اسم المعرض الرئيسي
    coverSlide.addText(branchName, {
      x: 0.5,
      y: 1.25,
      w: 7.27,
      h: 0.75,
      fontSize: 24,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      align: 'right',
      valign: 'middle',
      rtlMode: true
    });

    coverSlide.addText(companySubtitle, {
      x: 0.5,
      y: 2.05,
      w: 7.27,
      h: 0.35,
      fontSize: 11,
      fontFace: 'Arial',
      color: '94A3B8',
      align: 'right',
      rtlMode: true
    });

    // شبكة معلومات التقرير (2x2 Grid) - ONLY: Store Name, Specialist Name, Audit Date, Total Sections
    const cardData = [
      { label: 'اسم المعرض / الفرع', value: branchName, col: 'F59E0B' },
      { label: 'أخصائي الـ VM', value: auditorName, col: '38BDF8' },
      { label: 'تاريخ التدقيق', value: auditDate, col: '10B981' },
      { label: 'إجمالي الأقسام', value: `${sections.length} أقسام بالمعرض`, col: 'EAB308' }
    ];

    const cardW = 3.5;
    const cardH = 1.0;
    const pos = [
      { x: 0.5, y: 2.5 },
      { x: 4.27, y: 2.5 },
      { x: 0.5, y: 3.7 },
      { x: 4.27, y: 3.7 }
    ];

    cardData.forEach((c, i) => {
      const p = pos[i];
      coverSlide.addShape(pres.ShapeType.roundRect, {
        x: p.x,
        y: p.y,
        w: cardW,
        h: cardH,
        rectRadius: 0.1,
        fill: { color: '1C2541' },
        line: { color: '334155', width: 1 }
      });

      // شريط التمييز الجانبي
      coverSlide.addShape(pres.ShapeType.rect, {
        x: p.x + cardW - 0.08,
        y: p.y + 0.12,
        w: 0.08,
        h: cardH - 0.24,
        fill: { color: c.col },
        line: { color: c.col, width: 0 }
      });

      coverSlide.addText(c.label, {
        x: p.x + 0.1,
        y: p.y + 0.1,
        w: cardW - 0.25,
        h: 0.28,
        fontSize: 9.5,
        fontFace: 'Arial',
        color: '94A3B8',
        align: 'right',
        rtlMode: true
      });

      coverSlide.addText(c.value, {
        x: p.x + 0.1,
        y: p.y + 0.38,
        w: cardW - 0.25,
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

    // جدول ملخص أقسام المعرض وحالات المعالجة
    coverSlide.addShape(pres.ShapeType.roundRect, {
      x: 0.5,
      y: 4.95,
      w: 7.27,
      h: 5.6,
      rectRadius: 0.1,
      fill: { color: '0F172A' },
      line: { color: '334155', width: 1.2 }
    });

    const summaryParts = [
      { text: '📋 ملخص أقسام المعرض وحالات المعالجة المعتمدة:\n\n', options: { bold: true, color: 'FACC15', fontSize: 13 } }
    ];

    sections.forEach((s, idx) => {
      let sym = '✓ ';
      let col = '10B981';
      let statTxt = 'تم المعالجة والتنسيق';
      if (s.status === 'store_followup') {
        sym = '⚠️ ';
        col = 'F59E0B';
        statTxt = 'مهمة متابعة للفرع';
      } else if (s.status === 'management_action') {
        sym = '🚨 ';
        col = 'F87171';
        statTxt = 'طلب إجراء صيانة';
      }

      summaryParts.push({ text: `${idx + 1}. ${s.title}\n`, options: { bold: true, color: 'FFFFFF', fontSize: 11 } });
      summaryParts.push({ text: `    [${sym} ${statTxt}]`, options: { bold: true, color: col, fontSize: 9.5 } });
      if (s.tags && s.tags.length > 0) {
        summaryParts.push({ text: `  •  الوسوم: ${s.tags.join(' | ')}`, options: { color: '94A3B8', fontSize: 9 } });
      }
      summaryParts.push({ text: '\n\n', options: { fontSize: 6 } });
    });

    coverSlide.addText(summaryParts, {
      x: 0.7,
      y: 5.15,
      w: 6.87,
      h: 5.2,
      align: 'right',
      valign: 'top',
      rtlMode: true
    });

    // -------------------------------------------------------------
    // الشرائح 2..N: شرائح الأقسام بمقاس A4 طولي وتخطيط رأسي للصور
    // -------------------------------------------------------------
    for (let idx = 0; idx < sections.length; idx++) {
      const sec = sections[idx];
      const slide = pres.addSlide();
      slide.background = { color: 'F8FAFC' };

      const contentW = 7.27;

      // 1. هيدر القسم العلوي
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.5,
        y: 0.4,
        w: contentW,
        h: 0.95,
        rectRadius: 0.08,
        fill: { color: '0F172A' },
        line: { color: '1E293B', width: 1 }
      });

      // شعار الشركة في ركن الهيدر (إن توفر)
      if (logoObj) {
        slide.addImage({
          ...logoObj,
          x: 0.65,
          y: 0.48,
          w: 1.4,
          h: 0.75,
          sizing: { type: 'contain', w: 1.4, h: 0.75 }
        });
      }

      // رقم القسم
      slide.addShape(pres.ShapeType.roundRect, {
        x: 7.15,
        y: 0.55,
        w: 0.5,
        h: 0.65,
        rectRadius: 0.06,
        fill: { color: 'EAB308' },
        line: { color: 'EAB308', width: 0 }
      });

      slide.addText(`#${idx + 1}`, {
        x: 7.15,
        y: 0.55,
        w: 0.5,
        h: 0.65,
        fontSize: 14,
        fontFace: 'Arial',
        bold: true,
        color: '0F172A',
        align: 'center',
        valign: 'middle'
      });

      // عنوان القسم
      slide.addText(sec.title || `قسم ${idx + 1}`, {
        x: 2.2,
        y: 0.45,
        w: 4.8,
        h: 0.45,
        fontSize: 14,
        fontFace: 'Arial',
        bold: true,
        color: 'FFFFFF',
        align: 'right',
        valign: 'middle',
        rtlMode: true
      });

      // شارة الحالة
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
        x: 0.7,
        y: 0.55,
        w: 1.4,
        h: 0.35,
        rectRadius: 0.06,
        fill: { color: statusBg },
        line: { color: statusColor, width: 1 }
      });

      slide.addText(statusText, {
        x: 0.7,
        y: 0.55,
        w: 1.4,
        h: 0.35,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: statusColor,
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });

      // وسوم القسم
      const tagsStr = sec.tags && sec.tags.length > 0 ? sec.tags.join('  •  ') : '';
      if (tagsStr) {
        slide.addText(`الوسوم: ${tagsStr}`, {
          x: 2.2,
          y: 0.9,
          w: 4.8,
          h: 0.3,
          fontSize: 9,
          fontFace: 'Arial',
          color: 'E2E8F0',
          align: 'right',
          rtlMode: true
        });
      }

      // 2. صور التوثيق وفق نمط التخطيط مع شارات أنيقة في أعلى وسط الصورة (Center-Top Pill Badges) بمقاس A4
      const layoutType = sec.layoutType || 'comparison';
      const beforeImgObj = await preparePptxImage(sec.beforeImg);
      const afterImgObj = await preparePptxImage(sec.afterImg);

      if (layoutType === 'single_panorama') {
        // --- نمط البانوراما الكاملة للواجهات والمخازن ---
        const panoX = 0.5;
        const panoY = 1.4;
        const panoW = contentW; // 7.27
        const panoH = 6.35;

        slide.addShape(pres.ShapeType.rect, {
          x: panoX,
          y: panoY,
          w: panoW,
          h: panoH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        const activeImgObj = afterImgObj || beforeImgObj;
        if (activeImgObj) {
          try {
            slide.addImage({
              ...activeImgObj,
              x: panoX,
              y: panoY,
              w: panoW,
              h: panoH,
              sizing: { type: 'contain', w: panoW, h: panoH }
            });
          } catch (e) {
            console.warn('Could not add Panorama image to A4 slide:', e);
            slide.addText('تعذر إدراج صورة البانوراما', {
              x: panoX,
              y: panoY + 2.5,
              w: panoW,
              h: 0.5,
              fontSize: 12,
              color: '64748B',
              align: 'center',
              rtlMode: true
            });
          }
        } else {
          slide.addText('لا توجد صورة مسجلة للبانوراما', {
            x: panoX,
            y: panoY + 2.5,
            w: panoW,
            h: 0.5,
            fontSize: 12,
            color: '64748B',
            align: 'center',
            rtlMode: true
          });
        }

        // شارة وسط أعلى الصورة: ● Panorama View
        const pillW = 2.0;
        const pillH = 0.32;
        const pillX = panoX + (panoW - pillW) / 2;
        const pillY = panoY + 0.12;

        slide.addShape(pres.ShapeType.roundRect, {
          x: pillX,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.16,
          fill: { color: '0F172A' },
          line: { color: 'F59E0B', width: 1 }
        });

        slide.addText('Panorama View', {
          x: pillX,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 9.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FDE68A',
          align: 'center',
          valign: 'middle'
        });

      } else if (layoutType === 'stacked_panorama') {
        // --- نمط البانوراما المكدسة رأسياً (قبل فوق وبعد تحت) ---
        const stackW = contentW; // 7.27
        const stackH = 3.05;
        const stackX = 0.5;
        const beforeStackY = 1.4;
        const afterStackY = 4.65;

        // إطار صورة Before
        slide.addShape(pres.ShapeType.rect, {
          x: stackX,
          y: beforeStackY,
          w: stackW,
          h: stackH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (beforeImgObj) {
          try {
            slide.addImage({
              ...beforeImgObj,
              x: stackX,
              y: beforeStackY,
              w: stackW,
              h: stackH,
              sizing: { type: 'contain', w: stackW, h: stackH }
            });
          } catch (e) {
            console.warn('Could not add Before stacked image to A4 slide:', e);
          }
        }

        // شارة وسط أعلى صورة Before
        const pillW = 1.5;
        const pillH = 0.28;
        const pillX = stackX + (stackW - pillW) / 2;
        slide.addShape(pres.ShapeType.roundRect, {
          x: pillX,
          y: beforeStackY + 0.1,
          w: pillW,
          h: pillH,
          rectRadius: 0.14,
          fill: { color: '881337' },
          line: { color: 'EF4444', width: 1 }
        });
        slide.addText('Before', {
          x: pillX,
          y: beforeStackY + 0.1,
          w: pillW,
          h: pillH,
          fontSize: 9.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });

        // إطار صورة After
        slide.addShape(pres.ShapeType.rect, {
          x: stackX,
          y: afterStackY,
          w: stackW,
          h: stackH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (afterImgObj) {
          try {
            slide.addImage({
              ...afterImgObj,
              x: stackX,
              y: afterStackY,
              w: stackW,
              h: stackH,
              sizing: { type: 'contain', w: stackW, h: stackH }
            });
          } catch (e) {
            console.warn('Could not add After stacked image to A4 slide:', e);
          }
        }

        // شارة وسط أعلى صورة After
        slide.addShape(pres.ShapeType.roundRect, {
          x: pillX,
          y: afterStackY + 0.1,
          w: pillW,
          h: pillH,
          rectRadius: 0.14,
          fill: { color: '064E3B' },
          line: { color: '10B981', width: 1 }
        });
        slide.addText('After', {
          x: pillX,
          y: afterStackY + 0.1,
          w: pillW,
          h: pillH,
          fontSize: 9.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });

      } else {
        // --- النمط الافتراضي: مقارنة جانبية أنيقة (Side-by-Side Comparison) ---
        const colW = (contentW - 0.27) / 2; // 3.5
        const colH = 6.35;
        const colY = 1.4;

        // عمود اليمين: الوضع السابق (Before)
        const beforeX = 0.5 + colW + 0.27; // 4.27
        slide.addShape(pres.ShapeType.rect, {
          x: beforeX,
          y: colY,
          w: colW,
          h: colH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (beforeImgObj) {
          try {
            slide.addImage({
              ...beforeImgObj,
              x: beforeX,
              y: colY,
              w: colW,
              h: colH,
              sizing: { type: 'contain', w: colW, h: colH }
            });
          } catch (e) {
            console.warn('Could not add Before image to A4 slide:', e);
            slide.addText('تعذر إدراج صورة الوضع السابق', {
              x: beforeX,
              y: colY + 2.5,
              w: colW,
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
            y: colY + 2.5,
            w: colW,
            h: 0.5,
            fontSize: 11,
            color: '64748B',
            align: 'center',
            rtlMode: true
          });
        }

        // شارة وسط أعلى صورة Before
        const pillW = 1.4;
        const pillH = 0.28;
        const beforePillX = beforeX + (colW - pillW) / 2;
        const pillY = colY + 0.12;

        slide.addShape(pres.ShapeType.roundRect, {
          x: beforePillX,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.14,
          fill: { color: '881337' },
          line: { color: 'EF4444', width: 1 }
        });
        slide.addText('Before', {
          x: beforePillX,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 9.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });

        // عمود اليسار: بعد التنفيذ والتعديل (After)
        const afterX = 0.5;
        slide.addShape(pres.ShapeType.rect, {
          x: afterX,
          y: colY,
          w: colW,
          h: colH,
          fill: { color: 'E2E8F0' },
          line: { color: 'CBD5E1', width: 1 }
        });

        if (afterImgObj) {
          try {
            slide.addImage({
              ...afterImgObj,
              x: afterX,
              y: colY,
              w: colW,
              h: colH,
              sizing: { type: 'contain', w: colW, h: colH }
            });
          } catch (e) {
            console.warn('Could not add After image to A4 slide:', e);
            slide.addText('تعذر إدراج صورة بعد التعديل', {
              x: afterX,
              y: colY + 2.5,
              w: colW,
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
            y: colY + 2.5,
            w: colW,
            h: 0.5,
            fontSize: 11,
            color: '64748B',
            align: 'center',
            rtlMode: true
          });
        }

        // شارة وسط أعلى صورة After
        const afterPillX = afterX + (colW - pillW) / 2;
        slide.addShape(pres.ShapeType.roundRect, {
          x: afterPillX,
          y: pillY,
          w: pillW,
          h: pillH,
          rectRadius: 0.14,
          fill: { color: '064E3B' },
          line: { color: '10B981', width: 1 }
        });
        slide.addText('After', {
          x: afterPillX,
          y: pillY,
          w: pillW,
          h: pillH,
          fontSize: 9.5,
          fontFace: 'Arial',
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });
      }

      // 3. صندوق المعايير والملاحظات أسفل الصفحة
      const notesY = 8.0;
      const notesH = 2.95;

      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.5,
        y: notesY,
        w: contentW,
        h: notesH,
        rectRadius: 0.08,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 1.2 }
      });

      const cardTexts = [];
      if (sec.checklist && sec.checklist.length > 0) {
        cardTexts.push({
          text: `معايير الـ VM المعتمدة المطبقة للقسم (${sec.checklist.length}):\n`,
          options: { bold: true, color: 'B45309', fontSize: 10.5 }
        });
        cardTexts.push({
          text: `  ✓ ${sec.checklist.join('\n  ✓ ')}\n\n`,
          options: { color: '334155', fontSize: 9 }
        });
      }

      if (sec.status === 'store_followup' || sec.status === 'management_action') {
        const isF = sec.status === 'store_followup';
        cardTexts.push({
          text: `⚠️ ${isF ? 'تكليف متابعة موجه لإدارة المعرض:' : 'طلب إجراء صيانة وتدخل إداري:'}\n`,
          options: { bold: true, color: isF ? 'D97706' : 'DC2626', fontSize: 10 }
        });
        cardTexts.push({
          text: `  المسؤول عن التنفيذ: ${sec.actionAssignee || 'مدير المعرض'}  |  تاريخ الإنجاز: ${sec.actionDueDate || 'خلال أسبوع'}\n\n`,
          options: { bold: true, color: '0F172A', fontSize: 9 }
        });
      }

      cardTexts.push({
        text: `الملاحظات والمبررات الميدانية:\n`,
        options: { bold: true, color: '0F172A', fontSize: 10 }
      });
      cardTexts.push({
        text: `  ${sec.notes || 'تم التنفيذ والتعديل وفق أعلى المعايير المعتمدة.'}`,
        options: { color: '475569', fontSize: 9 }
      });

      slide.addText(cardTexts, {
        x: 0.65,
        y: notesY + 0.1,
        w: contentW - 0.3,
        h: notesH - 0.2,
        align: 'right',
        valign: 'top',
        rtlMode: true
      });

      slide.addText(`${branchName}  |  صفحة ${idx + 2} من ${sections.length + 2}`, {
        x: 0.5,
        y: 11.2,
        w: contentW,
        h: 0.3,
        fontSize: 8.5,
        fontFace: 'Arial',
        color: '94A3B8',
        align: 'center',
        rtlMode: true
      });
    }

    // -------------------------------------------------------------
    // الشريحة الختامية: التواقيع والاعتمادات الرسمية
    // -------------------------------------------------------------
    const finalSlide = pres.addSlide();
    finalSlide.background = { color: '0B132B' };

    finalSlide.addShape(pres.ShapeType.roundRect, {
      x: 0.6,
      y: 0.8,
      w: 7.07,
      h: 0.8,
      rectRadius: 0.08,
      fill: { color: '1C2541' },
      line: { color: 'EAB308', width: 1.5 }
    });

    if (logoObj) {
      finalSlide.addImage({
        ...logoObj,
        x: 0.75,
        y: 0.85,
        w: 1.5,
        h: 0.7,
        sizing: { type: 'contain', w: 1.5, h: 0.7 }
      });
      finalSlide.addText(`${companyName} | الاعتمادات والتوصيات الرسمية`, {
        x: 2.3,
        y: 0.8,
        w: 5.2,
        h: 0.8,
        fontSize: 14,
        fontFace: 'Arial',
        bold: true,
        color: 'FACC15',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });
    } else {
      finalSlide.addText(`${companyName} | الاعتمادات والتوصيات الميدانية الرسمية (Sign-off)`, {
        x: 0.6,
        y: 0.8,
        w: 7.07,
        h: 0.8,
        fontSize: 15,
        fontFace: 'Arial',
        bold: true,
        color: 'FACC15',
        align: 'center',
        valign: 'middle',
        rtlMode: true
      });
    }

    const signCards = [
      {
        title: 'اعتماد أخصائي العرض المرئي (VM Specialist)',
        desc: 'أقر بأن كافة الملاحظات والصور المرفقة تم توثيقها ميدانياً بدقة وفق معايير العلامة التجارية.',
        name: auditorName,
        sign: 'التوقيع: ....................................................'
      },
      {
        title: 'اعتماد وملاحظات إدارة المعرض (Store Manager)',
        desc: 'تم الاطلاع على نتائج التدقيق الميداني والالتزام بإنهاء مهام المتابعة المحددة ضمن التواريخ الموضحة.',
        name: branchName,
        sign: 'الختم والتوقيع: ............................................'
      }
    ];

    signCards.forEach((c, i) => {
      const sy = 2.0 + i * 3.2;
      finalSlide.addShape(pres.ShapeType.roundRect, {
        x: 0.6,
        y: sy,
        w: 7.07,
        h: 2.8,
        rectRadius: 0.1,
        fill: { color: '1C2541' },
        line: { color: '334155', width: 1 }
      });

      finalSlide.addText([
        { text: `${c.title}\n`, options: { bold: true, color: 'FACC15', fontSize: 12.5 } },
        { text: `\n${c.desc}\n\n`, options: { color: '94A3B8', fontSize: 10 } },
        { text: `الاسم / الفرع: `, options: { bold: true, color: 'FFFFFF', fontSize: 11 } },
        { text: `${c.name}\n\n`, options: { bold: true, color: '38BDF8', fontSize: 11 } },
        { text: c.sign, options: { color: '64748B', fontSize: 11 } }
      ], {
        x: 0.85,
        y: sy + 0.18,
        w: 6.57,
        h: 2.4,
        align: 'right',
        valign: 'top',
        rtlMode: true
      });
    });

    // حفظ وتنزيل
    const cleanCompany = (companyName || 'SAMX_VM').replace(/[\\/:*?"<>|]/g, '_').trim();
    const cleanBranch = branchName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'فرع';
    const fileName = `تقرير_تدقيق_${cleanCompany}_A4_${cleanBranch}_أسبوع_${weekNumber}.pptx`;

    await pres.writeFile({ fileName });

    showToast(`🎉 تم تحميل عرض PowerPoint مقاس A4 بنجاح: ${fileName}`, 'success');
  } catch (err) {
    console.error('exportAuditToPptxA4 error:', err);
    showToast(`فشل تصدير ملف PowerPoint مقاس A4: ${err.message}`, 'error');
  }
}

/**
 * تنزيل الملف الذي تم توليده مسبقاً بواسطة بايثون
 */
export function downloadPrebuiltA4Pptx() {
  const link = document.createElement('a');
  link.href = '/تقرير_تدقيق_VM_A4.pptx';
  link.download = 'تقرير_تدقيق_VM_A4.pptx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('📥 جارٍ تنزيل ملف PowerPoint مقاس A4 المولد بواسطة بايثون...', 'success');
}

// تصدير الدوال إلى النطاق العام للمتصفح
if (typeof window !== 'undefined') {
  window.exportAuditToPptx = exportAuditToPptx;
  window.exportPptxReport = exportAuditToPptx;
  window.exportAuditToPptxA4 = exportAuditToPptxA4;
  window.downloadPrebuiltA4Pptx = downloadPrebuiltA4Pptx;
}

