/**
 * SAMX-VM Client-Side PDF Generation Engine
 * Generates high-fidelity downloadable A4 PDF reports reflecting custom brand identity and logo.
 * Strict Page-Break Guardrails: Discrete A4 page rendering to eliminate any image or text cropping across pages.
 * Responsive Layout & Absolute Centering: Dynamically scales sections and images to eliminate empty gaps,
 * maintaining perfect horizontal and vertical equilibrium around the central axis.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { currentAudit, getBrandingSettings, getSectionStatuses, getSectionSubOptions } from './store.js';
import { showToast, renderPrintSections, syncBrandingUI, getDynamicJustifications, sanitizeCorporateText, getEffectiveVisitSummary, formatSummaryPointHtml, cleanSummaryPointText, isNegativeOrUnappliedFinding } from './renderers.js';
import { ALSHIAK_LOGO_BASE64 } from './logo.js';
export { parseJustificationNotes } from './renderers.js';

/**
 * دالة مساعدة لتوليد HTML بطاقة القسم الميداني الموثق بتصميم مؤسسي متوازن وعالي الدقة
 * مع دعم شارات كبسولية موحدة، حساب ديناميكي للأبعاد لمنع الفراغات أو الاقتطاع، ومبررات مخصصة
 */
function renderPdfSectionCardHtml(sec, globalIndex, isSingleOnPage = true, hasSignatures = false, hasSummary = false) {
  const layout = sec.layoutType || 'comparison';
  const isDualStacked = (layout === 'dual_panorama' && sec.panoramaOrientation === 'stacked_vertical');
  const checklistCount = (sec.checklist && sec.checklist.length) || 0;
  const secStatuses = getSectionStatuses(sec);
  const hasAction = Boolean(secStatuses.includes('store_followup') || secStatuses.includes('management_action'));
  const justificationsList = getDynamicJustifications(sec);

  // حساب الأبعاد المحسوبة للعرض الأفقي A4 Landscape (ارتفاع الصفحة الكلي 794px)
  // الصور تشغل ~70% من المساحة المتاحة مع object-fit: cover وإطارات أنيقة
  let imgHeight;
  let stackedImgHeight;

  if (hasSignatures) {
    imgHeight = 330;
    stackedImgHeight = 160;
  } else {
    imgHeight = 460;
    stackedImgHeight = 230;
  }

  // توليد شارات الحالة الملونة الموحدة متعددة التحديد مع الخيارات الفرعية الذكية
  const statuses = getSectionStatuses(sec);
  const statusBadges = statuses.map(st => {
    const rawSubs = getSectionSubOptions(sec, st);
    const subOptions = (st === 'resolved')
      ? rawSubs.filter(s => s !== 'معالجة كاملة 100%' && s !== 'معالجة كاملة' && !s.includes('100%'))
      : rawSubs;
    const hasSub = subOptions.length > 0;

    if (st === 'resolved') {
      const text = hasSub ? `تم المعالجة ميدانياً: ${subOptions.join('، ')}` : 'تم المعالجة ميدانياً';
      return `
        <span style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2.5px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; line-height: 1.2; background: #f0fdf4; color: #15803d; border: 1.5px solid #86efac; white-space: nowrap; direction: rtl; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <span>${text}</span>
          <span style="font-size: 8.5px;">✅</span>
        </span>
      `;
    } else if (st === 'store_followup') {
      const text = hasSub ? `متابعة الفرع: ${subOptions.join('، ')}` : 'متابعة الفرع';
      return `
        <span style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2.5px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; line-height: 1.2; background: #fffbeb; color: #b45309; border: 1.5px solid #fde68a; white-space: nowrap; direction: rtl; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <span>${text}</span>
          <span style="font-size: 8.5px;">⏳</span>
        </span>
      `;
    } else if (st === 'management_action') {
      const text = hasSub ? `تتطلب صيانة/إدارة: ${subOptions.join('، ')}` : 'طلب صيانة / إدارة';
      return `
        <span style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2.5px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; line-height: 1.2; background: #fef2f2; color: #b91c1c; border: 1.5px solid #fca5a5; white-space: nowrap; direction: rtl; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <span>${text}</span>
          <span style="font-size: 8.5px;">⚠️</span>
        </span>
      `;
    }
    return '';
  }).filter(Boolean);

  const statusBadgeHtml = statusBadges.join(' ');

  // وسوم الأقسام ككبسولات موحدة متناسقة
  const tagsHtml = (sec.tags || []).map(t => `
    <span style="display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 700; line-height: 1.2; background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
      ${t}
    </span>
  `).join(' ');

  // استخراج أسلوب عرض وتنسيق كل صورة مع ضبط object-fit: cover لملء الإطار بأعلى دقة
  const getPdfImgStyle = (cfg) => {
    const config = cfg || { aspectRatio: 'standard', scale: 100, align: 'center' };
    const scale = (typeof config.scale === 'number' ? config.scale : 100) / 100;
    const align = config.align || 'center';
    const pos = (align === 'top') ? 'top center' : (align === 'bottom' ? 'bottom center' : 'center center');
    return `width: 100%; height: 100%; object-fit: cover; object-position: ${pos}; transform: scale(${scale}); transform-origin: ${pos}; display: block; border-radius: 12px;`;
  };

  const beforeStyle = getPdfImgStyle(sec.beforeConfig);
  const afterStyle = getPdfImgStyle(sec.afterConfig);
  const panoStyle = getPdfImgStyle(sec.afterConfig || sec.beforeConfig);

  // ساحة الصور العريضة مع شارات عائمة مثبتة في زوايا الصور وإطارات فاخرة
  let imagesHtml = '';

  if (layout === 'dual_panorama') {
    const customTitle = sec.panoramaTitle && sec.panoramaTitle.trim() ? sec.panoramaTitle.trim() : 'عرض بانورامي مزدوج (Dual Panorama View)';
    
    if (isDualStacked) {
      imagesHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; position: relative; margin: 4px 0; justify-content: center;">
          <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 5; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 3px 16px; border-radius: 9999px; background: rgba(15, 23, 42, 0.90); color: #fde68a; border: 1.5px solid rgba(245, 158, 11, 0.8); font-size: 9.5px; font-weight: 800; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: rtl; pointer-events: none; backdrop-filter: blur(6px);">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 9999px; background: #fbbf24;"></span>
            <span>${customTitle}</span>
          </div>
          <div style="width: 100%; height: ${stackedImgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
            <img src="${sec.beforeImg}" alt="Panorama View 1" style="${beforeStyle}" />
          </div>
          <div style="width: 100%; height: ${stackedImgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
            <img src="${sec.afterImg}" alt="Panorama View 2" style="${afterStyle}" />
          </div>
        </div>
      `;
    } else {
      imagesHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; position: relative; margin: 4px 0; align-items: center;">
          <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 5; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 3px 16px; border-radius: 9999px; background: rgba(15, 23, 42, 0.90); color: #fde68a; border: 1.5px solid rgba(245, 158, 11, 0.8); font-size: 9.5px; font-weight: 800; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: rtl; pointer-events: none; backdrop-filter: blur(6px);">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 9999px; background: #fbbf24;"></span>
            <span>${customTitle}</span>
          </div>
          <div style="width: 100%; height: ${imgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
            <img src="${sec.beforeImg}" alt="Panorama View 1" style="${beforeStyle}" />
          </div>
          <div style="width: 100%; height: ${imgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
            <img src="${sec.afterImg}" alt="Panorama View 2" style="${afterStyle}" />
          </div>
        </div>
      `;
    }
  } else if (layout === 'single_panorama') {
    const customTitle = sec.panoramaTitle && sec.panoramaTitle.trim() ? sec.panoramaTitle.trim() : 'بانوراما شاملة (Panorama View)';
    imagesHtml = `
      <div style="position: relative; width: 100%; margin: 4px 0; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 5; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 3px 16px; border-radius: 9999px; background: rgba(15, 23, 42, 0.90); color: #fde68a; border: 1.5px solid rgba(245, 158, 11, 0.8); font-size: 9.5px; font-weight: 800; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: rtl; pointer-events: none; backdrop-filter: blur(6px);">
          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 9999px; background: #fbbf24;"></span>
          <span>${customTitle}</span>
        </div>
        <div style="width: 100%; height: ${imgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
          <img src="${sec.afterImg || sec.beforeImg}" alt="${customTitle}" style="${panoStyle}" />
        </div>
      </div>
    `;
  } else if (layout === 'stacked_panorama') {
    const customTitle = sec.panoramaTitle && sec.panoramaTitle.trim() ? sec.panoramaTitle.trim() : null;
    const optionalTitleHtml = customTitle ? `
      <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 5; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 2.5px 14px; border-radius: 9999px; background: rgba(15, 23, 42, 0.90); color: #fde68a; border: 1.5px solid rgba(245, 158, 11, 0.8); font-size: 9px; font-weight: 800; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: rtl; pointer-events: none; backdrop-filter: blur(6px);">
        <span>${customTitle}</span>
      </div>
    ` : '';
    imagesHtml = `
      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; position: relative; margin: 4px 0; justify-content: center;">
        ${optionalTitleHtml}
        <!-- قبل -->
        <div style="width: 100%; height: ${stackedImgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
          <div style="position: absolute; top: 10px; right: 10px; z-index: 5; padding: 2.5px 12px; border-radius: 9999px; background: rgba(136, 19, 55, 0.90); color: #ffffff; border: 1px solid rgba(239, 68, 68, 0.8); font-size: 9px; font-weight: 800; line-height: 1.2; box-shadow: 0 1px 3px rgba(0,0,0,0.2); white-space: nowrap; direction: ltr; backdrop-filter: blur(6px);">
            Before
          </div>
          <img src="${sec.beforeImg}" alt="Before" style="${beforeStyle}" />
        </div>
        <!-- بعد -->
        <div style="width: 100%; height: ${stackedImgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
          <div style="position: absolute; top: 10px; left: 10px; z-index: 5; padding: 2.5px 12px; border-radius: 9999px; background: rgba(6, 78, 59, 0.90); color: #ffffff; border: 1px solid rgba(16, 185, 129, 0.8); font-size: 9px; font-weight: 800; line-height: 1.2; box-shadow: 0 1px 3px rgba(0,0,0,0.2); white-space: nowrap; direction: ltr; backdrop-filter: blur(6px);">
            After
          </div>
          <img src="${sec.afterImg}" alt="After" style="${afterStyle}" />
        </div>
      </div>
    `;
  } else {
    // مقارنة جانبية عريضة Side-by-Side مع شارات Before / After عائمة بالأعلى بدون صناديق رمادية
    imagesHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; position: relative; margin: 4px 0; align-items: center;">
        <!-- اليمين: قبل التعديل مع شارة عائمة -->
        <div style="width: 100%; height: ${imgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
          <div style="position: absolute; top: 10px; right: 10px; z-index: 5; padding: 3px 14px; border-radius: 9999px; background: rgba(136, 19, 55, 0.90); color: #ffffff; border: 1.5px solid rgba(244, 63, 94, 0.8); font-size: 9.5px; font-weight: 800; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; pointer-events: none; backdrop-filter: blur(6px);">
            Before
          </div>
          <img src="${sec.beforeImg}" alt="Before" style="${beforeStyle}" />
        </div>

        <!-- اليسار: بعد التنفيذ والتعديل مع شارة عائمة -->
        <div style="width: 100%; height: ${imgHeight}px; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(15, 23, 42, 0.08); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
          <div style="position: absolute; top: 10px; left: 10px; z-index: 5; padding: 3px 14px; border-radius: 9999px; background: rgba(6, 78, 59, 0.90); color: #ffffff; border: 1.5px solid rgba(16, 185, 129, 0.8); font-size: 9.5px; font-weight: 800; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap; direction: ltr; pointer-events: none; backdrop-filter: blur(6px);">
            After
          </div>
          <img src="${sec.afterImg}" alt="After" style="${afterStyle}" />
        </div>
      </div>
    `;
  }

  return `
    <div style="border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 14px; background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.03); direction: rtl; box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; break-inside: avoid;">
      <!-- 1. ترويسة القسم المكونة من سطرين متناسقين -->
      <div style="width: 100%; flex-shrink: 0;">
        <!-- السطر الأول: رقم القسم واسمه المستقل -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; width: 100%;">
          <span style="width: 24px; height: 24px; border-radius: 7px; background: #0f172a; color: #facc15; font-size: 11.5px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; text-align: center; line-height: 1; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.12); border: 1px solid #1e293b;">
            ${globalIndex}
          </span>
          <h4 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">
            ${sec.title}
          </h4>
        </div>
        <!-- السطر الثاني: شريط مقسم يضم شارات الحالة على اليمين والوسوم على اليسار -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; width: 100%; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 6px; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${statusBadgeHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
            ${tagsHtml}
          </div>
        </div>
      </div>

      <!-- 2. ساحة الصور العريضة (تشغل ~70% من الصفحة مع object-cover وشارات عائمة) -->
      <div style="flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; width: 100%;">
        ${imagesHtml}
      </div>

      <!-- 3. اللوحة السفلية المدمجة من عمودين (Right: 42% VM Standards + Action, Left: 58% Field Justifications) -->
      <div style="display: grid; grid-template-columns: 42% 58%; gap: 14px; border-top: 1.5px solid #e2e8f0; padding-top: 6px; box-sizing: border-box; width: 100%; margin-top: auto; flex-shrink: 0; line-height: 1.35; font-size: 11.5px;">
        <!-- العمود الأيمن (42%): معايير الـ VM المعتمدة المطبقة + تكليف المتابعة -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${sec.checklist && sec.checklist.length > 0 ? `
            <div>
              <div style="font-weight: 800; color: #334155; font-size: 10px; margin-bottom: 2.5px; display: flex; align-items: center; gap: 4px;">
                <span style="color: #ca8a04; font-weight: 900;">📋</span>
                <span>معايير وملاحظات الـ VM (${sec.checklist.length}):</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 3.5px;">
                ${sec.checklist.map(c => {
                  const isNeg = isNegativeOrUnappliedFinding(c, null);
                  if (isNeg) {
                    return `
                      <span style="display: inline-flex; align-items: center; gap: 4px; background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; padding: 1.5px 7px; border-radius: 5px; font-size: 9px; font-weight: 700;">
                        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: #e11d48; flex-shrink: 0;"></span>
                        <span>عدم التزام بـ: ${c}</span>
                      </span>
                    `;
                  }
                  return `
                    <span style="display: inline-flex; align-items: center; gap: 3px; background: #fefce8; color: #713f12; border: 1px solid #fde047; padding: 1.5px 7px; border-radius: 5px; font-size: 9px; font-weight: 700;">
                      <span style="color: #ca8a04; font-weight: 900;">✓</span>
                      <span>معيار مؤكد: ${c}</span>
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${(getSectionStatuses(sec).includes('store_followup') || getSectionStatuses(sec).includes('management_action')) ? `
            <div style="background: ${getSectionStatuses(sec).includes('management_action') ? '#fef2f2' : '#fffbeb'}; border: 1.5px solid ${getSectionStatuses(sec).includes('management_action') ? '#fca5a5' : '#fde68a'}; border-radius: 7px; padding: 4px 8px; font-size: 10px; color: ${getSectionStatuses(sec).includes('management_action') ? '#991b1b' : '#92400e'};">
              <div style="font-weight: 800; margin-bottom: 2px;">
                ${getSectionStatuses(sec).includes('management_action') && getSectionStatuses(sec).includes('store_followup')
                  ? '⚠️ تكليف متابعة موجه لإدارة المعرض وطلب صيانة/إدارة'
                  : (getSectionStatuses(sec).includes('management_action') ? '🚨 طلب إجراء صيانة وتدخل إداري عاجل' : '⚠️ تكليف متابعة موجه لإدارة المعرض')
                }
              </div>
              <div style="display: flex; justify-content: space-between; gap: 8px;">
                <span>المسؤول: <strong style="text-decoration: underline;">${sec.actionAssignee || 'مدير المعرض'}</strong></span>
                <span>تاريخ الإنجاز: <strong style="text-decoration: underline;">${sec.actionDueDate || 'خلال أسبوع'}</strong></span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- العمود الأيسر (58%): تفاصيل ومبررات التعديل الميداني -->
        <div>
          <div style="display: flex; align-items: center; gap: 5px; font-weight: 800; font-size: 10px; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 3px; background: #0f172a; color: #facc15; font-size: 8.5px; line-height: 1;">📋</span>
            <span>تفاصيل ومبررات التعديل الميداني:</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            ${justificationsList.map(item => `
              <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 10px; color: #1e293b; line-height: 1.35; text-align: right; direction: rtl;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border-radius: 9999px; background: #0f172a; color: #facc15; font-size: 7.5px; font-weight: 900; line-height: 1; flex-shrink: 0; margin-top: 1px;">
                  ✔
                </span>
                <span style="flex: 1; font-weight: 600;">${item}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * تصدير التقرير التنفيذي كملف PDF رقمي جاهز للتحميل
 * يخصص صفحة A4 مستقلة تماماً لكل قسم لضمان منع التداخل والتوسيط الرأسي والأفقي المثالي
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
    showToast('📄 جارٍ بناء صفحات الـ PDF (صفحة مخصصة لكل قسم بتوسيط كامل)...', 'info');

    // 1. استخراج وتطهير بيانات الهوية والمعرض لمنع أي نصوص طفيلية
    const branding = getBrandingSettings();
    const companyName = branding.companyName || 'SAMX-VM';
    const companySubtitle = branding.companySubtitle || 'العرض المرئي والتنسيق التجاري';
    const logoData = branding.logoData || null;
    const officialLogo = branding.logoData || ALSHIAK_LOGO_BASE64;
    const showFooterCompliance = branding.showFooterCompliance !== false;
    const footerDisclaimer = (branding.footerDisclaimer && branding.footerDisclaimer.trim()) || 'تقرير تدقيق معتمد صادر من منصة العرض المرئي الميداني SAMX-VM • سري وخاص بإدارة المعارض';

    const cleanBranch = sanitizeCorporateText(currentAudit.branchName, 'فرع المعرض العام');
    const cleanAuditor = sanitizeCorporateText(currentAudit.auditorName, 'أخصائي العرض المرئي');
    const cleanDate = currentAudit.auditDate || new Date().toISOString().split('T')[0];
    const totalSections = sections.length;

    // مزامنة أي تحرير يدوي نشط في حقل الإدخال المباشر لملخص الزيارة قبل تجميع الـ PDF
    const liveSummaryInput = document.getElementById('report-visit-summary-input');
    if (liveSummaryInput && liveSummaryInput.value && liveSummaryInput.value.trim()) {
      currentAudit.visitSummary = liveSummaryInput.value.trim();
      saveAuditToStorage();
    }

    const visitSummaryPoints = getEffectiveVisitSummary(currentAudit);
    const hasVisitSummary = Boolean(visitSummaryPoints && visitSummaryPoints.length > 0);

    // 2. تقسيم الأقسام: صفحة مخصصة ومستقلة لملخص الزيارة التنفيذي (إن وجد) وصفحة مستقلة لكل قسم موثق
    const totalPages = hasVisitSummary ? (totalSections + 1) : totalSections;

    // 3. إنشاء حاوية التقديم خارج الشاشة بنظام العرض الأفقي (1123px × 794px)
    renderRoot = document.createElement('div');
    renderRoot.id = 'single-pdf-render-root';
    renderRoot.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 1123px;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(renderRoot);

    // 4. بناء كل صفحة A4 كعنصر مستقل تماماً بمقاس أفقي كامل (1123px × 794px) مع توسيط محكم
    for (let p = 0; p < totalPages; p++) {
      const pageEl = document.createElement('div');
      pageEl.className = 'single-pdf-page';
      pageEl.style.cssText = `
        width: 1123px;
        height: 794px;
        box-sizing: border-box;
        padding: 16px 24px;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: stretch;
        position: relative;
        overflow: hidden;
        page-break-before: ${p === 0 ? 'auto' : 'always'};
        break-before: ${p === 0 ? 'auto' : 'page'};
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: ${p === totalPages - 1 ? 'auto' : 'always'};
        break-after: ${p === totalPages - 1 ? 'auto' : 'page'};
      `;

      const isExecutiveSummaryPage = Boolean(hasVisitSummary && p === 0);
      const secIndex = hasVisitSummary ? (p - 1) : p;
      const sec = isExecutiveSummaryPage ? null : sections[secIndex];
      const isFirstPage = (p === 0);
      const isLastPage = (p === totalPages - 1);

      // --- هيدر الصفحة الموحد والمطهر: الشعار بالوسط تماماً، بطاقة البيانات على اليسار، والهوية على اليمين ---
      let headerHtml = '';
      if (isFirstPage) {
        // الصفحة الأولى: الترويسة التنفيذية الرسمية
        headerHtml = `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 10px; margin-bottom: 9px; width: 100%;">
            <!-- 1. الطرف الأيمن: كتلة الهوية واسم المعرض والمسمى الإداري -->
            <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: right; min-width: 220px; flex-shrink: 0;" dir="rtl">
              <div style="display: inline-flex; align-items: center; gap: 5px; background: #0f172a; color: #facc15; font-size: 9.5px; font-weight: 900; padding: 2px 9px; border-radius: 9999px; border: 1.5px solid #1e293b; margin-bottom: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <span style="color: #facc15;">${companyName}</span>
                <span style="color: #64748b; font-weight: normal;">|</span>
                <span style="color: #cbd5e1; font-weight: 700;">تدقيق أسبوعي</span>
              </div>
              <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #020617; letter-spacing: -0.3px; line-height: 1.2;">
                ${cleanBranch}
              </h2>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: #334155; font-weight: 700; line-height: 1.3;">
                ${companySubtitle}
              </p>
              <p style="margin: 1.5px 0 0 0; font-size: 8px; color: #64748b; font-weight: 500; letter-spacing: 0.3px; line-height: 1.2; direction: ltr; text-align: right;">
                Visual Merchandising & Commercial Styling
              </p>
            </div>

            <!-- 2. الوسط المطلق: الشعار الرسمي للشركة (توسيط كامل ونقي) -->
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 12px; min-width: 0;">
              <img src="${officialLogo}" alt="${companyName}" style="max-height: 52px; max-width: 210px; width: auto; height: auto; object-fit: contain; display: block;" />
            </div>

            <!-- 3. الطرف الأيسر: بطاقة بيانات التقرير المجمعة بنقاء تام -->
            <div style="text-align: right; direction: rtl; font-size: 8.5px; line-height: 1.45; background: #f8fafc; padding: 6px 11px; border-radius: 9px; border: 1.5px solid #cbd5e1; min-width: 190px; flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">اسم المعرض:</span>
                <strong style="color: #020617; font-weight: 900; font-size: 9px;">${cleanBranch}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">أخصائي الـ VM:</span>
                <strong style="color: #020617; font-weight: 900; font-size: 9px;">${cleanAuditor}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">تاريخ التدقيق:</span>
                <strong style="color: #020617; font-weight: 900; font-size: 9px;">${cleanDate}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">إجمالي الأقسام:</span>
                <strong style="color: #9a3412; font-weight: 900; font-size: 9.5px; background: #ffedd5; padding: 1px 7px; border-radius: 4px; border: 1px solid #fdba74;">${totalSections} أقسام</strong>
              </div>
            </div>
          </div>
        `;
      } else {
        // الصفحات اللاحقة: تجانس تام (يمين هوية، وسط شعار، يسار بطاقة البيانات مع رقم القسم)
        headerHtml = `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 9px; width: 100%;">
            <!-- 1. الطرف الأيمن: الترويسة المكدسة الموحدة -->
            <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: right; min-width: 200px; flex-shrink: 0;" dir="rtl">
              <div style="display: inline-flex; align-items: center; gap: 4px; background: #0f172a; color: #facc15; font-size: 9px; font-weight: 900; padding: 1.5px 8px; border-radius: 9999px; border: 1.5px solid #1e293b; margin-bottom: 2px;">
                <span style="color: #facc15;">${companyName}</span>
                <span style="color: #64748b; font-weight: normal;">|</span>
                <span style="color: #cbd5e1; font-weight: 700;">تدقيق أسبوعي</span>
              </div>
              <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #020617; line-height: 1.2;">
                ${cleanBranch}
              </h2>
              <p style="margin: 1px 0 0 0; font-size: 9.5px; color: #334155; font-weight: 700;">
                ${companySubtitle}
              </p>
              <p style="margin: 0.5px 0 0 0; font-size: 7.5px; color: #64748b; font-weight: 500; letter-spacing: 0.25px; line-height: 1.1; direction: ltr; text-align: right;">
                Visual Merchandising & Commercial Styling
              </p>
            </div>

            <!-- 2. الوسط المطلق: الشعار الرسمي -->
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 10px; min-width: 0;">
              <img src="${officialLogo}" alt="${companyName}" style="max-height: 44px; max-width: 180px; width: auto; height: auto; object-fit: contain; display: block;" />
            </div>

            <!-- 3. الطرف الأيسر: بطاقة بيانات التقرير العلوية -->
            <div style="text-align: right; direction: rtl; font-size: 8.5px; line-height: 1.45; background: #f8fafc; padding: 5px 11px; border-radius: 9px; border: 1.5px solid #cbd5e1; min-width: 190px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">اسم المعرض:</span>
                <strong style="color: #020617; font-weight: 900; font-size: 9px;">${cleanBranch}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">أخصائي الـ VM:</span>
                <strong style="color: #020617; font-weight: 900; font-size: 9px;">${cleanAuditor}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">تاريخ التدقيق:</span>
                <strong style="color: #020617; font-weight: 900; font-size: 9px;">${cleanDate}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="color: #475569; font-weight: 700; white-space: nowrap;">القسم الموثق:</span>
                <strong style="color: #854d0e; font-weight: 900; font-size: 9px; background: #fef08a; padding: 1px 7px; border-radius: 4px; border: 1px solid #facc15;">القسم ${secIndex + 1} من ${totalSections}</strong>
              </div>
            </div>
          </div>
        `;
      }

      // --- محتوى الصفحة الرئيسي: إما بطاقة ملخص الزيارة التنفيذي المستقلة، أو بطاقة القسم الموثق ---
      let mainContentHtml = '';
      if (isExecutiveSummaryPage) {
        // صفحة ملخص إنجازات وتعديلات الزيارة الميدانية المستقلة (Dedicated Executive Summary Page)
        mainContentHtml = `
          <div style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 4px solid #0f172a; border-radius: 12px; padding: 16px 20px; margin: auto 0; height: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.03); page-break-inside: avoid; break-inside: avoid;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 7px; font-weight: 900; font-size: 13px; color: #0f172a;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #0f172a; color: #facc15; font-size: 11px; font-weight: 900;">⭐</span>
                <span>ملخص إنجازات وتعديلات الزيارة الميدانية (Field Visit Summary):</span>
              </div>
              <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; color: #15803d; font-weight: 800; background: #dcfce7; border: 1px solid #86efac; padding: 2.5px 9px; border-radius: 9999px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: #16a34a; flex-shrink: 0;"></span>
                <span>${visitSummaryPoints.length} إنجازات موثقة</span>
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${visitSummaryPoints.map((pt, ptIdx) => `
                <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 10px; color: #1e293b; line-height: 1.35; text-align: right; direction: rtl; padding: 2px 0; page-break-inside: avoid; break-inside: avoid;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 9999px; background: #0f172a; color: #facc15; font-size: 8.5px; font-weight: 900; line-height: 1; flex-shrink: 0; margin-top: 1px;">
                    ${ptIdx + 1}
                  </span>
                  <div style="flex: 1; text-align: right; direction: rtl;">${formatSummaryPointHtml(pt)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        // صفحة القسم الموثق المخصص والمحكوم بتوسيط تام وملء متناسق للمساحة
        mainContentHtml = `
          <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: stretch; margin: auto 0; page-break-inside: avoid; break-inside: avoid;">
            ${renderPdfSectionCardHtml(sec, secIndex + 1, true, isLastPage, false)}
          </div>
        `;
      }

      // --- التوقيعات والاعتماد الرسمي المحسن (في الصفحة الأخيرة فقط) ---
      let signaturesHtml = '';
      if (isLastPage) {
        signaturesHtml = `
          <div style="border: 1.5px solid #cbd5e1; border-radius: 12px; background: #ffffff; padding: 9px 13px; margin-top: 8px; width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.03); page-break-inside: avoid; break-inside: avoid;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 7px;">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 10.5px; color: #0f172a;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border-radius: 5px; background: #0f172a; color: #facc15; font-size: 9.5px;">✍️</span>
                <span>محضر الاعتماد الميداني والتسليم الرسمي (Official VM Sign-off)</span>
              </div>
              <span style="font-size: 8.5px; color: #64748b; font-weight: 600;">معتمد ومطابق للمعايير</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <!-- اعتماد أخصائي العرض المرئي -->
              <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 7px 10px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                    <strong style="color: #0f172a; font-size: 9.5px;">إعداد واعتماد أخصائي الـ VM:</strong>
                    <span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">أخصائي معتمد</span>
                  </div>
                  <div style="color: #475569; font-size: 8px; line-height: 1.35; margin-bottom: 5px;">
                    أقر بأن كافة التعديلات الميدانية الموثقة أعلاه نُفذت وطُبقت بدقة وفق معايير العلامة التجارية ودليل الـ VM.
                  </div>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #334155; margin-bottom: 4px;">
                    <span>الأخصائي: <strong style="color: #0f172a;">${cleanAuditor}</strong></span>
                    <span>التاريخ: <strong style="color: #0f172a;">${cleanDate}</strong></span>
                  </div>
                  <div style="height: 40px; border: 1.5px dashed #94a3b8; border-radius: 6px; background: #ffffff; display: flex; align-items: flex-end; justify-content: space-between; padding: 4px 8px; font-size: 8px; color: #94a3b8;">
                    <span>التوقيع الميداني / الرقمي</span>
                    <span>..................................</span>
                  </div>
                </div>
              </div>

              <!-- اعتماد وختم إدارة المعرض -->
              <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 7px 10px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                    <strong style="color: #0f172a; font-size: 9.5px;">ملاحظات واعتماد مدير المعرض:</strong>
                    <span style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">إدارة المعرض</span>
                  </div>
                  <div style="color: #475569; font-size: 8px; line-height: 1.35; margin-bottom: 5px;">
                    تم الاطلاع على التغييرات والموافقة على خطة التنسيق المنفذة واستلام مهام المتابعة الدورية.
                  </div>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #334155; margin-bottom: 4px;">
                    <span>المعرض: <strong style="color: #0f172a;">${cleanBranch}</strong></span>
                    <span>الصفة: <strong>مدير / مشرف المعرض</strong></span>
                  </div>
                  <div style="height: 40px; border: 1.5px dashed #94a3b8; border-radius: 6px; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 4px 8px; font-size: 8px; color: #94a3b8; text-align: center;">
                    <span>مكان الختم الرسمي لإدارة المعرض والتوقيع</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // --- تذييل الصفحة النظيف مع عبارة الاعتماد القانونية الاختيارية ---
      const complianceFooterHtml = (isLastPage && showFooterCompliance && footerDisclaimer) ? `
        <div style="text-align: center; font-size: 8.5px; color: #64748b; font-weight: 600; padding-top: 5px; border-top: 1px dashed #cbd5e1; margin-top: 5px;">
          ${footerDisclaimer}
        </div>
      ` : '';

      const footerHtml = `
        <div style="width: 100%; border-top: 1px solid #e2e8f0; padding-top: 7px; margin-top: 5px;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: #94a3b8; width: 100%;">
            <span>${companyName} • تقرير تدقيق العرض المرئي والتنسيق التجاري</span>
            <span>صفحة ${p + 1} من ${totalPages}</span>
          </div>
          ${complianceFooterHtml}
        </div>
      `;

      // تركيب الصفحة مع التوسيط الرأسي والأفقي التام للحاوية المركزية
      pageEl.innerHTML = `
        ${headerHtml}
        <div class="pdf-page-content-area" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; min-height: 0; margin: auto 0; gap: 7px;">
          ${mainContentHtml}
          ${signaturesHtml}
        </div>
        ${footerHtml}
      `;

      renderRoot.appendChild(pageEl);
    }

    // 5. التقاط كل صفحة مستقلاً عبر html2canvas وتضمينها كصفحة A4 أفقية (A4 Landscape) في jsPDF
    const renderedPages = renderRoot.querySelectorAll('.single-pdf-page');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfPageWidth = 297;
    const pdfPageHeight = 210;

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
    const fileBranch = (cleanBranch || 'Store').replace(/[\\/:*?"<>|]/g, '_').trim();
    const fileDate = (cleanDate || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    const fileName = `تقرير_تدقيق_${cleanCompany}_${fileBranch}_${fileDate}.pdf`;

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
    const companySubtitle = branding.companySubtitle || 'العرض المرئي والتنسيق التجاري';

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
      width: 1123px;
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
      width: 1123px;
      height: 794px;
      box-sizing: border-box;
      padding: 20px 30px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    `;

    coverPage.innerHTML = `
      <div>
        <!-- رأس الغلاف مع شعار وهوية الشركة موسطاً بشكل متوازن -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; width: 100%;">
          <!-- الطرف الأيمن: هوية النظام وتوصيف العرض المرئي -->
          <div style="display: flex; align-items: center; gap: 12px; min-width: 220px; flex-shrink: 0;">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: #0f172a; color: #facc15; border: 1.5px solid #eab308; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 17px; flex-shrink: 0;">
              <span>SX</span>
            </div>
            <div style="text-align: right;">
              <h1 style="margin: 0; font-size: 19px; font-weight: 900; color: #0f172a;">${companyName}</h1>
              <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #334155; font-weight: 700;">${companySubtitle}</p>
              <p style="margin: 1.5px 0 0 0; font-size: 8.5px; color: #64748b; font-weight: 500; letter-spacing: 0.3px; line-height: 1.2;">Visual Merchandising & Commercial Styling</p>
            </div>
          </div>

          <!-- الوسط: الشعار الرسمي لشركة الشياكة (توسيط كامل ومتوازن) -->
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 16px; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: center; height: 52px; max-width: 230px;">
              <img src="${branding.logoData || ALSHIAK_LOGO_BASE64}" alt="الشياكة alShiaka" style="max-height: 50px; max-width: 220px; width: auto; height: auto; object-fit: contain; display: block;" />
            </div>
          </div>

          <!-- الطرف الأيسر: تاريخ الدورة الشهرية -->
          <div style="text-align: right; font-size: 10.5px; background: #f8fafc; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #cbd5e1; min-width: 140px; flex-shrink: 0;">
            <div style="color: #64748b; font-weight: 600;">تاريخ التصدير:</div>
            <div style="font-weight: 900; color: #0f172a;">${new Date().toISOString().split('T')[0]}</div>
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

      // كل قسم في جولات التدقيق الشهرية يخصص له صفحة مستقلة تماماً (One Section Per Page)
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const sectionPage = document.createElement('div');
        sectionPage.className = 'bulk-pdf-page';
        sectionPage.style.cssText = `
          width: 1123px;
          height: 794px;
          box-sizing: border-box;
          padding: 16px 24px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: stretch;
          position: relative;
          overflow: hidden;
          page-break-before: always;
          break-before: page;
          page-break-inside: avoid;
          break-inside: avoid;
        `;

        const audBranch = sanitizeCorporateText(aud.branchName, 'معرض تجزئة معتمد');
        const audSpecialist = sanitizeCorporateText(aud.auditorName, 'أخصائي العرض المرئي');
        const audDate = aud.auditDate || '-';

        sectionPage.innerHTML = `
          <!-- هيدر الجولة الميدانية بالأعلى (نظيف وموحد عبر كافة الصفحات) -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 9px; margin-bottom: 10px; width: 100%;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background: #0f172a; color: #facc15; font-size: 10.5px; font-weight: 900; padding: 3px 8px; border-radius: 6px;">
                الجولة #${audIdx + 1}
              </span>
              <div>
                <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a;">
                  ${audBranch}
                </h2>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 1px; font-weight: 600;">
                  التاريخ: <strong>${audDate}</strong>  |  الأخصائي: <strong>${audSpecialist}</strong>
                </div>
              </div>
            </div>
            <div style="text-align: left; font-size: 9.5px; font-weight: 800; color: #854d0e; background: #fef08a; border: 1px solid #facc15; padding: 2.5px 9px; border-radius: 6px;">
              القسم ${sIdx + 1} من ${sections.length}
            </div>
          </div>

          <!-- بطاقة القسم الموثق المتمركزة رأسياً وأفقياً تماماً في منتصف الصفحة -->
          <div class="pdf-page-content-area" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; min-height: 0; margin: auto 0;">
            <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: stretch; margin: auto 0; page-break-inside: avoid; break-inside: avoid;">
              ${renderPdfSectionCardHtml(sec, sIdx + 1, true, false)}
            </div>
          </div>

          <!-- تذييل الصفحة النظيف -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8; width: 100%;">
            <span>${audBranch}</span>
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
      width: 1123px;
      height: 794px;
      box-sizing: border-box;
      padding: 20px 32px;
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
          <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 2px;">
                العرض المرئي والتنسيق التجاري
              </div>
              <div style="font-size: 10px; color: #64748b; margin-bottom: 12px;">
                Head of Visual Merchandising
              </div>
              <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
                الاسم: <strong>فريق إشراف الـ VM المركزي</strong>
              </div>
            </div>
            <!-- صندوق التوقيع والاعتماد الفسيح -->
            <div style="height: 52px; border: 1.5px dashed #94a3b8; border-radius: 8px; background: #f8fafc; display: flex; align-items: flex-end; justify-content: space-between; padding: 6px 10px; font-size: 9.5px; color: #64748b;">
              <span>الاعتماد والتوقيع الرسمي</span>
              <span>................................................</span>
            </div>
          </div>

          <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 2px;">
                إدارة العمليات وتشغيل المعارض
              </div>
              <div style="font-size: 10px; color: #64748b; margin-bottom: 12px;">
                Retail Operations Director
              </div>
              <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
                الاسم: <strong>إدارة تشغيل قطاع التجزئة</strong>
              </div>
            </div>
            <!-- صندوق الختم والاعتماد الفسيح -->
            <div style="height: 52px; border: 1.5px dashed #94a3b8; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 6px 10px; font-size: 9.5px; color: #64748b; text-align: center;">
              <span>مكان الختم الرسمي لإدارة العمليات والتشغيل</span>
            </div>
          </div>
        </div>
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
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfPageWidth = 297;
    const pdfPageHeight = 210;

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
