/**
 * SAMX-VM Main Controller & Boot Layer
 * Version: 1.4.0
 * Architecture: ES Modules Coordinator
 */

import {
  APP_VERSION,
  currentAudit,
  metadataCache,
  modalState,
  STATUS_MAP,
  loadMetadata,
  getBranches,
  getSpecialists,
  getStoreSections,
  addStoreSection,
  updateStoreSection,
  deleteStoreSection,
  getSectionStandards,
  addSectionStandard,
  updateSectionStandard,
  deleteSectionStandard,
  resetSectionStandards,
  getQuickTags,
  addQuickTag,
  updateQuickTag,
  deleteQuickTag,
  resetQuickTags,
  getQuickAssignees,
  addQuickAssignee,
  updateQuickAssignee,
  deleteQuickAssignee,
  resetQuickAssignees,
  addBranchItem,
  deleteBranchItem,
  addSpecialistItem,
  deleteSpecialistItem,
  saveAuditToStorage,
  loadAuditFromStorage,
  calculateCurrentWeek,
  getBrandingSettings,
  saveBrandingSettings,
  resetBrandingSettings,
  DEFAULT_BRANDING,
  getArchivedAudits,
  saveArchivedAudits,
  archiveCurrentAudit,
  addAuditsToArchive,
  deleteArchivedAudit,
  getArchivedAuditById,
  resetArchivedAuditsToDefault
} from './store.js';

import {
  showToast,
  showModalInlineFeedback,
  updateKPIs,
  syncQuickDisplays,
  syncBrandingUI,
  updateBrandingLivePreview,
  refreshMainSelects,
  refreshBranchesUI,
  refreshSpecialistsUI,
  renderModalList,
  renderInlineDrawerList,
  populateSectionTypeSelect,
  renderCategoryChecklist,
  renderSectionManager,
  renderAuditCards,
  renderPrintSections,
  renderQuickTagsList,
  renderQuickAssigneesList,
  renderBulkExportUI,
  updateBulkExportSelectionCounter,
  openArchivedAuditPreview,
  closeArchivedAuditPreview
} from './renderers.js';

import * as samxApi from './api.js';
import { exportAuditToPptx, exportAuditToPptxA4, downloadPrebuiltA4Pptx } from './pptxExport.js';
import { exportAuditToPdf, exportBulkMonthlyAuditPdf, exportBulkSelectedJson } from './pdfExport.js';

// توقيت فتح آخر نافذة لمنع ارتداد النقرات أو الإغلاق التلقائي العرضي
let lastModalOpenTime = 0;

// دوال مركزية موحدة ومحصنة لفتح وإغلاق النوافذ المنبثقة
export function showModal(modalId) {
  try {
    const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!modal) {
      console.warn('showModal: element missing:', modalId);
      return;
    }
    lastModalOpenTime = Date.now();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.position = 'fixed';
    modal.style.top = '0px';
    modal.style.left = '0px';
    modal.style.right = '0px';
    modal.style.bottom = '0px';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.zIndex = '99999';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.removeAttribute('aria-hidden');
  } catch (err) {
    console.error('showModal error:', err);
  }
}

export function hideModal(modalId) {
  try {
    const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    modal.style.setProperty('display', 'none', 'important');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modal.setAttribute('aria-hidden', 'true');
  } catch (err) {
    console.error('hideModal error:', err);
  }
}

// إضافة قسم وتوثيقه
export function addNewSection() {
  try {
    hideModal('management-modal');
    hideModal('annotator-modal');
    openEntryModal(false);
  } catch (e) {
    console.error('addNewSection error:', e);
  }
}

// ربط مستمعات النقر الصريحة للأزرار الرئيسية
export function wireButtonListeners() {
  const btnBranches = document.getElementById('btn-manage-branches');
  if (btnBranches) {
    btnBranches.onclick = function(e) {
      if (e) e.preventDefault();
      openManagementModal('branches');
    };
  }

  const btnSpecialists = document.getElementById('btn-manage-specialists');
  if (btnSpecialists) {
    btnSpecialists.onclick = function(e) {
      if (e) e.preventDefault();
      openManagementModal('specialists');
    };
  }

  const btnAddSection = document.getElementById('btn-add-section');
  if (btnAddSection) {
    btnAddSection.onclick = function(e) {
      if (e) e.preventDefault();
      addNewSection();
    };
  }

  const btnAddFirst = document.getElementById('btn-add-first-section');
  if (btnAddFirst) {
    btnAddFirst.onclick = function(e) {
      if (e) e.preventDefault();
      addNewSection();
    };
  }
}

// ==================== إدارة الشاشة الترحيبية السينمائية (Cinematic Splash Screen Controller) ====================
export function initSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  // التحقق من تشغيل الشاشة مسبقاً خلال الجلسة الحالية
  const hasSeenSplash = sessionStorage.getItem('samx_splash_shown');
  if (hasSeenSplash) {
    splash.classList.add('splash-hidden');
    splash.style.display = 'none';
    return;
  }

  // إخفاء تلقائي بعد 3.4 ثانية للتوافق مع مدة الأنيميشن السينمائي
  if (splash._dismissTimer) {
    clearTimeout(splash._dismissTimer);
  }

  splash._dismissTimer = setTimeout(() => {
    dismissSplashScreen();
  }, 3400);

  // إمكانية الإغلاق السريع عبر زر الهروب Escape
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      dismissSplashScreen();
      window.removeEventListener('keydown', handleKeydown);
    }
  };
  window.addEventListener('keydown', handleKeydown);
}

export function dismissSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  if (splash._dismissTimer) {
    clearTimeout(splash._dismissTimer);
    splash._dismissTimer = null;
  }

  try {
    sessionStorage.setItem('samx_splash_shown', 'true');
  } catch (e) {}

  splash.classList.add('splash-hidden');
  setTimeout(() => {
    splash.style.display = 'none';
  }, 600);
}

export function replaySplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  try {
    sessionStorage.removeItem('samx_splash_shown');
  } catch (e) {}

  splash.style.display = 'flex';
  splash.classList.remove('splash-hidden');
  initSplashScreen();
}

// تشغيل التطبيق بحصانة تامة ودعم لكافة حالات الجاهزية
export async function bootApp() {
  try { initSplashScreen(); } catch(e) {}

  // 1. المزامنة السحابية الفورية لجلب الفروع والأخصائيين من سحابة D1 أولاً قبل تهيئة الحقول
  try {
    await Promise.allSettled([
      samxApi.fetchBranchesCloud(),
      samxApi.fetchSpecialistsCloud(),
      samxApi.fetchSectionsCloud(),
    ]);
  } catch (syncErr) {
    console.warn('Boot Cloudflare D1 sync error:', syncErr);
  }

  try { await loadMetadata(); } catch(e) { console.warn('bootApp: loadMetadata error', e); }
  try { calculateCurrentWeek(); } catch(e) {}
  try { loadAuditFromStorage(); } catch(e) {}
  try { bindMetaInputs(); } catch(e) {}
  try { syncBrandingUI(); } catch(e) {}
  try { setupBrandingRealtimeListeners(); } catch(e) {}
  try { renderAuditCards(); } catch(e) {}
  try { setupNetworkStatusListener(); } catch(e) {}
  try { initSpeechRecognition(); } catch(e) {}
  try { wireButtonListeners(); } catch(e) {}
  try {
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch(e) {}

  try { populateSectionTypeSelect(); } catch(e) {}
  try { renderBulkExportUI(); } catch(e) {}

  // 2. تحديث واجهات الاختيار والقوائم بعد اكتمال المزامنة السحابية
  try {
    refreshBranchesUI();
    refreshSpecialistsUI();
    refreshMainSelects();
  } catch (e) {
    console.warn('Boot UI refresh error:', e);
  }
}

// ربط الحقول بالبيانات وتفعيل التحديث الحي
export function bindMetaInputs() {
  refreshMainSelects();

  const weekInput = document.getElementById('input-week');
  const dateInput = document.getElementById('input-date');

  if (weekInput) {
    weekInput.value = currentAudit.weekNumber || 43;
    weekInput.addEventListener('input', (e) => {
      currentAudit.weekNumber = e.target.value;
      syncQuickDisplays();
      saveAuditToStorage();
    });
  }

  if (dateInput) {
    dateInput.value = currentAudit.auditDate || new Date().toISOString().split('T')[0];
    dateInput.addEventListener('input', (e) => {
      currentAudit.auditDate = e.target.value;
      syncQuickDisplays();
      saveAuditToStorage();
    });
  }

  syncQuickDisplays();
}

export function handleBranchSelectChange(val) {
  currentAudit.branchName = val;
  syncQuickDisplays();
  saveAuditToStorage();
}

export function handleSpecialistSelectChange(val) {
  currentAudit.auditorName = val;
  syncQuickDisplays();
  saveAuditToStorage();
}

export function toggleMetaCollapse() {
  const grid = document.getElementById('meta-inputs-grid');
  const icon = document.getElementById('meta-collapse-icon');
  if (grid) grid.classList.toggle('hidden');
  if (icon) icon.classList.toggle('rotate-180');
}

// التحكم باللوحة المدمجة المنبثقة (INLINE DRAWER CONTROLLER)
export function toggleInlineManagement(tab = 'branches') {
  try {
    const drawer = document.getElementById('inline-management-drawer');
    if (!drawer) {
      openManagementModal(tab);
      return;
    }

    if (modalState.isInlineDrawerOpen && modalState.currentDrawerTab === tab) {
      closeInlineManagement();
    } else {
      openInlineManagement(tab);
    }
  } catch (err) {
    console.error('toggleInlineManagement error:', err);
  }
}

export function openInlineManagement(tab = 'branches') {
  try {
    modalState.currentDrawerTab = (tab === 'specialists') ? 'specialists' : 'branches';
    modalState.currentModalTab = modalState.currentDrawerTab;

    const drawer = document.getElementById('inline-management-drawer');
    if (!drawer) {
      openManagementModal(tab);
      return;
    }

    drawer.style.display = 'block';
    modalState.isInlineDrawerOpen = true;

    const tabBranches = document.getElementById('drawer-tab-branches');
    const tabSpecialists = document.getElementById('drawer-tab-specialists');
    const input = document.getElementById('drawer-input');
    const listLabel = document.getElementById('drawer-list-label');

    if (modalState.currentDrawerTab === 'branches') {
      if (tabBranches) tabBranches.className = "px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 bg-gold-500 text-slate-950 shadow";
      if (tabSpecialists) tabSpecialists.className = "px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 text-slate-400 hover:text-white bg-corp-900 border border-corp-800";
      if (input) input.placeholder = "اكتب اسم الفرع أو المعرض الجديد...";
      if (listLabel) listLabel.innerText = "قائمة الفروع المسجلة";
    } else {
      if (tabSpecialists) tabSpecialists.className = "px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 bg-gold-500 text-slate-950 shadow";
      if (tabBranches) tabBranches.className = "px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 text-slate-400 hover:text-white bg-corp-900 border border-corp-800";
      if (input) input.placeholder = "اكتب اسم الأخصائي الجديد...";
      if (listLabel) listLabel.innerText = "فريق أخصائيي العرض (VM)";
    }

    renderInlineDrawerList();
    setTimeout(() => {
      if (input && typeof input.focus === 'function') input.focus();
    }, 60);
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  } catch (err) {
    console.error('openInlineManagement error:', err);
  }
}

export function closeInlineManagement() {
  try {
    const drawer = document.getElementById('inline-management-drawer');
    if (drawer) {
      drawer.style.display = 'none';
      modalState.isInlineDrawerOpen = false;
      const input = document.getElementById('drawer-input');
      if (input) input.value = '';
      refreshMainSelects();
    }
  } catch (err) {
    console.error('closeInlineManagement error:', err);
  }
}

export async function addInlineEntity() {
  const input = document.getElementById('drawer-input');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast(modalState.currentDrawerTab === 'branches' ? 'يرجى كتابة اسم المعرض أو الفرع' : 'يرجى كتابة اسم أخصائي الـ VM', 'error');
    return;
  }
  try {
    const res = (modalState.currentDrawerTab === 'branches') 
      ? await samxApi.createBranchCloud(val)
      : await samxApi.createSpecialistCloud(val);

    if (res && res.success) {
      // إعادة جلب القائمة من السحابة للتأكيد 100%
      if (modalState.currentDrawerTab === 'branches') {
        await samxApi.fetchBranchesCloud();
      } else {
        await samxApi.fetchSpecialistsCloud();
      }

      if (input) input.value = '';
      refreshMainSelects();
      renderInlineDrawerList();
      renderModalList();
      showToast(modalState.currentDrawerTab === 'branches' ? `✨ تم حفظ الفرع "${val}" في سحابة D1 بنجاح` : `✨ تم حفظ "${val}" في سحابة D1 بنجاح`, 'success');
    } else {
      showToast('❌ فشلت الإضافة في السحابة: ' + (res?.message || 'خطأ غير معروف'), 'error');
    }
  } catch (err) {
    console.error('addInlineEntity error:', err);
    showToast('❌ فشل الحفظ في سحابة D1: ' + (err.message || 'خطأ في الاتصال'), 'error');
  }
}

export async function deleteInlineEntity(type, index) {
  await deleteEntity(type, index);
  renderInlineDrawerList();
}

// التحكم في مؤشر حالة المزامنة السحابية للنافذة
export function updateManagementCloudIndicator(text, state = 'info') {
  const statusElem = document.getElementById('management-cloud-status');
  const footerStatus = document.getElementById('mgmt-footer-status');
  if (statusElem) statusElem.innerText = text;
  if (footerStatus) {
    let icon = 'database';
    let color = 'text-gold-400';
    if (state === 'success') { icon = 'cloud'; color = 'text-emerald-400'; }
    else if (state === 'loading') { icon = 'loader-2'; color = 'text-amber-400 animate-spin'; }
    else if (state === 'offline') { icon = 'cloud-off'; color = 'text-slate-400'; }
    footerStatus.innerHTML = `
      <i data-lucide="${icon}" class="w-3.5 h-3.5 ${color}"></i>
      <span>${text}</span>
    `;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  }
}

// تبديل ألسنة التبويب في نافذة الإدارة بعزل تام لمنع التداخل (STRICT TAB SWITCHING)
export function switchManagementTab(tab = 'branches') {
  try {
    const targetTab = (tab === 'specialists') ? 'specialists' : 'branches';
    modalState.currentModalTab = targetTab;
    if (typeof window !== 'undefined') {
      window.currentModalTab = targetTab;
    }

    const btnBranches = document.getElementById('tab-btn-branches');
    const btnSpecialists = document.getElementById('tab-btn-specialists');
    const viewBranches = document.getElementById('view-mgmt-branches');
    const viewSpecialists = document.getElementById('view-mgmt-specialists');
    const headerTitle = document.getElementById('management-modal-title');
    const headerSubtitle = document.getElementById('management-modal-subtitle');
    const legacyListHeader = document.getElementById('management-list-header');

    if (targetTab === 'branches') {
      if (btnBranches) {
        btnBranches.className = "py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-gold-500 text-slate-950 shadow-md";
      }
      if (btnSpecialists) {
        btnSpecialists.className = "py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 bg-transparent";
      }
      if (viewBranches) viewBranches.classList.remove('hidden');
      if (viewSpecialists) viewSpecialists.classList.add('hidden');

      if (headerTitle) headerTitle.innerText = "إدارة قائمة الفروع والمعارض";
      if (headerSubtitle) headerSubtitle.innerText = "إضافة وتحديث فروع المعارض مع المزامنة المباشرة لقاعدة بيانات D1";
      if (legacyListHeader) legacyListHeader.innerText = "قائمة الفروع المسجلة";

      const branchInput = document.getElementById('input-branch-name') || document.getElementById('management-input');
      setTimeout(() => { 
        if (branchInput && typeof branchInput.focus === 'function') branchInput.focus(); 
      }, 70);
    } else {
      if (btnSpecialists) {
        btnSpecialists.className = "py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-gold-500 text-slate-950 shadow-md";
      }
      if (btnBranches) {
        btnBranches.className = "py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 bg-transparent";
      }
      if (viewSpecialists) viewSpecialists.classList.remove('hidden');
      if (viewBranches) viewBranches.classList.add('hidden');

      if (headerTitle) headerTitle.innerText = "إدارة قائمة أخصائيي العرض المرئي";
      if (headerSubtitle) headerSubtitle.innerText = "إدارة مسؤولي الـ VM وتعيينهم في تقارير الزيارات الميدانية";
      if (legacyListHeader) legacyListHeader.innerText = "فريق أخصائيي العرض (VM)";

      const specInput = document.getElementById('input-specialist-name') || document.getElementById('management-input');
      setTimeout(() => { 
        if (specInput && typeof specInput.focus === 'function') specInput.focus(); 
      }, 70);
    }

    renderModalList(targetTab);
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  } catch (err) {
    console.error('switchManagementTab error:', err);
  }
}

// نافذة إدارة القوائم (MANAGEMENT MODAL CONTROLLER)
export function openManagementModal(tab = 'branches') {
  try {
    lastModalOpenTime = Date.now();

    hideModal('section-modal');
    hideModal('annotator-modal');
    hideModal('validation-check-modal');
    hideModal('image-lightbox');

    showModal('management-modal');
    switchManagementTab(tab);

    // جلب البيانات ديناميكياً من سحابة Cloudflare D1 فور فتح النافذة
    updateManagementCloudIndicator('جاري المزامنة مع D1... 🔄', 'loading');
    Promise.allSettled([
      samxApi.fetchBranchesCloud(),
      samxApi.fetchSpecialistsCloud()
    ]).then(([bRes, sRes]) => {
      refreshBranchesUI();
      refreshSpecialistsUI();
      renderModalList(modalState.currentModalTab);
      updateManagementCloudIndicator('متصل بـ Cloudflare D1 ☁️', 'success');
    }).catch(err => {
      console.warn('D1 sync on modal open:', err);
      updateManagementCloudIndicator('تعذر الاتصال بـ D1 ⚠️', 'offline');
    });
  } catch (err) {
    console.error('Error opening management modal:', err);
  }
}

export function closeManagementModal(force = false) {
  try {
    if (!force && (Date.now() - lastModalOpenTime < 350)) {
      return;
    }
    hideModal('management-modal');
    const inputBranch = document.getElementById('input-branch-name');
    const inputSpec = document.getElementById('input-specialist-name');
    const legacyInput = document.getElementById('management-input');
    if (inputBranch) inputBranch.value = '';
    if (inputSpec) inputSpec.value = '';
    if (legacyInput) legacyInput.value = '';
    refreshMainSelects();
  } catch (err) {
    console.error('Error closing management modal:', err);
  }
}

// إضافة عنصر جديد عبر واجهة المستخدم مع استدعاء Cloudflare D1 وإدارة حالات التحميل والتنبيهات
export async function submitAddEntity(type = modalState.currentModalTab) {
  const targetType = (type === 'specialists') ? 'specialists' : 'branches';

  const inputElem = (targetType === 'branches') 
    ? (document.getElementById('input-branch-name') || document.getElementById('management-input'))
    : (document.getElementById('input-specialist-name') || document.getElementById('management-input'));

  const submitBtn = (targetType === 'branches')
    ? document.getElementById('btn-submit-branch')
    : document.getElementById('btn-submit-specialist');

  const btnTextElem = (targetType === 'branches')
    ? document.getElementById('btn-submit-branch-text')
    : document.getElementById('btn-submit-specialist-text');

  const val = inputElem ? inputElem.value.trim() : '';
  if (!val) {
    const errorMsg = targetType === 'branches' ? 'يرجى كتابة اسم الفرع أو المعرض' : 'يرجى كتابة اسم أخصائي الـ VM';
    showToast(errorMsg, 'error');
    showModalInlineFeedback(errorMsg, 'error');
    if (inputElem) inputElem.focus();
    return;
  }

  // التحقق من عدم التكرار المسبق
  const currentList = (targetType === 'branches') ? getBranches() : getSpecialists();
  if (currentList.some(item => (typeof item === 'string' ? item : item.name || '').trim().toLowerCase() === val.toLowerCase())) {
    const dupMsg = targetType === 'branches' ? 'اسم المعرض أو الفرع مسجل مسبقاً في القائمة' : 'اسم الأخصائي مسجل مسبقاً في القائمة';
    showToast(dupMsg, 'error');
    showModalInlineFeedback(dupMsg, 'error');
    return;
  }

  // 1. تفعيل حالة التحميل (Loading State)
  if (submitBtn) submitBtn.disabled = true;
  if (inputElem) inputElem.disabled = true;
  if (btnTextElem) btnTextElem.innerText = 'جاري الحفظ... ⏳';
  showModalInlineFeedback('جاري الحفظ والمزامنة مع Cloudflare D1... ⏳', 'loading');

  try {
    // 2. الحفظ السحابي المباشر في Cloudflare D1 عبر src/api.js (دون أي اعتماد على localStorage)
    const cloudRes = (targetType === 'branches') 
      ? await samxApi.createBranchCloud(val)
      : await samxApi.createSpecialistCloud(val);

    if (!cloudRes || !cloudRes.success) {
      throw new Error(cloudRes?.message || 'فشل الحفظ في قاعدة بيانات D1 السحابية');
    }

    // 3. إعادة الجلب الفوري لتأكيد المزامنة مع سحابة D1
    if (targetType === 'branches') {
      await samxApi.fetchBranchesCloud();
    } else {
      await samxApi.fetchSpecialistsCloud();
    }

    // 4. مسح حقل الإدخال بعد تأكيد النجاح فقط
    if (inputElem) {
      inputElem.value = '';
    }

    if (targetType === 'branches') {
      if (!currentAudit.branchName) {
        currentAudit.branchName = val;
      }
    } else {
      if (!currentAudit.auditorName) {
        currentAudit.auditorName = val;
      }
    }

    // 5. تحديث واجهة المستخدم والقوائم المنسدلة فوراً
    refreshBranchesUI();
    refreshSpecialistsUI();
    refreshMainSelects();
    renderModalList(targetType);
    renderInlineDrawerList();

    // 6. إشعار النجاح الصريح
    const successMsg = `✨ تم حفظ "${val}" في سحابة Cloudflare D1 بنجاح (مزامنة فورية) ✅`;
    showToast(successMsg, 'success');
    showModalInlineFeedback(successMsg, 'success');

  } catch (err) {
    console.error('submitAddEntity error:', err);
    const errMsg = err.message || 'فشل الاتصال بقاعدة بيانات D1';
    showToast('❌ خطأ أثناء حفظ العنصر: ' + errMsg, 'error');
    showModalInlineFeedback('❌ فشل الحفظ في D1: ' + errMsg, 'error');
  } finally {
    // إنهاء حالة التحميل
    if (submitBtn) submitBtn.disabled = false;
    if (inputElem) {
      inputElem.disabled = false;
      inputElem.focus();
    }
    if (btnTextElem) btnTextElem.innerText = 'إضافة +';
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  }
}

// دالة التوافق الشامل لـ addEntity
export async function addEntity(type = modalState.currentModalTab) {
  return await submitAddEntity(type);
}

// حذف عنصر من القائمة وسحابة D1 مع التأكيد والتنبيه
export async function deleteEntity(type = modalState.currentModalTab, target) {
  const targetType = (type === 'specialists') ? 'specialists' : 'branches';
  const items = (targetType === 'branches') ? getBranches() : getSpecialists();

  let targetItem = null;
  if (typeof target === 'number' && target >= 0 && target < items.length) {
    targetItem = items[target];
  }

  if (!targetItem) {
    const strTarget = String(target).trim().toLowerCase();
    targetItem = items.find((item, idx) => {
      if (typeof item === 'string') {
        return item.trim().toLowerCase() === strTarget || String(idx) === strTarget;
      }
      if (typeof item === 'object' && item) {
        return String(item.id || '').trim().toLowerCase() === strTarget ||
               String(item.name || '').trim().toLowerCase() === strTarget ||
               String(idx) === strTarget;
      }
      return false;
    });
  }

  if (!targetItem) {
    console.warn('deleteEntity: target not found:', target);
    showToast('لم يتم العثور على العنصر المراد حذفه', 'error');
    return;
  }

  const targetName = typeof targetItem === 'string' ? targetItem : (targetItem.name || '');
  const targetId = (typeof targetItem === 'object' && targetItem && (targetItem.id || targetItem.id === 0))
    ? targetItem.id
    : targetName;

  if (!confirm(`هل أنت متأكد من حذف "${targetName}" من القائمة وقاعدة بيانات D1 نهائياً؟`)) return;

  showModalInlineFeedback(`جاري حذف "${targetName}" من السحابة... ⏳`, 'loading');

  try {
    // 1. الحذف المباشر من قاعدة بيانات Cloudflare D1
    if (targetType === 'branches') {
      await samxApi.deleteBranchCloud(targetId);
      // إذا كان الفرع المحذوف هو المحدد حالياً في التقرير، نحدث الاختيار لفرع آخر أو فارغ
      if (currentAudit.branchName && String(currentAudit.branchName).trim().toLowerCase() === String(targetName).trim().toLowerCase()) {
        const remaining = getBranches();
        currentAudit.branchName = remaining.length > 0 ? (remaining[0].name || remaining[0]) : '';
        saveAuditToStorage();
      }
    } else {
      await samxApi.deleteSpecialistCloud(targetId);
      if (currentAudit.auditorName && String(currentAudit.auditorName).trim().toLowerCase() === String(targetName).trim().toLowerCase()) {
        const remaining = getSpecialists();
        currentAudit.auditorName = remaining.length > 0 ? (remaining[0].name || remaining[0]) : '';
        saveAuditToStorage();
      }
    }

    // 2. تحديث الواجهة والقوائم المنسدلة فوراً بدون الحاجة لتحديث الصفحة
    refreshBranchesUI();
    refreshSpecialistsUI();
    refreshMainSelects();
    renderModalList(targetType);
    renderInlineDrawerList();

    const infoMsg = `🗑️ تم حذف "${targetName}" بنجاح من قاعدة بيانات D1 السحابية والقوائم`;
    showToast(infoMsg, 'info');
    showModalInlineFeedback(infoMsg, 'info');
  } catch (err) {
    console.error('deleteEntity error:', err);
    const errMsg = err.message || 'فشل الحذف من الخادم السحابي';
    showToast('❌ خطأ أثناء الحذف: ' + errMsg, 'error');
    showModalInlineFeedback('❌ فشل الحذف: ' + errMsg, 'error');
  }
}

// تفويض الأحداث في طور الالتقاط (Capture Phase) لصمود الأزرار
const handleGlobalManagementClicks = (e) => {
  const target = e.target;
  if (!target) return;

  const tabBranchBtn = (typeof target.closest === 'function') && target.closest('#tab-btn-branches');
  if (tabBranchBtn) {
    e.preventDefault();
    e.stopPropagation();
    switchManagementTab('branches');
    return;
  }

  const tabSpecBtn = (typeof target.closest === 'function') && target.closest('#tab-btn-specialists');
  if (tabSpecBtn) {
    e.preventDefault();
    e.stopPropagation();
    switchManagementTab('specialists');
    return;
  }

  const branchBtn = (typeof target.closest === 'function') && target.closest('#btn-manage-branches, [data-manage="branches"]');
  if (branchBtn) {
    e.preventDefault();
    e.stopPropagation();
    openManagementModal('branches');
    return;
  }

  const specBtn = (typeof target.closest === 'function') && target.closest('#btn-manage-specialists, [data-manage="specialists"]');
  if (specBtn) {
    e.preventDefault();
    e.stopPropagation();
    openManagementModal('specialists');
    return;
  }

  const addSectionBtn = (typeof target.closest === 'function') && target.closest('#btn-add-section, #btn-add-first-section, [data-action="add-section"]');
  if (addSectionBtn) {
    e.preventDefault();
    e.stopPropagation();
    addNewSection();
    return;
  }
};

document.addEventListener('click', handleGlobalManagementClicks, true);
window.addEventListener('click', handleGlobalManagementClicks, true);

// ==================== تفاعل استمارة القسم وإجراءاته ====================
export function openEntryModal(isEdit = false) {
  hideModal('management-modal');
  hideModal('annotator-modal');
  hideModal('validation-check-modal');
  hideModal('section-manager-modal');

  populateSectionTypeSelect();

  if (!isEdit) {
    modalState.editingSectionId = null;
    resetModalFields();
    const heading = document.getElementById('modal-heading');
    if (heading) heading.innerText = 'توثيق قسم بالمعرض (قبل / بعد)';
  } else {
    renderQuickTagsList();
    renderQuickAssigneesList();
  }
  showModal('section-modal');
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export function closeEntryModal() {
  hideModal('section-modal');
  resetModalFields();
}

export function setModalLayoutType(layoutType = 'comparison') {
  const hiddenInput = document.getElementById('modal-layout-type');
  if (hiddenInput) hiddenInput.value = layoutType;

  const btnComparison = document.getElementById('layout-btn-comparison');
  const btnSingle = document.getElementById('layout-btn-single_panorama');
  const btnStacked = document.getElementById('layout-btn-stacked_panorama');

  const activeCls = "px-2.5 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition bg-gold-500 text-slate-950 border-gold-400 shadow";
  const inactiveCls = "px-2.5 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition bg-corp-950 text-slate-300 border-corp-700 hover:text-white";

  if (btnComparison) btnComparison.className = (layoutType === 'comparison') ? activeCls : inactiveCls;
  if (btnSingle) btnSingle.className = (layoutType === 'single_panorama') ? activeCls : inactiveCls;
  if (btnStacked) btnStacked.className = (layoutType === 'stacked_panorama') ? activeCls : inactiveCls;

  const colBefore = document.getElementById('col-wrapper-before');
  const boxBefore = document.getElementById('box-wrapper-before');
  const boxAfter = document.getElementById('box-wrapper-after');
  const badgeTextAfter = document.getElementById('badge-text-after');
  const badgeLabelAfter = document.getElementById('badge-label-after');
  const placeholderTitleAfter = document.getElementById('placeholder-title-after');
  const placeholderSubAfter = document.getElementById('placeholder-sub-after');
  const placeholderTitleBefore = document.querySelector('#placeholder-before .text-rose-300');
  const placeholderSubBefore = document.querySelector('#placeholder-before .text-slate-400');
  const imagesContainer = document.getElementById('modal-images-container');

  if (layoutType === 'single_panorama') {
    if (colBefore) colBefore.classList.add('hidden');
    else if (boxBefore) boxBefore.classList.add('hidden');
    if (boxAfter) {
      boxAfter.classList.remove('hidden');
    }
    if (imagesContainer) {
      imagesContainer.classList.remove('grid-cols-2');
      imagesContainer.classList.add('grid-cols-1');
    }
    if (badgeTextAfter) badgeTextAfter.innerText = 'Panorama View';
    if (badgeLabelAfter) {
      badgeLabelAfter.className = 'inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#0f172a] text-amber-300 border border-amber-500 shadow-sm text-[10px] font-bold tracking-wide select-none';
    }
    if (placeholderTitleAfter) placeholderTitleAfter.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubAfter) placeholderSubAfter.innerText = 'صورة الواجهة العريضة أو المخزن (Wide Panorama)';
  } else if (layoutType === 'stacked_panorama') {
    if (colBefore) colBefore.classList.remove('hidden');
    if (boxBefore) boxBefore.classList.remove('hidden');
    if (boxAfter) boxAfter.classList.remove('hidden');
    if (imagesContainer) {
      imagesContainer.classList.remove('grid-cols-2');
      imagesContainer.classList.add('grid-cols-1');
    }
    if (badgeTextAfter) badgeTextAfter.innerText = 'After';
    if (badgeLabelAfter) {
      badgeLabelAfter.className = 'inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#064e3b] text-white border border-[#10b981] shadow text-[10px] font-bold tracking-wide select-none';
    }
    if (placeholderTitleBefore) placeholderTitleBefore.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubBefore) placeholderSubBefore.innerText = 'بانوراما علوية (قبل التعديل)';
    if (placeholderTitleAfter) placeholderTitleAfter.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubAfter) placeholderSubAfter.innerText = 'بانوراما سفلية (بعد التعديل)';
  } else {
    // Comparison (مقارنة جانبية جنباً إلى جنب)
    if (colBefore) colBefore.classList.remove('hidden');
    if (boxBefore) boxBefore.classList.remove('hidden');
    if (boxAfter) boxAfter.classList.remove('hidden');
    if (imagesContainer) {
      imagesContainer.classList.remove('grid-cols-1');
      imagesContainer.classList.add('grid-cols-2');
    }
    if (badgeTextAfter) badgeTextAfter.innerText = 'After';
    if (badgeLabelAfter) {
      badgeLabelAfter.className = 'inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#064e3b] text-white border border-[#10b981] shadow text-[10px] font-bold tracking-wide select-none';
    }
    if (placeholderTitleBefore) placeholderTitleBefore.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubBefore) placeholderSubBefore.innerText = 'صورة قبل التعديل';
    if (placeholderTitleAfter) placeholderTitleAfter.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubAfter) placeholderSubAfter.innerText = 'صورة بعد التعديل';
  }
}

export function resetModalFields() {
  modalState.tempImgBefore = null;
  modalState.tempImgAfter = null;
  modalState.activeModalTags = [];
  modalState.activeModalChecklist = [];
  setModalStatus('resolved');
  setModalLayoutType('comparison');
  
  populateSectionTypeSelect();
  const typeSelect = document.getElementById('modal-section-type');
  if (typeSelect) {
    typeSelect.selectedIndex = 0;
    renderCategoryChecklist(typeSelect.value);
  }
  const customWrapper = document.getElementById('custom-section-wrapper');
  if (customWrapper) customWrapper.classList.add('hidden');
  const customTitle = document.getElementById('modal-custom-title');
  if (customTitle) customTitle.value = '';

  const inlineSec = document.getElementById('inline-add-section-container');
  if (inlineSec) inlineSec.classList.add('hidden');
  const inlineStd = document.getElementById('inline-add-standard-container');
  if (inlineStd) inlineStd.classList.add('hidden');

  toggleInlineAddTag(false);
  toggleInlineAddAssignee(false);

  const notes = document.getElementById('modal-notes');
  if (notes) notes.value = '';

  const assigneeInput = document.getElementById('modal-action-assignee');
  const duedateInput = document.getElementById('modal-action-duedate');
  if (assigneeInput) assigneeInput.value = '';
  if (duedateInput) duedateInput.value = '';
  
  clearModalImage('before');
  clearModalImage('after');
  
  if (typeof resetImageConfig === 'function') {
    resetImageConfig('before');
    resetImageConfig('after');
  }
  const ctrlBefore = document.getElementById('image-controls-before');
  const ctrlAfter = document.getElementById('image-controls-after');
  if (ctrlBefore) ctrlBefore.classList.add('hidden');
  if (ctrlAfter) ctrlAfter.classList.add('hidden');

  renderQuickTagsList();
  renderQuickAssigneesList();

  if (modalState.isSpeechRecording) {
    stopVoiceDictation();
  }
}

export function handleSectionTypeChange(val) {
  const customWrapper = document.getElementById('custom-section-wrapper');
  if (val === '__custom_section__') {
    if (customWrapper) customWrapper.classList.remove('hidden');
    renderCategoryChecklist('default');
  } else {
    if (customWrapper) customWrapper.classList.add('hidden');
    renderCategoryChecklist(val);
  }
}

// ==================== إدارة وتخصيص أقسام المعرض ومعايير الـ VM ====================

export function openSectionManagerModal(initialSection = null) {
  const sections = getStoreSections();
  modalState.selectedManagerSection = initialSection || (sections.length > 0 ? sections[0] : '');
  renderSectionManager();
  showModal('section-manager-modal');
}

export function closeSectionManagerModal() {
  hideModal('section-manager-modal');
  const typeSelect = document.getElementById('modal-section-type');
  const currentVal = typeSelect ? typeSelect.value : null;
  populateSectionTypeSelect(currentVal);
}

export function selectManagerSection(sectionName) {
  modalState.selectedManagerSection = sectionName;
  renderSectionManager();
}

export async function submitAddStoreSection(source = 'manager') {
  let input = null;
  if (source === 'inline') {
    input = document.getElementById('inline-add-section-input');
  } else {
    input = document.getElementById('sec-mgr-add-section-input');
  }

  const name = input ? input.value.trim() : '';
  if (!name) {
    showToast('يرجى كتابة اسم القسم الجديد', 'error');
    return;
  }

  const res = addStoreSection(name);
  if (!res.success) {
    showToast(res.reason || 'تعذر إضافة القسم', 'error');
    return;
  }

  if (input) input.value = '';

  // مزامنة مع سحابة D1 إن أمكن
  try {
    samxApi.saveSectionCloud(name, getSectionStandards(name));
  } catch(e){}

  populateSectionTypeSelect(name);
  const typeSelect = document.getElementById('modal-section-type');
  if (typeSelect) {
    typeSelect.value = name;
    renderCategoryChecklist(name);
  }

  if (source === 'inline') {
    toggleInlineAddSection(false);
  }

  modalState.selectedManagerSection = name;
  renderSectionManager();
  showToast(`✨ تمت إضافة قسم "${name}" بنجاح`, 'success');
}

export function toggleInlineAddSection(forceState = null) {
  const container = document.getElementById('inline-add-section-container');
  if (!container) return;
  const isHidden = container.classList.contains('hidden');
  const shouldShow = (forceState !== null) ? forceState : isHidden;

  if (shouldShow) {
    container.classList.remove('hidden');
    const input = document.getElementById('inline-add-section-input');
    if (input) input.focus();
  } else {
    container.classList.add('hidden');
    const input = document.getElementById('inline-add-section-input');
    if (input) input.value = '';
  }
}

export async function promptRenameSection(sectionName) {
  const newName = prompt(`تعديل اسم القسم:`, sectionName);
  if (!newName || !newName.trim() || newName.trim() === sectionName) return;

  const cleanNew = newName.trim();
  const res = updateStoreSection(sectionName, cleanNew);
  if (!res.success) {
    showToast(res.reason || 'تعذر تعديل اسم القسم', 'error');
    return;
  }

  try {
    samxApi.saveSectionCloud(cleanNew, getSectionStandards(cleanNew), sectionName);
  } catch(e){}

  populateSectionTypeSelect(cleanNew);
  modalState.selectedManagerSection = cleanNew;
  renderSectionManager();
  renderAuditCards();

  const typeSelect = document.getElementById('modal-section-type');
  if (typeSelect && typeSelect.value === cleanNew) {
    renderCategoryChecklist(cleanNew);
  }

  showToast(`✏️ تم تحديث اسم القسم إلى "${cleanNew}"`, 'success');
}

export async function confirmDeleteStoreSection(sectionName) {
  const isUsed = currentAudit.sections.some(s => s.title === sectionName);
  if (isUsed) {
    if (!confirm(`تنبيه: قسم "${sectionName}" مستخدم في الجولة الحالية! هل ترغب في حذفه من قائمة الأقسام المعتمدة رغم ذلك؟`)) {
      return;
    }
  } else {
    if (!confirm(`هل أنت متأكد من حذف قسم "${sectionName}" وجميع معاييره المرتبطة؟`)) {
      return;
    }
  }

  const res = deleteStoreSection(sectionName);
  if (!res.success) {
    showToast(res.reason || 'تعذر حذف القسم', 'error');
    return;
  }

  try {
    samxApi.deleteSectionCloud(sectionName);
  } catch(e){}

  const sections = getStoreSections();
  modalState.selectedManagerSection = sections.length > 0 ? sections[0] : '';
  populateSectionTypeSelect();
  renderSectionManager();

  const typeSelect = document.getElementById('modal-section-type');
  if (typeSelect) {
    renderCategoryChecklist(typeSelect.value);
  }

  showToast(`🗑️ تم حذف قسم "${sectionName}"`, 'info');
}

// ----------------- إدارة معايير الـ VM (VM Standards) -----------------

export function openInlineAddStandard() {
  const container = document.getElementById('inline-add-standard-container');
  if (!container) return;
  container.classList.remove('hidden');
  const input = document.getElementById('inline-add-standard-input');
  if (input) {
    input.focus();
  }
}

export function closeInlineAddStandard() {
  const container = document.getElementById('inline-add-standard-container');
  if (!container) return;
  container.classList.add('hidden');
  const input = document.getElementById('inline-add-standard-input');
  if (input) input.value = '';
}

export async function submitAddStandard(source = 'form') {
  let input = null;
  let targetSection = null;

  if (source === 'form') {
    input = document.getElementById('inline-add-standard-input');
    const typeSelect = document.getElementById('modal-section-type');
    const typeVal = typeSelect ? typeSelect.value : '';
    targetSection = (typeVal === '__custom_section__') ? 'default' : typeVal;
  } else {
    input = document.getElementById('sec-mgr-add-standard-input');
    targetSection = modalState.selectedManagerSection;
  }

  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('يرجى كتابة نص المعيار بدقة', 'error');
    return;
  }

  if (!targetSection) {
    showToast('يرجى تحديد القسم المستهدف أولاً', 'error');
    return;
  }

  const res = addSectionStandard(targetSection, text);
  if (!res.success) {
    showToast(res.reason || 'تعذر إضافة المعيار', 'error');
    return;
  }

  if (input) input.value = '';

  // تفعيل المعيار المضاف فورياً في الاستمارة
  if (source === 'form') {
    if (!modalState.activeModalChecklist.includes(text)) {
      modalState.activeModalChecklist.push(text);
    }
    renderCategoryChecklist(targetSection);
    closeInlineAddStandard();
  } else {
    renderSectionManager();
  }

  try {
    samxApi.saveSectionCloud(targetSection, getSectionStandards(targetSection));
  } catch(e){}

  showToast(`✅ تمت إضافة معيار: "${text}"`, 'success');
}

export async function openEditStandardModal(categoryName, standardText) {
  const newText = prompt(`تعديل معيار العرض المرئي (VM Standard):\nالقسم: ${categoryName}`, standardText);
  if (!newText || !newText.trim() || newText.trim() === standardText) return;

  const cleanNew = newText.trim();
  const res = updateSectionStandard(categoryName, standardText, cleanNew);
  if (!res.success) {
    showToast(res.reason || 'تعذر تعديل المعيار', 'error');
    return;
  }

  try {
    samxApi.saveSectionCloud(categoryName, getSectionStandards(categoryName));
  } catch(e){}

  renderCategoryChecklist(categoryName);
  renderSectionManager();
  renderAuditCards();
  showToast('✏️ تم تعديل المعيار بنجاح', 'success');
}

export async function confirmDeleteStandard(categoryName, standardText) {
  if (!confirm(`هل أنت متأكد من حذف هذا المعيار من معايير قسم "${categoryName}"؟\n\n"${standardText}"`)) {
    return;
  }

  const res = deleteSectionStandard(categoryName, standardText);
  if (!res.success) {
    showToast(res.reason || 'تعذر حذف المعيار', 'error');
    return;
  }

  try {
    samxApi.saveSectionCloud(categoryName, getSectionStandards(categoryName));
  } catch(e){}

  renderCategoryChecklist(categoryName);
  renderSectionManager();
  showToast('🗑️ تم حذف المعيار', 'info');
}

export async function confirmResetStandards(categoryName) {
  if (!confirm(`هل أنت متأكد من استعادة المعايير الافتراضية لقسم "${categoryName}"؟`)) {
    return;
  }

  resetSectionStandards(categoryName);
  try {
    samxApi.saveSectionCloud(categoryName, getSectionStandards(categoryName));
  } catch(e){}

  renderCategoryChecklist(categoryName);
  renderSectionManager();
  showToast('🔄 تم استعادة المعايير الافتراضية للقسم', 'success');
}

// ==================== تفاعلات وسوم المعالجة السريعة (Tags Controller) ====================

export function toggleModalTag(btnOrTag, maybeTag) {
  const tagName = typeof maybeTag === 'string' ? maybeTag : (typeof btnOrTag === 'string' ? btnOrTag : '');
  if (!tagName) return;

  if (!Array.isArray(modalState.activeModalTags)) {
    modalState.activeModalTags = [];
  }

  const idx = modalState.activeModalTags.indexOf(tagName);
  if (idx !== -1) {
    modalState.activeModalTags.splice(idx, 1);
  } else {
    modalState.activeModalTags.push(tagName);
  }

  renderQuickTagsList();
}

export function toggleInlineAddTag(show = null) {
  const box = document.getElementById('inline-add-tag-box');
  const input = document.getElementById('inline-tag-input');
  if (!box) return;

  const willShow = show !== null ? show : box.classList.contains('hidden');
  if (willShow) {
    box.classList.remove('hidden');
    if (input) {
      input.value = '';
      input.focus();
    }
  } else {
    box.classList.add('hidden');
    if (input) input.value = '';
  }
}

export function submitAddQuickTag() {
  const input = document.getElementById('inline-tag-input');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('يرجى كتابة نص الوسم أولاً', 'error');
    return;
  }

  const res = addQuickTag(val);
  if (!res.success) {
    showToast(res.reason || 'تعذر إضافة الوسم', 'error');
    return;
  }

  if (!modalState.activeModalTags.includes(val)) {
    modalState.activeModalTags.push(val);
  }

  toggleInlineAddTag(false);
  renderQuickTagsList();
  showToast(`✨ تمت إضافة وسم "${val}" وتحديده بنجاح`, 'success');
}

export function confirmDeleteQuickTag(tagName, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!confirm(`هل أنت متأكد من حذف وسم "${tagName}"؟`)) {
    return;
  }

  const res = deleteQuickTag(tagName);
  if (!res.success) {
    showToast(res.reason || 'تعذر حذف الوسم', 'error');
    return;
  }

  renderQuickTagsList();
  showToast(`🗑️ تم حذف وسم "${tagName}"`, 'info');
}

export function openEditQuickTag(tagName, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const newName = prompt('تعديل نص الوسم:', tagName);
  if (!newName || !newName.trim() || newName.trim() === tagName) return;

  const res = updateQuickTag(tagName, newName.trim());
  if (!res.success) {
    showToast(res.reason || 'تعذر تعديل الوسم', 'error');
    return;
  }

  renderQuickTagsList();
  showToast('✏️ تم تعديل الوسم بنجاح', 'success');
}

export function confirmResetQuickTags() {
  if (!confirm('هل أنت متأكد من استعادة قائمة الوسوم الافتراضية؟')) return;
  resetQuickTags();
  renderQuickTagsList();
  showToast('🔄 تم استعادة الوسوم الافتراضية', 'success');
}

export function toggleChecklistItem(standard) {
  if (modalState.activeModalChecklist.includes(standard)) {
    modalState.activeModalChecklist = modalState.activeModalChecklist.filter(s => s !== standard);
  } else {
    modalState.activeModalChecklist.push(standard);
  }
  const typeSelect = document.getElementById('modal-section-type');
  renderCategoryChecklist(typeSelect ? typeSelect.value : 'default');
}

export function insertChecklistToNotes() {
  if (modalState.activeModalChecklist.length === 0) {
    showToast('يرجى تحديد معيار واحد على الأقل من قائمة الـ VM أولاً', 'info');
    return;
  }
  const notesEl = document.getElementById('modal-notes');
  if (!notesEl) return;
  const bullets = modalState.activeModalChecklist.map(item => `• معيار مؤكد: ${item}`).join('\n');
  notesEl.value = (notesEl.value ? notesEl.value.trim() + '\n\n' : '') + bullets;
  showToast('تم إدراج معايير الـ VM في الملاحظات', 'success');
}

// ==================== تفاعلات جهات التكليف (Assignees Controller) ====================

export function setQuickAssignee(role) {
  const el = document.getElementById('modal-action-assignee');
  if (el) el.value = role;
  renderQuickAssigneesList();
}

export function toggleInlineAddAssignee(show = null) {
  const box = document.getElementById('inline-add-assignee-box');
  const input = document.getElementById('inline-assignee-input');
  if (!box) return;

  const willShow = show !== null ? show : box.classList.contains('hidden');
  if (willShow) {
    box.classList.remove('hidden');
    if (input) {
      input.value = '';
      input.focus();
    }
  } else {
    box.classList.add('hidden');
    if (input) input.value = '';
  }
}

export function submitAddQuickAssignee() {
  const input = document.getElementById('inline-assignee-input');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('يرجى كتابة المسمى أو جهة التكليف أولاً', 'error');
    return;
  }

  const res = addQuickAssignee(val);
  if (!res.success) {
    showToast(res.reason || 'تعذر إضافة جهة التكليف', 'error');
    return;
  }

  setQuickAssignee(val);
  toggleInlineAddAssignee(false);
  renderQuickAssigneesList();
  showToast(`✨ تمت إضافة جهة التكليف "${val}" واختيارها بنجاح`, 'success');
}

export function confirmDeleteQuickAssignee(roleName, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!confirm(`هل أنت متأكد من حذف "${roleName}" من قائمة الخيارات السريعة؟`)) {
    return;
  }

  const res = deleteQuickAssignee(roleName);
  if (!res.success) {
    showToast(res.reason || 'تعذر حذف جهة التكليف', 'error');
    return;
  }

  const inputEl = document.getElementById('modal-action-assignee');
  if (inputEl && inputEl.value === roleName) {
    inputEl.value = '';
  }

  renderQuickAssigneesList();
  showToast(`🗑️ تم حذف "${roleName}" من الخيارات السريعة`, 'info');
}

export function openEditQuickAssignee(roleName, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const newName = prompt('تعديل مسمى جهة التكليف:', roleName);
  if (!newName || !newName.trim() || newName.trim() === roleName) return;

  const res = updateQuickAssignee(roleName, newName.trim());
  if (!res.success) {
    showToast(res.reason || 'تعذر تعديل جهة التكليف', 'error');
    return;
  }

  const inputEl = document.getElementById('modal-action-assignee');
  if (inputEl && inputEl.value === roleName) {
    inputEl.value = newName.trim();
  }

  renderQuickAssigneesList();
  showToast('✏️ تم تعديل جهة التكليف بنجاح', 'success');
}

export function confirmResetQuickAssignees() {
  if (!confirm('هل أنت متأكد من استعادة جهات التكليف السريعة الافتراضية؟')) return;
  resetQuickAssignees();
  renderQuickAssigneesList();
  showToast('🔄 تم استعادة جهات التكليف الافتراضية', 'success');
}

export function setQuickDueDate(daysAhead) {
  const el = document.getElementById('modal-action-duedate');
  if (el) {
    const d = new Date(Date.now() + daysAhead * 86400000);
    el.value = d.toISOString().split('T')[0];
  }
}

export function setModalStatus(statusKey) {
  modalState.selectedModalStatus = statusKey;
  const opts = ['resolved', 'store_followup', 'management_action'];
  opts.forEach(k => {
    const btn = document.getElementById(`status-opt-${k}`);
    if (!btn) return;
    if (k === statusKey) {
      if (k === 'resolved') {
        btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-emerald-950/90 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500 shadow";
      } else if (k === 'store_followup') {
        btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-amber-950/90 text-amber-300 border-amber-500 ring-1 ring-amber-500 shadow";
      } else {
        btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-rose-950/90 text-rose-300 border-rose-500 ring-1 ring-rose-500 shadow";
      }
    } else {
      btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-corp-950 text-slate-400 border-corp-700 hover:text-slate-200";
    }
  });

  const followupWrapper = document.getElementById('action-followup-container');
  const labelEl = document.getElementById('followup-action-label');
  if (followupWrapper) {
    if (statusKey === 'store_followup' || statusKey === 'management_action') {
      followupWrapper.classList.remove('hidden');
      if (labelEl) {
        labelEl.innerHTML = statusKey === 'store_followup'
          ? '<i data-lucide="calendar-clock" class="w-4 h-4 text-amber-400"></i><span>بيانات تكليف متابعة الفرع:</span>'
          : '<i data-lucide="alert-triangle" class="w-4 h-4 text-rose-400"></i><span>بيانات تكليف الصيانة / الإدارة:</span>';
      }
    } else {
      followupWrapper.classList.add('hidden');
    }
  }
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// ==================== التحكم اليدوي بأبعاد وحجم الصور (Image Dimension & Scale Controls) ====================

export function applyImageConfigToPreview(type) {
  const isBefore = (type === 'before');
  const cfg = isBefore ? modalState.imgConfigBefore : modalState.imgConfigAfter;
  const imgEl = document.getElementById(`img-elem-${type}`);
  const previewBox = document.getElementById(`box-preview-${type}`);

  if (!imgEl || !cfg) return;

  const scale = (typeof cfg.scale === 'number' ? cfg.scale : 100) / 100;
  const align = cfg.align || 'center';
  const pos = (align === 'top') ? 'top center' : (align === 'bottom' ? 'bottom center' : 'center center');

  imgEl.style.transform = `scale(${scale})`;
  imgEl.style.transformOrigin = pos;
  imgEl.style.objectPosition = pos;

  if (previewBox) {
    if (cfg.aspectRatio === 'square') {
      previewBox.style.height = '145px';
    } else if (cfg.aspectRatio === 'wide') {
      previewBox.style.height = '105px';
    } else {
      previewBox.style.height = '128px';
    }
  }
}

export function setImageAlign(type, align) {
  const isBefore = (type === 'before');
  const cfg = isBefore ? modalState.imgConfigBefore : modalState.imgConfigAfter;
  cfg.align = align;

  const btnTop = document.getElementById(`btn-align-${type}-top`);
  const btnCenter = document.getElementById(`btn-align-${type}-center`);
  const btnBottom = document.getElementById(`btn-align-${type}-bottom`);

  const activeClass = "py-1 text-[10px] font-bold rounded bg-gold-500 text-slate-950 border border-gold-400 shadow";
  const inactiveClass = "py-1 text-[10px] font-bold rounded bg-corp-900 text-slate-400 border border-corp-700 hover:text-white";

  if (btnTop) btnTop.className = (align === 'top') ? activeClass : inactiveClass;
  if (btnCenter) btnCenter.className = (align === 'center') ? activeClass : inactiveClass;
  if (btnBottom) btnBottom.className = (align === 'bottom') ? activeClass : inactiveClass;

  applyImageConfigToPreview(type);
}

export function updateImageConfigFromUI(type) {
  const isBefore = (type === 'before');
  const cfg = isBefore ? modalState.imgConfigBefore : modalState.imgConfigAfter;

  const aspectSel = document.getElementById(`ctrl-${type}-aspect`);
  const scaleSlider = document.getElementById(`ctrl-${type}-scale`);
  const scaleVal = document.getElementById(`ctrl-${type}-scale-val`);

  if (aspectSel) cfg.aspectRatio = aspectSel.value || 'standard';
  if (scaleSlider) {
    const val = parseInt(scaleSlider.value, 10) || 100;
    cfg.scale = val;
    if (scaleVal) scaleVal.innerText = `${val}%`;
  }

  applyImageConfigToPreview(type);
}

export function syncImageControlsUI(type) {
  const isBefore = (type === 'before');
  const cfg = isBefore ? modalState.imgConfigBefore : modalState.imgConfigAfter;
  if (!cfg) return;

  const aspectSel = document.getElementById(`ctrl-${type}-aspect`);
  const scaleSlider = document.getElementById(`ctrl-${type}-scale`);
  const scaleVal = document.getElementById(`ctrl-${type}-scale-val`);

  if (aspectSel) aspectSel.value = cfg.aspectRatio || 'standard';
  if (scaleSlider) scaleSlider.value = String(cfg.scale || 100);
  if (scaleVal) scaleVal.innerText = `${cfg.scale || 100}%`;

  setImageAlign(type, cfg.align || 'center');
  applyImageConfigToPreview(type);
}

export function resetImageConfig(type) {
  const isBefore = (type === 'before');
  const defaultCfg = { aspectRatio: 'standard', scale: 100, align: 'center' };
  if (isBefore) {
    modalState.imgConfigBefore = { ...defaultCfg };
  } else {
    modalState.imgConfigAfter = { ...defaultCfg };
  }

  syncImageControlsUI(type);
}

// ضغط الصور الميدانية الذكي عبر Canvas
export function processImageFile(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  showToast('جاري تحسين وضغط الصورة...', 'info');

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDimension = 1280;

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

      if (type === 'before') {
        modalState.tempImgBefore = compressedDataUrl;
        const imgEl = document.getElementById('img-elem-before');
        if (imgEl) imgEl.src = compressedDataUrl;
        const box = document.getElementById('box-preview-before');
        if (box) box.classList.remove('hidden');
        const ph = document.getElementById('placeholder-before');
        if (ph) ph.classList.add('hidden');
        const ctrl = document.getElementById('image-controls-before');
        if (ctrl) ctrl.classList.remove('hidden');
        applyImageConfigToPreview('before');
      } else {
        modalState.tempImgAfter = compressedDataUrl;
        const imgEl = document.getElementById('img-elem-after');
        if (imgEl) imgEl.src = compressedDataUrl;
        const box = document.getElementById('box-preview-after');
        if (box) box.classList.remove('hidden');
        const ph = document.getElementById('placeholder-after');
        if (ph) ph.classList.add('hidden');
        const ctrl = document.getElementById('image-controls-after');
        if (ctrl) ctrl.classList.remove('hidden');
        applyImageConfigToPreview('after');
      }

      showToast('تمت إضافة الصورة بنجاح', 'success');
      if (window.lucide && typeof lucide.createIcons === 'function') {
        try { lucide.createIcons(); } catch(e){}
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function clearModalImage(type) {
  if (type === 'before') {
    modalState.tempImgBefore = null;
    const fi = document.getElementById('file-input-before');
    if (fi) fi.value = '';
    const imgEl = document.getElementById('img-elem-before');
    if (imgEl) imgEl.src = '';
    const box = document.getElementById('box-preview-before');
    if (box) box.classList.add('hidden');
    const ph = document.getElementById('placeholder-before');
    if (ph) ph.classList.remove('hidden');
    const ctrl = document.getElementById('image-controls-before');
    if (ctrl) ctrl.classList.add('hidden');
    resetImageConfig('before');
  } else {
    modalState.tempImgAfter = null;
    const fi = document.getElementById('file-input-after');
    if (fi) fi.value = '';
    const imgEl = document.getElementById('img-elem-after');
    if (imgEl) imgEl.src = '';
    const box = document.getElementById('box-preview-after');
    if (box) box.classList.add('hidden');
    const ph = document.getElementById('placeholder-after');
    if (ph) ph.classList.remove('hidden');
    const ctrl = document.getElementById('image-controls-after');
    if (ctrl) ctrl.classList.add('hidden');
    resetImageConfig('after');
  }
}

// حفظ بطاقة القسم
export function saveSectionEntry() {
  const typeSelect = document.getElementById('modal-section-type');
  const typeVal = typeSelect ? typeSelect.value : '';
  const customTitle = document.getElementById('modal-custom-title') ? document.getElementById('modal-custom-title').value.trim() : '';
  const finalTitle = typeVal === '__custom_section__' ? (customTitle || 'قسم مخصص') : typeVal;
  const notes = document.getElementById('modal-notes') ? document.getElementById('modal-notes').value.trim() : '';
  const layoutInput = document.getElementById('modal-layout-type');
  const layoutType = layoutInput ? layoutInput.value : 'comparison';

  if (!modalState.tempImgBefore && !modalState.tempImgAfter) {
    showToast('يرجى التقاط أو رفع صورة واحدة على الأقل للتسجيل', 'error');
    return;
  }

  const isFollowup = (modalState.selectedModalStatus === 'store_followup' || modalState.selectedModalStatus === 'management_action');
  const assigneeInput = document.getElementById('modal-action-assignee');
  const duedateInput = document.getElementById('modal-action-duedate');
  const actionAssignee = isFollowup ? ((assigneeInput ? assigneeInput.value.trim() : '') || 'مدير المعرض') : '';
  const actionDueDate = isFollowup ? ((duedateInput ? duedateInput.value : '') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]) : '';

  // معالجة صور البانوراما العريضة
  let finalBefore = modalState.tempImgBefore;
  let finalAfter = modalState.tempImgAfter;
  if (layoutType === 'single_panorama') {
    const singleImg = finalAfter || finalBefore;
    finalBefore = singleImg;
    finalAfter = singleImg;
  }

  const beforeConfig = { ...(modalState.imgConfigBefore || { aspectRatio: 'standard', scale: 100, align: 'center' }) };
  const afterConfig = { ...(modalState.imgConfigAfter || { aspectRatio: 'standard', scale: 100, align: 'center' }) };

  if (modalState.editingSectionId) {
    const index = currentAudit.sections.findIndex(s => s.id === modalState.editingSectionId);
    if (index !== -1) {
      currentAudit.sections[index] = {
        id: modalState.editingSectionId,
        title: finalTitle,
        layoutType: layoutType,
        status: modalState.selectedModalStatus || 'resolved',
        actionAssignee: actionAssignee,
        actionDueDate: actionDueDate,
        checklist: [...modalState.activeModalChecklist],
        beforeImg: finalBefore || currentAudit.sections[index].beforeImg,
        afterImg: finalAfter || currentAudit.sections[index].afterImg,
        beforeConfig: beforeConfig,
        afterConfig: afterConfig,
        tags: [...modalState.activeModalTags],
        notes: notes
      };
      showToast('تم تحديث القسم بنجاح', 'success');
    }
  } else {
    const newSec = {
      id: 'sec_' + Date.now(),
      title: finalTitle,
      layoutType: layoutType,
      status: modalState.selectedModalStatus || 'resolved',
      actionAssignee: actionAssignee,
      actionDueDate: actionDueDate,
      checklist: [...modalState.activeModalChecklist],
      beforeImg: finalBefore || 'https://placehold.co/600x450/0f172a/94a3b8?text=No+Image',
      afterImg: finalAfter || 'https://placehold.co/600x450/0f172a/94a3b8?text=No+Image',
      beforeConfig: beforeConfig,
      afterConfig: afterConfig,
      tags: [...modalState.activeModalTags],
      notes: notes
    };
    currentAudit.sections.push(newSec);
    showToast('تمت إضافة القسم وتوثيقه', 'success');
  }

  saveAuditToStorage();
  renderAuditCards();
  closeEntryModal();
}

export function editSectionEntry(id) {
  const sec = currentAudit.sections.find(s => s.id === id);
  if (!sec) return;

  modalState.editingSectionId = id;
  resetModalFields();
  openEntryModal(true);
  const heading = document.getElementById('modal-heading');
  if (heading) heading.innerText = 'تعديل توثيق: ' + sec.title;
  
  setModalLayoutType(sec.layoutType || 'comparison');
  
  const typeSelect = document.getElementById('modal-section-type');
  let matched = false;
  if (typeSelect) {
    for (let i = 0; i < typeSelect.options.length; i++) {
      if (typeSelect.options[i].value === sec.title) {
        typeSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      typeSelect.value = '__custom_section__';
      const customWrapper = document.getElementById('custom-section-wrapper');
      if (customWrapper) customWrapper.classList.remove('hidden');
      const customTitle = document.getElementById('modal-custom-title');
      if (customTitle) customTitle.value = sec.title;
    }
  }

  setModalStatus(sec.status || 'resolved');

  const assigneeInput = document.getElementById('modal-action-assignee');
  const duedateInput = document.getElementById('modal-action-duedate');
  if (assigneeInput) assigneeInput.value = sec.actionAssignee || '';
  if (duedateInput) duedateInput.value = sec.actionDueDate || '';

  modalState.activeModalChecklist = [...(sec.checklist || [])];
  renderCategoryChecklist(matched ? sec.title : 'default');

  const notesEl = document.getElementById('modal-notes');
  if (notesEl) notesEl.value = sec.notes || '';

  // استعادة إعدادات الأبعاد والتكبير والمحاذاة
  modalState.imgConfigBefore = sec.beforeConfig ? { ...sec.beforeConfig } : { aspectRatio: 'standard', scale: 100, align: 'center' };
  modalState.imgConfigAfter = sec.afterConfig ? { ...sec.afterConfig } : { aspectRatio: 'standard', scale: 100, align: 'center' };

  syncImageControlsUI('before');
  syncImageControlsUI('after');

  if (sec.beforeImg) {
    modalState.tempImgBefore = sec.beforeImg;
    const imgEl = document.getElementById('img-elem-before');
    if (imgEl) imgEl.src = sec.beforeImg;
    const box = document.getElementById('box-preview-before');
    if (box) box.classList.remove('hidden');
    const ph = document.getElementById('placeholder-before');
    if (ph) ph.classList.add('hidden');
    const ctrl = document.getElementById('image-controls-before');
    if (ctrl) ctrl.classList.remove('hidden');
    applyImageConfigToPreview('before');
  }

  if (sec.afterImg) {
    modalState.tempImgAfter = sec.afterImg;
    const imgEl = document.getElementById('img-elem-after');
    if (imgEl) imgEl.src = sec.afterImg;
    const box = document.getElementById('box-preview-after');
    if (box) box.classList.remove('hidden');
    const ph = document.getElementById('placeholder-after');
    if (ph) ph.classList.add('hidden');
    const ctrl = document.getElementById('image-controls-after');
    if (ctrl) ctrl.classList.remove('hidden');
    applyImageConfigToPreview('after');
  }

  modalState.activeModalTags = [...(sec.tags || [])];
  renderQuickTagsList();
  renderQuickAssigneesList();

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export function deleteSectionEntry(id) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف توثيق هذا القسم؟')) return;
  currentAudit.sections = currentAudit.sections.filter(s => s.id !== id);
  saveAuditToStorage();
  renderAuditCards();
  showToast('تم حذف القسم', 'info');
}

export function moveSection(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentAudit.sections.length) return;
  const temp = currentAudit.sections[index];
  currentAudit.sections[index] = currentAudit.sections[targetIndex];
  currentAudit.sections[targetIndex] = temp;
  saveAuditToStorage();
  renderAuditCards();
}

// أداة المقارنة المنزلقة
export function toggleCardViewMode(secId) {
  modalState.cardViewModes[secId] = modalState.cardViewModes[secId] === 'slider' ? 'sideBySide' : 'slider';
  renderAuditCards();
}

export function updateSliderPosition(secId, val) {
  const divider = document.getElementById(`slider-handle-${secId}`);
  const beforeImg = document.getElementById(`slider-before-img-${secId}`);
  if (divider) divider.style.left = `${val}%`;
  if (beforeImg) {
    beforeImg.style.clipPath = `polygon(0 0, ${val}% 0, ${val}% 100%, 0 100%)`;
  }
}

// أداة التأشير والملاحظات البصرية (CANVAS ANNOTATOR)
let annotatorCanvas = null;
let annotatorCtx = null;
let annotatorBaseImg = null;
let annotatorHistory = [];
let isDrawing = false;
let annotatorTool = 'freehand';
let startX = 0;
let startY = 0;
let annotatorTarget = 'modal';
let drawingPoints = [];

export function openAnnotatorFromModal() {
  if (!modalState.tempImgBefore) {
    showToast('يرجى التقاط صورة الوضع السابق أولاً للتأشير عليها', 'error');
    return;
  }
  annotatorTarget = 'modal';
  initCanvasAnnotator(modalState.tempImgBefore);
}

export function openAnnotatorForSection(secId) {
  const sec = currentAudit.sections.find(s => s.id === secId);
  if (!sec || !sec.beforeImg) {
    showToast('لا توجد صورة سابقة للتأشير عليها', 'error');
    return;
  }
  annotatorTarget = secId;
  initCanvasAnnotator(sec.beforeImg);
}

export function initCanvasAnnotator(imgSrc) {
  annotatorCanvas = document.getElementById('annotator-canvas');
  if (!annotatorCanvas) {
    console.error('annotator-canvas element missing');
    return;
  }
  annotatorCtx = annotatorCanvas.getContext('2d');
  annotatorHistory = [];

  showToast('جاري فتح أداة التأشير...', 'info');

  annotatorBaseImg = new Image();
  if (typeof imgSrc === 'string' && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://'))) {
    annotatorBaseImg.crossOrigin = 'anonymous';
  }

  let launched = false;
  const launch = () => {
    if (launched) return;
    launched = true;

    const maxW = 1200;
    let w = (annotatorBaseImg && annotatorBaseImg.width) ? annotatorBaseImg.width : 800;
    let h = (annotatorBaseImg && annotatorBaseImg.height) ? annotatorBaseImg.height : 600;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    annotatorCanvas.width = w;
    annotatorCanvas.height = h;

    try {
      redrawAnnotatorBase();
    } catch(e) {
      annotatorCtx.fillStyle = '#0b1120';
      annotatorCtx.fillRect(0, 0, annotatorCanvas.width, annotatorCanvas.height);
    }
    saveAnnotatorHistoryState();

    showModal('annotator-modal');
    bindCanvasDrawingEvents();
    setAnnotatorTool('freehand');
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  };

  annotatorBaseImg.onload = launch;
  annotatorBaseImg.onerror = function(err) {
    console.warn('Annotator base image failed to load, launching canvas fallback', err);
    launch();
  };

  setTimeout(() => {
    if (!launched) launch();
  }, 1000);

  annotatorBaseImg.src = imgSrc;
}

export function setAnnotatorTool(tool) {
  annotatorTool = tool;
  const btnFree = document.getElementById('tool-btn-freehand');
  const btnCirc = document.getElementById('tool-btn-circle');
  if (tool === 'freehand') {
    if (btnFree) btnFree.className = "px-2.5 py-1 text-xs font-bold rounded-lg transition bg-gold-500 text-slate-950 shadow flex items-center gap-1";
    if (btnCirc) btnCirc.className = "px-2.5 py-1 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white flex items-center gap-1";
  } else {
    if (btnCirc) btnCirc.className = "px-2.5 py-1 text-xs font-bold rounded-lg transition bg-gold-500 text-slate-950 shadow flex items-center gap-1";
    if (btnFree) btnFree.className = "px-2.5 py-1 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white flex items-center gap-1";
  }
}

function getCanvasCoordinates(e) {
  const rect = annotatorCanvas.getBoundingClientRect();
  const scaleX = annotatorCanvas.width / rect.width;
  const scaleY = annotatorCanvas.height / rect.height;

  let clientX = e.clientX;
  let clientY = e.clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function bindCanvasDrawingEvents() {
  annotatorCanvas.onmousedown = onDrawingStart;
  annotatorCanvas.onmousemove = onDrawingMove;
  annotatorCanvas.onmouseup = onDrawingEnd;
  annotatorCanvas.onmouseleave = onDrawingEnd;

  annotatorCanvas.ontouchstart = (e) => { e.preventDefault(); onDrawingStart(e); };
  annotatorCanvas.ontouchmove = (e) => { e.preventDefault(); onDrawingMove(e); };
  annotatorCanvas.ontouchend = (e) => { e.preventDefault(); onDrawingEnd(e); };
}

function onDrawingStart(e) {
  isDrawing = true;
  const pos = getCanvasCoordinates(e);
  startX = pos.x;
  startY = pos.y;
  drawingPoints = [{ x: pos.x, y: pos.y }];
}

function onDrawingMove(e) {
  if (!isDrawing) return;
  const pos = getCanvasCoordinates(e);

  if (annotatorTool === 'freehand') {
    drawingPoints.push({ x: pos.x, y: pos.y });
    annotatorCtx.strokeStyle = '#ef4444';
    annotatorCtx.lineWidth = 4;
    annotatorCtx.lineCap = 'round';
    annotatorCtx.lineJoin = 'round';
    annotatorCtx.beginPath();
    const p1 = drawingPoints[drawingPoints.length - 2];
    const p2 = drawingPoints[drawingPoints.length - 1];
    if (p1 && p2) {
      annotatorCtx.moveTo(p1.x, p1.y);
      annotatorCtx.lineTo(p2.x, p2.y);
      annotatorCtx.stroke();
    }
  } else if (annotatorTool === 'circle') {
    restoreLastHistoryState();
    const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
    annotatorCtx.strokeStyle = '#ef4444';
    annotatorCtx.lineWidth = 4;
    annotatorCtx.beginPath();
    annotatorCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
    annotatorCtx.stroke();
  }
}

function onDrawingEnd() {
  if (!isDrawing) return;
  isDrawing = false;
  saveAnnotatorHistoryState();
}

function saveAnnotatorHistoryState() {
  if (!annotatorCanvas) annotatorCanvas = document.getElementById('annotator-canvas');
  if (!annotatorCanvas || !annotatorCtx) return;
  try {
    const state = annotatorCtx.getImageData(0, 0, annotatorCanvas.width, annotatorCanvas.height);
    annotatorHistory.push(state);
    if (annotatorHistory.length > 25) annotatorHistory.shift();
  } catch(e) {}
}

function restoreLastHistoryState() {
  if (!annotatorCanvas) annotatorCanvas = document.getElementById('annotator-canvas');
  if (!annotatorCanvas || !annotatorCtx) return;
  if (annotatorHistory.length > 0) {
    annotatorCtx.putImageData(annotatorHistory[annotatorHistory.length - 1], 0, 0);
  }
}

export function annotatorUndo() {
  if (!annotatorCanvas) annotatorCanvas = document.getElementById('annotator-canvas');
  if (!annotatorCanvas || !annotatorCtx) return;
  if (annotatorHistory.length > 1) {
    annotatorHistory.pop();
    const prev = annotatorHistory[annotatorHistory.length - 1];
    annotatorCtx.putImageData(prev, 0, 0);
    showToast('تم التراجع عن آخر خطوة', 'info');
  } else {
    showToast('لا توجد خطوات سابقة للتراجع عنها', 'info');
  }
}

export function annotatorClear() {
  if (!confirm('هل ترغب في مسح كافة التأشيرات واستعادة الصورة الأصلية؟')) return;
  redrawAnnotatorBase();
  annotatorHistory = [];
  saveAnnotatorHistoryState();
  showToast('تم مسح التأشيرات', 'info');
}

function redrawAnnotatorBase() {
  if (!annotatorCanvas) annotatorCanvas = document.getElementById('annotator-canvas');
  if (!annotatorCanvas || !annotatorCtx) return;
  annotatorCtx.clearRect(0, 0, annotatorCanvas.width, annotatorCanvas.height);
  if (annotatorBaseImg && annotatorBaseImg.width) {
    annotatorCtx.drawImage(annotatorBaseImg, 0, 0, annotatorCanvas.width, annotatorCanvas.height);
  } else {
    annotatorCtx.fillStyle = '#0b1120';
    annotatorCtx.fillRect(0, 0, annotatorCanvas.width, annotatorCanvas.height);
  }
}

export function saveAnnotationResult() {
  try {
    if (!annotatorCanvas) annotatorCanvas = document.getElementById('annotator-canvas');
    if (!annotatorCanvas) {
      closeAnnotatorModal();
      return;
    }
    const annotatedData = annotatorCanvas.toDataURL('image/jpeg', 0.85);

    if (annotatorTarget === 'modal') {
      modalState.tempImgBefore = annotatedData;
      const imgElem = document.getElementById('img-elem-before');
      if (imgElem) imgElem.src = annotatedData;
    } else {
      const secIndex = currentAudit.sections.findIndex(s => s.id === annotatorTarget);
      if (secIndex !== -1) {
        currentAudit.sections[secIndex].beforeImg = annotatedData;
        saveAuditToStorage();
        renderAuditCards();
      }
    }

    closeAnnotatorModal();
    showToast('تم حفظ التأشير وتحديث الصورة بنجاح', 'success');
  } catch (err) {
    console.error('Error in saveAnnotationResult:', err);
    closeAnnotatorModal();
    showToast('تم إغلاق نافذة التأشير', 'info');
  }
}

export function closeAnnotatorModal() {
  hideModal('annotator-modal');
  isDrawing = false;
}

// Lightbox معاينة الصور
export function openLightbox(src, title) {
  if (!src || src.includes('placehold.co')) return;
  const img = document.getElementById('lightbox-img');
  const tit = document.getElementById('lightbox-title');
  if (img) img.src = src;
  if (tit) tit.innerText = title || 'معاينة الصورة الميدانية';
  showModal('image-lightbox');
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export function closeLightbox() {
  hideModal('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (img) img.src = '';
}

// التحقق من الجودة قبل الطباعة والتصدير
export function validateAuditQuality(onProceed) {
  if (!currentAudit.sections || currentAudit.sections.length === 0) {
    return true;
  }

  const issues = [];
  currentAudit.sections.forEach((sec, idx) => {
    const secIssues = [];
    const hasBefore = sec.beforeImg && !sec.beforeImg.includes('placehold.co');
    const hasAfter = sec.afterImg && !sec.afterImg.includes('placehold.co');
    const hasNotesOrChecklist = (sec.notes && sec.notes.trim().length > 0) || (sec.checklist && sec.checklist.length > 0);

    if (!hasBefore) secIssues.push('صورة الوضع السابق (قبل) مفقودة');
    if (!hasAfter) secIssues.push('صورة بعد التعديل (بعد) مفقودة');
    if (!hasNotesOrChecklist) secIssues.push('الملاحظات الفنية أو معايير الـ VM غير موثقة');

    if (secIssues.length > 0) {
      issues.push({
        sectionIndex: idx,
        sectionId: sec.id,
        sectionTitle: sec.title,
        reasons: secIssues
      });
    }
  });

  if (issues.length === 0) {
    return true;
  }

  modalState.pendingValidationProceedCallback = onProceed;
  const listEl = document.getElementById('validation-issues-list');
  if (listEl) {
    listEl.innerHTML = issues.map(item => `
      <div class="p-3 bg-corp-950/90 border border-corp-800 rounded-xl flex items-start justify-between gap-3">
        <div>
          <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
            <span class="w-5 h-5 rounded bg-corp-800 text-gold-400 text-[10px] font-bold flex items-center justify-center">#${item.sectionIndex + 1}</span>
            <span>${item.sectionTitle}</span>
          </h4>
          <ul class="mt-1 space-y-0.5 pr-6 text-[11px] text-rose-400 list-disc">
            ${item.reasons.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        <button type="button" onclick="editSectionEntry('${item.sectionId}'); closeValidationModal();" class="text-xs text-gold-400 hover:text-gold-300 font-bold bg-corp-900 border border-corp-700 px-2.5 py-1.5 rounded-lg shrink-0 transition">
          استكمال ✏️
        </button>
      </div>
    `).join('');
  }

  showModal('validation-check-modal');
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
  showToast('تنبيه: بعض الأقسام تنقصها صور بعد أو الملاحظات', 'info');
  return false;
}

export function closeValidationModal() {
  hideModal('validation-check-modal');
  modalState.pendingValidationProceedCallback = null;
}

export function confirmProceedAnyway() {
  const cb = modalState.pendingValidationProceedCallback;
  closeValidationModal();
  if (typeof cb === 'function') {
    modalState.isBypassingValidation = true;
    cb();
    modalState.isBypassingValidation = false;
  }
}

// التنقل بين التبويبات
export function switchTab(tabId) {
  if (tabId === 'preview' && !modalState.isBypassingValidation) {
    const passed = validateAuditQuality(() => {
      switchTab('preview');
    });
    if (!passed) return;
  }

  const views = ['audit', 'preview', 'settings'];
  views.forEach(v => {
    const viewEl = document.getElementById(`view-${v}`);
    const tabNavEl = document.getElementById(`tab-nav-${v}`);
    const mobileNavEl = document.getElementById(`mobile-nav-${v}`);

    if (v === tabId) {
      if (viewEl) viewEl.classList.remove('hidden');
      if (tabNavEl) {
        tabNavEl.className = "px-4 py-2.5 font-bold border-b-2 border-gold-500 text-gold-400 flex items-center gap-2 transition";
      }
      if (mobileNavEl) {
        mobileNavEl.className = "flex flex-col items-center gap-1 py-1 px-3 text-gold-400 font-bold text-[11px] transition";
      }
    } else {
      if (viewEl) viewEl.classList.add('hidden');
      if (tabNavEl) {
        tabNavEl.className = "px-4 py-2.5 font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition";
      }
      if (mobileNavEl) {
        mobileNavEl.className = "flex flex-col items-center gap-1 py-1 px-3 text-slate-400 font-medium text-[11px] hover:text-slate-200 transition";
      }
    }
  });

  if (tabId === 'preview') {
    renderPrintSections();
  } else if (tabId === 'settings') {
    renderBulkExportUI();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// الإملاء الصوتي
let speechRecognizer = null;

export function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.lang = 'ar-SA';
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;

    speechRecognizer.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      const notesEl = document.getElementById('modal-notes');
      if (notesEl) {
        notesEl.value = (notesEl.value ? notesEl.value + ' ' : '') + transcript;
      }
      showToast('تم تحويل الصوت إلى نص', 'success');
      stopVoiceDictation();
    };

    speechRecognizer.onerror = function() {
      stopVoiceDictation();
      showToast('تعذر التعرف على الصوت، يرجى المحاولة ثانية', 'error');
    };

    speechRecognizer.onend = function() {
      stopVoiceDictation();
    };
  }
}

export function toggleVoiceDictation() {
  if (!speechRecognizer) {
    showToast('ميزة الإملاء الصوتي غير مدعومة في متصفحك حالياً', 'error');
    return;
  }
  if (modalState.isSpeechRecording) {
    speechRecognizer.stop();
    stopVoiceDictation();
  } else {
    try {
      speechRecognizer.start();
      modalState.isSpeechRecording = true;
      const vt = document.getElementById('voice-text');
      if (vt) vt.innerText = 'جاري الاستماع...';
      const btn = document.getElementById('voice-dictation-btn');
      if (btn) btn.classList.add('bg-rose-950', 'text-rose-400', 'border-rose-500', 'animate-pulse');
    } catch (e) {
      stopVoiceDictation();
    }
  }
}

export function stopVoiceDictation() {
  modalState.isSpeechRecording = false;
  const btn = document.getElementById('voice-dictation-btn');
  if (btn) {
    const vt = document.getElementById('voice-text');
    if (vt) vt.innerText = 'إملاء صوتي';
    btn.classList.remove('bg-rose-950', 'text-rose-400', 'border-rose-500', 'animate-pulse');
  }
}

// النسخ الاحتياطي وإدارة مسودة التقرير
export function confirmResetReport() {
  if (!confirm('هل أنت متأكد من رغبتك في تفريغ التقرير وبدء زيارة ميدانية جديدة؟')) return;
  currentAudit.id = 'samx_' + Date.now();
  currentAudit.sections = [];
  saveAuditToStorage();
  renderAuditCards();
  switchTab('audit');
  showToast('تم بدء مسودة جديدة بنجاح', 'success');
}

export function exportJsonBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentAudit, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `SAMX_VM_${(currentAudit.branchName || 'Store').replace(/\s+/g, '_')}_W${currentAudit.weekNumber || 1}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('تم تصدير ملف النسخة الاحتياطية بنجاح', 'success');
}

export function importJsonBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && Array.isArray(parsed.sections)) {
        Object.assign(currentAudit, parsed);
        bindMetaInputs();
        saveAuditToStorage();
        renderAuditCards();
        switchTab('audit');
        showToast('تم استيراد التقرير بنجاح', 'success');
      } else {
        showToast('صيغة الملف غير متوافقة مع نظام SAMX-VM', 'error');
      }
    } catch (err) {
      showToast('فشل قراءة ملف النسخة الاحتياطية', 'error');
    }
  };
  reader.readAsText(file);
}

// ==================== موديول التصدير المجمع لدورة التدقيق الشهرية (Bulk Export Controller) ====================

export function archiveCurrentAuditToStorage() {
  if (!currentAudit || !Array.isArray(currentAudit.sections) || currentAudit.sections.length === 0) {
    showToast('لا توجد أقسام موثقة في الجولة الحالية لأرشفتها', 'warning');
    return;
  }
  const saved = archiveCurrentAudit(currentAudit);
  renderBulkExportUI();
  showToast(`✅ تم حفظ جولة (${saved.branchName || 'المعرض'} - أسبوع ${saved.weekNumber || 1}) في الأرشيف المحلي بنجاح`, 'success');
}

export async function uploadJsonToArchive(event) {
  const files = event?.target?.files;
  if (!files || files.length === 0) return;

  const readAuditFile = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.sections)) {
          if (!parsed.id) {
            parsed.id = 'samx_imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          }
          if (!parsed.savedAt) {
            parsed.savedAt = new Date().toISOString();
          }
          resolve(parsed);
        } else {
          resolve(null);
        }
      } catch (err) {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });

  const promises = Array.from(files).map(file => readAuditFile(file));
  const results = await Promise.all(promises);
  const validAudits = results.filter(Boolean);

  if (validAudits.length > 0) {
    addAuditsToArchive(validAudits);
    renderBulkExportUI();
    showToast(`✅ تم استيراد وتخزين ${validAudits.length} جولة تدقيق بنجاح في الأرشيف المحلي`, 'success');
  } else {
    showToast('لم يتم العثور على ملفات تدقيق VM صالحة في الملفات المحددة', 'error');
  }

  if (event.target) event.target.value = '';
}

export function toggleSelectAllArchivedAudits() {
  const selectAll = document.getElementById('bulk-select-all-checkbox');
  const isChecked = selectAll ? selectAll.checked : true;
  const checkboxes = document.querySelectorAll('.bulk-audit-item-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
  });
  updateBulkExportSelectionCounter();
}

export function confirmDeleteArchivedAudit(id) {
  const target = getArchivedAuditById(id);
  const name = target ? `${target.branchName} (W${target.weekNumber})` : 'هذه الجولة';
  if (!confirm(`هل أنت متأكد من حذف ${name} من الأرشيف المحلي؟`)) return;

  deleteArchivedAudit(id);
  renderBulkExportUI();
  showToast('تم حذف الجولة من الأرشيف المحلي', 'info');
}

export function loadArchivedAuditToEditor(id) {
  const archived = getArchivedAuditById(id);
  if (!archived) {
    showToast('الجولة المطلوبة غير موجودة في الأرشيف', 'error');
    return;
  }

  if (currentAudit && currentAudit.sections && currentAudit.sections.length > 0) {
    if (!confirm('تنبيه: سيتم استبدال مسودة الجولة المفتوحة حالياً بهذه الجولة من الأرشيف. هل ترغب بالاستمرار؟')) {
      return;
    }
  }

  const cloned = JSON.parse(JSON.stringify(archived));
  Object.assign(currentAudit, cloned);
  bindMetaInputs();
  saveAuditToStorage();
  renderAuditCards();
  switchTab('audit');
  showToast(`تم فتح جولة (${cloned.branchName} - أسبوع ${cloned.weekNumber}) في لوحة العمل والتدقيق الميداني`, 'success');
}

export function downloadSingleArchivedAuditJson(id) {
  const audit = getArchivedAuditById(id);
  if (!audit) return;
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(audit, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `SAMX_VM_${(audit.branchName || 'Store').replace(/\s+/g, '_')}_W${audit.weekNumber || 1}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('تم تحميل ملف الجولة بصيغة JSON بنجاح', 'success');
}

export function confirmResetArchivedAudits() {
  if (!confirm('هل ترغب في استعادة الجولات التدقيقية النموذجية الأسبوعية لدورة الشهر الكاملة؟')) return;
  resetArchivedAuditsToDefault();
  renderBulkExportUI();
  showToast('تمت استعادة جولات الدورة الشهرية النموذجية بنجاح', 'success');
}

export function toggleReportFooter(show) {
  const footer = document.getElementById('print-signatures-footer');
  if (footer) {
    if (show) {
      footer.classList.remove('hidden', 'no-print');
      footer.style.display = 'grid';
    } else {
      footer.classList.add('hidden', 'no-print');
      footer.style.display = 'none';
    }
  }
}

// ==================== إدارة الهوية البصرية وشعار الشركة (Brand Identity Controller) ====================
let tempBrandingState = {
  companyName: '',
  companySubtitle: '',
  logoData: '',
  footerDisclaimer: ''
};

export function openBrandingModal() {
  const current = getBrandingSettings();
  tempBrandingState = { ...current };

  const nameInput = document.getElementById('branding-input-company-name');
  if (nameInput) nameInput.value = current.companyName || '';

  const subInput = document.getElementById('branding-input-company-subtitle');
  if (subInput) subInput.value = current.companySubtitle || '';

  const discInput = document.getElementById('branding-input-disclaimer');
  if (discInput) discInput.value = current.footerDisclaimer || '';

  updateBrandingModalLogoPreview();
  updateBrandingLivePreview(tempBrandingState);
  showModal('branding-modal');
}

export function closeBrandingModal() {
  hideModal('branding-modal');
}

export function updateBrandingModalLogoPreview() {
  const logoPreviewBox = document.getElementById('branding-logo-current-preview');
  const removeBtn = document.getElementById('branding-btn-remove-logo');
  if (!logoPreviewBox) return;

  if (tempBrandingState.logoData) {
    logoPreviewBox.innerHTML = `
      <img src="${tempBrandingState.logoData}" alt="الشعار الحالي" class="max-h-16 max-w-[180px] w-auto h-auto object-contain rounded border border-corp-700 bg-white/5 p-1" />
    `;
    if (removeBtn) removeBtn.classList.remove('hidden');
  } else {
    logoPreviewBox.innerHTML = `
      <div class="text-xs text-slate-500 py-1 flex items-center gap-1.5">
        <i data-lucide="image" class="w-4 h-4 text-slate-500"></i>
        <span>لم يتم رفع شعار مخصص بعد (يتم استخدام شارة SAMX-VM الافتراضية)</span>
      </div>
    `;
    if (removeBtn) removeBtn.classList.add('hidden');
  }

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export function handleBrandingLogoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('يرجى اختيار ملف صورة صالح (PNG, JPEG, WebP, SVG)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    const img = new Image();
    img.onload = function() {
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const optimizedData = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
      tempBrandingState.logoData = optimizedData;
      updateBrandingModalLogoPreview();
      updateBrandingLivePreview(tempBrandingState);
      showToast('تم تحميل وتجهيز شعار الشركة بنجاح', 'success');
    };
    img.onerror = function() {
      tempBrandingState.logoData = rawData;
      updateBrandingModalLogoPreview();
      updateBrandingLivePreview(tempBrandingState);
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
}

export function removeBrandingLogo() {
  tempBrandingState.logoData = '';
  const fileInput = document.getElementById('branding-input-logo');
  if (fileInput) fileInput.value = '';
  updateBrandingModalLogoPreview();
  updateBrandingLivePreview(tempBrandingState);
  showToast('تمت إزالة الشعار واستعادة الشارة الافتراضية', 'info');
}

export function saveBrandingFromModal() {
  const nameInput = document.getElementById('branding-input-company-name');
  const subInput = document.getElementById('branding-input-company-subtitle');
  const discInput = document.getElementById('branding-input-disclaimer');

  const companyName = nameInput ? nameInput.value.trim() : tempBrandingState.companyName;
  const companySubtitle = subInput ? subInput.value.trim() : tempBrandingState.companySubtitle;
  const footerDisclaimer = discInput ? discInput.value.trim() : tempBrandingState.footerDisclaimer;

  saveBrandingSettings({
    companyName: companyName || 'SAMX-VM',
    companySubtitle: companySubtitle || 'العرض المرئي والتنسيق التجاري',
    logoData: tempBrandingState.logoData || '',
    footerDisclaimer: footerDisclaimer || 'تقرير تدقيق معتمد صادر من منصة العرض المرئي'
  });

  syncBrandingUI();
  syncQuickDisplays();
  renderPrintSections();
  closeBrandingModal();
  showToast('✅ تم حفظ الهوية وتطبيقها بنجاح على تقارير PDF وPowerPoint!', 'success');
}

export function resetBrandingToDefault() {
  if (!confirm('هل أنت متأكد من رغبتك في استعادة الهوية وشعار SAMX-VM الافتراضي؟')) return;

  resetBrandingSettings();
  const def = getBrandingSettings();
  tempBrandingState = { ...def };

  const nameInput = document.getElementById('branding-input-company-name');
  if (nameInput) nameInput.value = def.companyName;

  const subInput = document.getElementById('branding-input-company-subtitle');
  if (subInput) subInput.value = def.companySubtitle;

  const discInput = document.getElementById('branding-input-disclaimer');
  if (discInput) discInput.value = def.footerDisclaimer;

  const fileInput = document.getElementById('branding-input-logo');
  if (fileInput) fileInput.value = '';

  updateBrandingModalLogoPreview();
  updateBrandingLivePreview(tempBrandingState);
  syncBrandingUI();
  syncQuickDisplays();
  renderPrintSections();
  closeBrandingModal();
  showToast('تمت استعادة إعدادات الهوية الافتراضية لمنظومة SAMX-VM بنجاح', 'info');
}

export function setupBrandingRealtimeListeners() {
  const nameInput = document.getElementById('branding-input-company-name');
  const subInput = document.getElementById('branding-input-company-subtitle');
  const discInput = document.getElementById('branding-input-disclaimer');

  const onInput = () => {
    tempBrandingState.companyName = nameInput ? nameInput.value : '';
    tempBrandingState.companySubtitle = subInput ? subInput.value : '';
    tempBrandingState.footerDisclaimer = discInput ? discInput.value : '';
    updateBrandingLivePreview(tempBrandingState);
  };

  if (nameInput) nameInput.addEventListener('input', onInput);
  if (subInput) subInput.addEventListener('input', onInput);
  if (discInput) discInput.addEventListener('input', onInput);
}

export function printReport() {
  if (!modalState.isBypassingValidation) {
    const passed = validateAuditQuality(() => {
      printReport();
    });
    if (!passed) return;
  }
  syncBrandingUI();
  renderPrintSections();
  const originalTitle = document.title;
  document.title = '';
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

export async function exportPdfReport() {
  if (!modalState.isBypassingValidation) {
    const passed = validateAuditQuality(() => {
      exportPdfReport();
    });
    if (!passed) return;
  }
  await exportAuditToPdf();
}

export async function exportPptxReport() {
  if (!modalState.isBypassingValidation) {
    const passed = validateAuditQuality(() => {
      exportPptxReport();
    });
    if (!passed) return;
  }

  const btn = document.getElementById('btn-export-pptx');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-slate-950"></i><span>جارٍ التوليد...</span>`;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  }

  try {
    await exportAuditToPptx();
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

export async function exportPptxA4Report() {
  if (!modalState.isBypassingValidation) {
    const passed = validateAuditQuality(() => {
      exportPptxA4Report();
    });
    if (!passed) return;
  }

  const btn = document.getElementById('btn-export-pptx-a4');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-slate-950"></i><span>جارٍ إعداد A4...</span>`;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  }

  try {
    await exportAuditToPptxA4();
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

export async function shareWhatsAppSummary() {
  let msg = `*تقرير العرض المرئي الأسبوعي (SAMX-VM Report)*\n`;
  msg += `🏪 *المعرض:* ${currentAudit.branchName || 'معرض غير محدد'}\n`;
  msg += `📅 *التاريخ:* ${currentAudit.auditDate || '-'} | *الأسبوع:* ${currentAudit.weekNumber || '1'}\n`;
  msg += `👔 *أخصائي الـ VM:* ${currentAudit.auditorName || '-'}\n`;
  msg += `--------------------------------------\n`;
  msg += `📊 *إجمالي الأقسام الموثقة (${currentAudit.sections.length}):*\n`;

  currentAudit.sections.forEach((sec, idx) => {
    const statusMeta = STATUS_MAP[sec.status] || STATUS_MAP.resolved;
    msg += `\n${idx + 1}. *${sec.title}* [${statusMeta.label}]\n`;
    if (sec.checklist && sec.checklist.length > 0) {
      msg += `   ✅ معايير الـ VM: ${sec.checklist.join('، ')}\n`;
    }
    if (sec.status !== 'resolved' && sec.actionAssignee) {
      msg += `   👤 المكلف: ${sec.actionAssignee} | 📅 الإنجاز: ${sec.actionDueDate || 'أسبوع'}\n`;
    }
    if (sec.tags && sec.tags.length > 0) {
      msg += `   🏷️ ${sec.tags.join('، ')}\n`;
    }
    if (sec.notes) {
      msg += `   📝 ${sec.notes}\n`;
    }
  });

  msg += `\n_تم إعداد وتوثيق التقرير ميدانياً عبر منصة SAMX-VM_`;

  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent || '');
  
  // استخدام المشاركة الأصلية في الجوال إن كانت مدعومة
  if (navigator.share && isMobile) {
    try {
      await navigator.share({
        title: `تقرير SAMX-VM: ${currentAudit.branchName || 'العرض المرئي'}`,
        text: msg
      });
      showToast('تمت مشاركة التقرير بنجاح عبر الجوال', 'success');
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return; // المستخدم أغلق نافذة المشاركة بنفسه
      }
      console.warn('Native share failed, falling back to WhatsApp link:', err);
    }
  }

  // التوجيه المباشر لتطبيق واتساب في الجوال أو واتساب ويب في أجهزة الكمبيوتر
  const encoded = encodeURIComponent(msg);
  const targetUrl = isMobile 
    ? `whatsapp://send?text=${encoded}` 
    : `https://api.whatsapp.com/send?text=${encoded}`;

  try {
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
    }, 150);
    showToast('جاري توجيه التقرير إلى تطبيق واتساب... 💬', 'info');
  } catch (e) {
    // في حال تعذر تشغيل الرابط البروتوكولي، استخدام واجهة ويب واتساب
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  }
}

export function setupNetworkStatusListener() {
  const updateNetBadge = () => {
    const badge = document.getElementById('net-status-badge');
    const text = document.getElementById('net-status-text');
    if (!badge || !text) return;
    if (navigator.onLine) {
      badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400";
      text.innerText = "متصل • جاهز أوفلاين";
    } else {
      badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/30 text-amber-400";
      text.innerText = "يعمل محلياً (Offline)";
    }
  };

  window.addEventListener('online', updateNetBadge);
  window.addEventListener('offline', updateNetBadge);
  updateNetBadge();
}

// جسر التوافق الشامل للنطاق العام (Zero Regression Global Bridge)
if (typeof window !== 'undefined') {
  window.showModal = showModal;
  window.hideModal = hideModal;
  window.addNewSection = addNewSection;
  window.createSection = addNewSection;
  window.addSection = addNewSection;
  window.wireButtonListeners = wireButtonListeners;
  window.bindMetaInputs = bindMetaInputs;
  window.handleBranchSelectChange = handleBranchSelectChange;
  window.handleSpecialistSelectChange = handleSpecialistSelectChange;
  window.toggleMetaCollapse = toggleMetaCollapse;
  window.toggleInlineManagement = toggleInlineManagement;
  window.openInlineManagement = openInlineManagement;
  window.closeInlineManagement = closeInlineManagement;
  window.addInlineEntity = addInlineEntity;
  window.deleteInlineEntity = deleteInlineEntity;
  window.openManagementModal = openManagementModal;
  window.closeManagementModal = closeManagementModal;
  window.switchManagementTab = switchManagementTab;
  window.submitAddEntity = submitAddEntity;
  window.updateManagementCloudIndicator = updateManagementCloudIndicator;
  window.addEntity = addEntity;
  window.deleteEntity = deleteEntity;
  window.openEntryModal = openEntryModal;
  window.closeEntryModal = closeEntryModal;
  window.resetModalFields = resetModalFields;
  window.handleSectionTypeChange = handleSectionTypeChange;
  window.toggleModalTag = toggleModalTag;
  window.toggleChecklistItem = toggleChecklistItem;
  window.insertChecklistToNotes = insertChecklistToNotes;
  window.setQuickAssignee = setQuickAssignee;
  window.setQuickDueDate = setQuickDueDate;
  window.setModalStatus = setModalStatus;
  window.processImageFile = processImageFile;
  window.clearModalImage = clearModalImage;
  window.saveSectionEntry = saveSectionEntry;
  window.editSectionEntry = editSectionEntry;
  window.deleteSectionEntry = deleteSectionEntry;
  window.moveSection = moveSection;
  window.toggleCardViewMode = toggleCardViewMode;
  window.updateSliderPosition = updateSliderPosition;
  window.openAnnotatorFromModal = openAnnotatorFromModal;
  window.openAnnotatorForSection = openAnnotatorForSection;
  window.initCanvasAnnotator = initCanvasAnnotator;
  window.setAnnotatorTool = setAnnotatorTool;
  window.annotatorUndo = annotatorUndo;
  window.annotatorClear = annotatorClear;
  window.saveAnnotationResult = saveAnnotationResult;
  window.closeAnnotatorModal = closeAnnotatorModal;
  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;
  window.validateAuditQuality = validateAuditQuality;
  window.closeValidationModal = closeValidationModal;
  window.confirmProceedAnyway = confirmProceedAnyway;
  window.switchTab = switchTab;
  window.initSpeechRecognition = initSpeechRecognition;
  window.toggleVoiceDictation = toggleVoiceDictation;
  window.stopVoiceDictation = stopVoiceDictation;
  window.confirmResetReport = confirmResetReport;
  window.exportJsonBackup = exportJsonBackup;
  window.importJsonBackup = importJsonBackup;
  window.toggleReportFooter = toggleReportFooter;
  window.printReport = printReport;
  window.exportAuditToPptx = exportAuditToPptx;
  window.exportPptxReport = exportPptxReport;
  window.exportAuditToPptxA4 = exportAuditToPptxA4;
  window.exportPptxA4Report = exportPptxA4Report;
  window.downloadPrebuiltA4Pptx = downloadPrebuiltA4Pptx;
  window.shareWhatsAppSummary = shareWhatsAppSummary;
  window.setupNetworkStatusListener = setupNetworkStatusListener;
  window.openSectionManagerModal = openSectionManagerModal;
  window.closeSectionManagerModal = closeSectionManagerModal;
  window.selectManagerSection = selectManagerSection;
  window.submitAddStoreSection = submitAddStoreSection;
  window.toggleInlineAddSection = toggleInlineAddSection;
  window.promptRenameSection = promptRenameSection;
  window.confirmDeleteStoreSection = confirmDeleteStoreSection;
  window.openInlineAddStandard = openInlineAddStandard;
  window.closeInlineAddStandard = closeInlineAddStandard;
  window.submitAddStandard = submitAddStandard;
  window.openEditStandardModal = openEditStandardModal;
  window.confirmDeleteStandard = confirmDeleteStandard;
  window.confirmResetStandards = confirmResetStandards;
  window.toggleInlineAddTag = toggleInlineAddTag;
  window.submitAddQuickTag = submitAddQuickTag;
  window.confirmDeleteQuickTag = confirmDeleteQuickTag;
  window.openEditQuickTag = openEditQuickTag;
  window.confirmResetQuickTags = confirmResetQuickTags;
  window.toggleInlineAddAssignee = toggleInlineAddAssignee;
  window.submitAddQuickAssignee = submitAddQuickAssignee;
  window.confirmDeleteQuickAssignee = confirmDeleteQuickAssignee;
  window.openEditQuickAssignee = openEditQuickAssignee;
  window.confirmResetQuickAssignees = confirmResetQuickAssignees;
  window.renderQuickTagsList = renderQuickTagsList;
  window.renderQuickAssigneesList = renderQuickAssigneesList;
  window.openBrandingModal = openBrandingModal;
  window.closeBrandingModal = closeBrandingModal;
  window.handleBrandingLogoUpload = handleBrandingLogoUpload;
  window.removeBrandingLogo = removeBrandingLogo;
  window.saveBrandingFromModal = saveBrandingFromModal;
  window.resetBrandingToDefault = resetBrandingToDefault;
  window.setupBrandingRealtimeListeners = setupBrandingRealtimeListeners;
  window.exportAuditToPdf = exportAuditToPdf;
  window.exportPdfReport = exportPdfReport;
  window.initSplashScreen = initSplashScreen;
  window.dismissSplashScreen = dismissSplashScreen;
  window.replaySplashScreen = replaySplashScreen;
  window.setModalLayoutType = setModalLayoutType;
  window.setImageAlign = setImageAlign;
  window.updateImageConfigFromUI = updateImageConfigFromUI;
  window.syncImageControlsUI = syncImageControlsUI;
  window.resetImageConfig = resetImageConfig;
  window.applyImageConfigToPreview = applyImageConfigToPreview;
  window.archiveCurrentAuditToStorage = archiveCurrentAuditToStorage;
  window.uploadJsonToArchive = uploadJsonToArchive;
  window.toggleSelectAllArchivedAudits = toggleSelectAllArchivedAudits;
  window.confirmDeleteArchivedAudit = confirmDeleteArchivedAudit;
  window.loadArchivedAuditToEditor = loadArchivedAuditToEditor;
  window.downloadSingleArchivedAuditJson = downloadSingleArchivedAuditJson;
  window.confirmResetArchivedAudits = confirmResetArchivedAudits;
  window.renderBulkExportUI = renderBulkExportUI;
  window.updateBulkExportSelectionCounter = updateBulkExportSelectionCounter;
  window.openArchivedAuditPreview = openArchivedAuditPreview;
  window.closeArchivedAuditPreview = closeArchivedAuditPreview;
  window.exportBulkMonthlyAuditPdf = exportBulkMonthlyAuditPdf;
  window.exportBulkSelectedJson = exportBulkSelectedJson;
  window.setImageAlign = setImageAlign;
  window.updateImageConfigFromUI = updateImageConfigFromUI;
  window.syncImageControlsUI = syncImageControlsUI;
  window.resetImageConfig = resetImageConfig;
  window.applyImageConfigToPreview = applyImageConfigToPreview;
  window.shareWhatsAppSummary = shareWhatsAppSummary;
  window.bootApp = bootApp;
}

// بدء التشغيل التلقائي عند جاهزية المستند
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
