/**
 * SAMX-VM UI Renderers Layer
 * Version: 1.3.4
 * Architecture: Decoupled UI Rendering Routines
 */

import {
  currentAudit,
  metadataCache,
  modalState,
  STATUS_MAP,
  VM_CATEGORY_CHECKLISTS,
  getBranches,
  getSpecialists,
  getStoreSections,
  getSectionStandards,
  saveAuditToStorage
} from './store.js';

// توليد شارة الحالة الملونة
export function getStatusBadgeHtml(statusKey, isPrint = false) {
  const cfg = STATUS_MAP[statusKey] || STATUS_MAP.resolved;
  const css = isPrint ? cfg.printBadgeClass : cfg.badgeClass;
  return `<span class="${css} text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
    <span>${isPrint ? cfg.label : cfg.shortLabel}</span>
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

// مزامنة عروض تفاصيل المعرض في الهيدر والتقرير المطبوع
export function syncQuickDisplays() {
  const branchDisplay = currentAudit.branchName || 'لم يتم تحديد الفرع';
  const auditorDisplay = currentAudit.auditorName || 'لم يتم تحديد الأخصائي';

  const quickStore = document.getElementById('quick-store-name');
  if (quickStore) quickStore.innerText = branchDisplay;

  const quickWeek = document.getElementById('quick-audit-week');
  if (quickWeek) quickWeek.innerText = 'الأسبوع ' + (currentAudit.weekNumber || 43);
  
  const printStore = document.getElementById('print-header-store');
  if (printStore) printStore.innerText = branchDisplay;

  const printWeek = document.getElementById('print-header-week');
  if (printWeek) printWeek.innerText = 'الأسبوع ' + (currentAudit.weekNumber || 43);

  const printDate = document.getElementById('print-header-date');
  if (printDate) printDate.innerText = currentAudit.auditDate || '';

  const printAuditor = document.getElementById('print-header-auditor');
  if (printAuditor) printAuditor.innerText = auditorDisplay;

  const printSign = document.getElementById('print-sign-auditor');
  if (printSign) printSign.innerText = auditorDisplay;

  const printCount = document.getElementById('print-header-count');
  if (printCount) printCount.innerText = (currentAudit.sections ? currentAudit.sections.length : 0) + ' أقسام';

  const printTimestamp = document.getElementById('print-timestamp');
  if (printTimestamp) printTimestamp.innerText = `تاريخ الإنشاء: ${currentAudit.auditDate} | SAMX-VM Core v1.3.2`;

  updateKPIs();
}

// تعبئة وتحديث القوائم المنسدلة في الشاشة الرئيسية
export function populateBranchSelect() {
  const branchSelect = document.getElementById('select-branch');
  if (!branchSelect) return;

  const branches = getBranches();
  if (branches.length === 0) {
    branchSelect.innerHTML = '<option value="">-- أضف فرعاً من زر (⚙️ إدارة الفروع) --</option>';
    currentAudit.branchName = '';
    return;
  }

  const branchNames = branches.map(b => typeof b === 'string' ? b : (b.name || ''));

  if ((!currentAudit.branchName || !branchNames.includes(currentAudit.branchName)) && branchNames.length > 0) {
    currentAudit.branchName = branchNames[0];
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

  const specialists = getSpecialists();
  if (specialists.length === 0) {
    specialistSelect.innerHTML = '<option value="">-- أضف أخصائياً من زر (⚙️ إدارة الأخصائيين) --</option>';
    currentAudit.auditorName = '';
    return;
  }

  const specialistNames = specialists.map(s => typeof s === 'string' ? s : (s.name || ''));

  if ((!currentAudit.auditorName || !specialistNames.includes(currentAudit.auditorName)) && specialistNames.length > 0) {
    currentAudit.auditorName = specialistNames[0];
  }

  let html = '';
  specialists.forEach(s => {
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
          const id = typeof item === 'object' && item && item.id ? item.id : `br_${index}`;
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
              <button type="button" onclick="deleteEntity('branches', '${id}')" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition active:scale-90" title="حذف الفرع">
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
          const id = typeof item === 'object' && item && item.id ? item.id : `sp_${index}`;
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
              <button type="button" onclick="deleteEntity('specialists', '${id}')" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition active:scale-90" title="حذف الأخصائي">
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
      const id = typeof item === 'object' && item && item.id ? item.id : '';
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
          <button type="button" onclick="deleteInlineEntity('${modalState.currentDrawerTab}', ${index})" class="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="حذف">
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
      <span class="bg-corp-950 border border-corp-700/80 text-gold-400 text-[11px] px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
        <i data-lucide="tag" class="w-3 h-3 text-gold-500"></i>
        <span>${t}</span>
      </span>
    `).join('');

    const statusBadgeHtml = getStatusBadgeHtml(sec.status || 'resolved');
    const hasBoth = sec.beforeImg && sec.afterImg && !sec.beforeImg.includes('placehold.co') && !sec.afterImg.includes('placehold.co');
    const isSlider = hasBoth && modalState.cardViewModes[sec.id] === 'slider';

    card.innerHTML = `
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-corp-800">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="w-7 h-7 rounded-lg bg-corp-800 text-gold-400 font-black text-xs flex items-center justify-center border border-corp-700">#${idx + 1}</span>
          <h3 class="font-bold text-sm md:text-base text-white">${sec.title}</h3>
          ${statusBadgeHtml}
        </div>
        <div class="flex items-center gap-1.5">
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

      <!-- عرض الصور: إما مقارنة منزلقة أو جنباً إلى جنب -->
      ${isSlider ? `
        <div class="relative w-full aspect-video rounded-xl overflow-hidden select-none bg-corp-950 border border-corp-800 mb-3 shadow-inner" id="slider-box-${sec.id}">
          <img src="${sec.afterImg}" class="absolute inset-0 w-full h-full object-cover pointer-events-none">
          <span class="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded shadow z-10 pointer-events-none">بعد التعديل</span>

          <img id="slider-before-img-${sec.id}" src="${sec.beforeImg}" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" style="clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);">
          <span class="absolute top-2 right-2 bg-rose-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded shadow z-10 pointer-events-none">قبل التعديل</span>

          <div id="slider-handle-${sec.id}" class="absolute top-0 bottom-0 pointer-events-none z-20 flex items-center justify-center -translate-x-1/2" style="left: 50%;">
            <div class="w-0.5 h-full bg-gold-400 shadow-xl"></div>
            <div class="absolute w-8 h-8 bg-gold-500 text-slate-950 rounded-full shadow-2xl flex items-center justify-center border-2 border-slate-900 font-black text-xs">
              ↔
            </div>
          </div>

          <input type="range" min="0" max="100" value="50" oninput="updateSliderPosition('${sec.id}', this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" style="margin: 0; padding: 0;">
        </div>
      ` : `
        <div class="grid grid-cols-2 gap-3.5 mb-3.5">
          <!-- اليمين: قبل التعديل -->
          <div class="relative rounded-2xl overflow-hidden border border-rose-500/40 bg-corp-950 aspect-[16/10] sm:aspect-[4/3] group cursor-pointer shadow-md" onclick="openLightbox('${sec.beforeImg}', '${sec.title} - قبل التعديل')">
            <span class="absolute top-2.5 right-2.5 bg-rose-600/95 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-md z-10 border border-rose-400/40">🔴 قبل التعديل</span>
            <img src="${sec.beforeImg || 'https://placehold.co/600x400/0f172a/94a3b8?text=لا+توجد+صورة'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
              <i data-lucide="zoom-in" class="w-4 h-4"></i>
              <span>تكبير الصورة</span>
            </div>
          </div>

          <!-- اليسار: بعد التنفيذ والتعديل -->
          <div class="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-corp-950 aspect-[16/10] sm:aspect-[4/3] group cursor-pointer shadow-md" onclick="openLightbox('${sec.afterImg}', '${sec.title} - بعد التعديل')">
            <span class="absolute top-2.5 right-2.5 bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-md z-10 border border-emerald-400/40">🟢 بعد التنفيذ والتعديل</span>
            <img src="${sec.afterImg || 'https://placehold.co/600x400/0f172a/94a3b8?text=لا+توجد+صورة'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
              <i data-lucide="zoom-in" class="w-4 h-4"></i>
              <span>تكبير الصورة</span>
            </div>
          </div>
        </div>
      `}

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

      <!-- الوسوم المطبقة -->
      ${sec.tags && sec.tags.length > 0 ? `<div class="flex flex-wrap gap-1.5 mb-3">${tagsHtml}</div>` : ''}

      <!-- الملاحظات الفنية -->
      <div class="bg-corp-950/80 p-3 rounded-xl border border-corp-800 text-xs text-slate-300 leading-relaxed">
        <span class="text-gold-500 font-bold block mb-1">الملاحظات والمبررات الميدانية:</span>
        ${sec.notes || 'تم التنفيذ وفق المعايير المعتمدة دون ملاحظات إضافية.'}
      </div>
    `;

    container.appendChild(card);
  });

  syncQuickDisplays();
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

// عرض قائمة الأقسام في تقرير الطباعة الرسمي
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
    item.className = "print-card print-break-inside-avoid border border-slate-200 rounded-xl p-4 bg-white shadow-sm";
    
    const tagsBadge = (sec.tags || []).map(t => `
      <span class="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] px-2 py-0.5 rounded font-semibold inline-block">
        ${t}
      </span>
    `).join(' ');

    item.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
        <h4 class="font-black text-slate-900 text-sm md:text-base flex items-center gap-2 flex-wrap">
          <span class="w-5 h-5 rounded bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">${idx + 1}</span>
          <span>${sec.title}</span>
          ${getStatusBadgeHtml(sec.status || 'resolved', true)}
        </h4>
        <div class="flex flex-wrap gap-1">${tagsBadge}</div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- اليمين: قبل التعديل -->
        <div>
          <div class="text-xs font-black text-rose-800 mb-1.5 flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>الوضع السابق (Before Audit)</span>
          </div>
          <div class="aspect-[16/10] sm:aspect-[4/3] rounded-xl overflow-hidden border-2 border-rose-300/80 bg-slate-50 shadow-sm">
            <img src="${sec.beforeImg}" class="w-full h-full object-cover">
          </div>
        </div>

        <!-- اليسار: بعد التنفيذ والتعديل -->
        <div>
          <div class="text-xs font-black text-emerald-800 mb-1.5 flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>بعد التنفيذ والتعديل (After VM Action)</span>
          </div>
          <div class="aspect-[16/10] sm:aspect-[4/3] rounded-xl overflow-hidden border-2 border-emerald-300/80 bg-slate-50 shadow-sm">
            <img src="${sec.afterImg}" class="w-full h-full object-cover">
          </div>
        </div>
      </div>

      <!-- معايير الـ VM المطبقة في التقرير الرسمي -->
      ${sec.checklist && sec.checklist.length > 0 ? `
        <div class="mb-2 p-2 rounded-lg bg-amber-50/80 border border-amber-200">
          <span class="text-[10px] font-bold text-amber-900 block mb-1">معايير الـ VM المؤكدة ميدانياً (${sec.checklist.length}):</span>
          <div class="flex flex-wrap gap-1">
            ${sec.checklist.map(c => `
              <span class="bg-white text-slate-800 border border-amber-300 text-[9px] px-1.5 py-0.5 rounded font-medium">
                ✓ ${c}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- صندوق متابعة وتكليف الإجراء في تقرير الطباعة الرسمي -->
      ${(sec.status === 'store_followup' || sec.status === 'management_action') ? `
        <div class="mb-3 p-2.5 rounded-xl border-2 ${
          sec.status === 'store_followup' 
            ? 'bg-amber-50 border-amber-300 text-amber-950' 
            : 'bg-rose-50 border-rose-300 text-rose-950'
        } text-xs font-semibold shadow-sm">
          <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200">
            <span class="font-black flex items-center gap-1 text-[11px] ${sec.status === 'store_followup' ? 'text-amber-900' : 'text-rose-900'}">
              <span>${sec.status === 'store_followup' ? '⚠️ تكليف متابعة موجه لإدارة المعرض' : '🚨 طلب إجراء صيانة وتدخل إداري عاجل'}</span>
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded font-black bg-white border ${sec.status === 'store_followup' ? 'border-amber-400 text-amber-800' : 'border-rose-400 text-rose-800'}">إجراء رسمي</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div>👤 المسؤول عن التنفيذ: <strong class="underline font-black">${sec.actionAssignee || 'مدير المعرض'}</strong></div>
            <div>📅 تاريخ الإنجاز المستهدف: <strong class="underline font-black">${sec.actionDueDate || 'خلال أسبوع'}</strong></div>
          </div>
        </div>
      ` : ''}

      <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
        <span class="font-bold text-slate-900 block mb-0.5">تفاصيل ومبررات التعديل الميداني:</span>
        <p>${sec.notes || 'تم التنفيذ والتعديل وفق معايير التنسيق المعتمدة.'}</p>
      </div>
    `;

    container.appendChild(item);
  });
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
}
