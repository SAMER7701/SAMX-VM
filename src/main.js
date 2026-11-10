/**
 * SAMX-VM Main Controller & Boot Layer
 * Version: 1.7.0
 * Architecture: ES Modules Coordinator
 */

import { analyzeTourWithAI, proofreadText } from './smartAuditor.js';

import {
  APP_VERSION,
  currentAudit,
  metadataCache,
  modalState,
  STATUS_MAP,
  calculateReadinessScore,
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
  initStorageEngine,
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
  autoMigrateActiveTourToArchive,
  addAuditsToArchive,
  deleteArchivedAudit,
  getArchivedAuditById,
  resetArchivedAuditsToDefault,
  DEFAULT_STATUS_SUB_OPTIONS,
  getStatusSubOptions,
  addStatusSubOption,
  deleteStatusSubOption,
  resetStatusSubOptions,
  getSectionStatuses,
  getSectionSubOptions,
  STORAGE_KEY_USERS_REGISTRY
} from './store.js';

import { optimizeImage } from './imageOptimizer.js';

import {
  getActiveAuthSession,
  saveActiveAuthSession,
  clearActiveAuthSession,
  authenticateWithCredentials,
  isBiometricAuthSupported,
  getRegisteredBiometricCredential,
  registerDeviceBiometric,
  authenticateWithDeviceBiometric,
  applyUserRolePermissions,
  syncUserHeaderUI,
  getUsersRegistry
} from './auth.js';

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
  populateBranchSelect,
  populateSpecialistSelect,
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
  renderTeamManagementUI,
  updateBulkExportSelectionCounter,
  openArchivedAuditPreview,
  closeArchivedAuditPreview,
  cleanSummaryPointText,
  formatSummaryPointHtml
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

// ==================== إدارة بوابة الدخول والترحيب البيومترية المتطورة (Two-Stage Welcome & Biometric Login) ====================

export function syncBiometricStatusUI() {
  const label = document.getElementById('biometric-status-label');
  if (!label) return;

  const isSupported = isBiometricAuthSupported();
  const registered = getRegisteredBiometricCredential();

  if (!isSupported) {
    label.innerText = 'المصادقة البيومترية غير مدعومة';
  } else if (registered && registered.username) {
    label.innerText = `الدخول السريع ببصمة (${registered.username})`;
  } else {
    label.innerText = 'الدخول السريع ببصمة الجهاز';
  }
}

/**
 * إدارة تكييف لوحة المفاتيح الذكية لشاشة الدخول على أجهزة الجوال
 * (Smart Mobile Keyboard-Focus Adaptation - v1.7.0)
 * يطوي الترويسة والشعار فقط لتحرير المساحة الرأسية مع إبقاء زر البصمة وتذكرني ظاهراً ومتاحاً بالكامل
 */
export function initLoginKeyboardAdaptation() {
  const loginForm = document.getElementById('login-form');
  const splash = document.getElementById('samx-splash');
  const loginCard = document.getElementById('login-portal-card') || document.querySelector('.login-card');
  if (!loginForm) return;

  if (loginForm._keyboardAdapted) return;
  loginForm._keyboardAdapted = true;

  let blurTimeout = null;

  const isMobileViewport = () => {
    return window.innerWidth <= 768 || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  };

  const handleFocusIn = (e) => {
    if (!isMobileViewport()) return;
    const target = e?.target;
    // التأكد أن التركيز تم صراحة على حقل نص أو كلمة مرور وليس على عناصر التحكم الأخرى
    if (target && target.type !== 'text' && target.type !== 'password') return;

    if (blurTimeout) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }

    if (splash) splash.classList.add('keyboard-active');
    document.body.classList.add('keyboard-active');

    // ضمان ظهور الحقل وبطاقة الدخول في مساحة الرؤية بأريحية دون حاجة للتمرير اليدوي
    requestAnimationFrame(() => {
      try {
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (loginCard) {
          loginCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {}
    });
  };

  const handleFocusOut = () => {
    if (!isMobileViewport()) return;
    if (blurTimeout) clearTimeout(blurTimeout);

    blurTimeout = setTimeout(() => {
      const activeEl = document.activeElement;
      // إذا كان التركيز ما زال داخل نموذج الدخول (مثلاً الانتقال من حقل المستخدم لكلمة المرور) نبقي على الوضع
      if (loginForm && activeEl && loginForm.contains(activeEl)) {
        return;
      }

      if (splash) splash.classList.remove('keyboard-active');
      document.body.classList.remove('keyboard-active');
    }, 120);
  };

  // استماع لحدثي focusin و focusout لفقاعة الحدث (Event Bubbling)
  loginForm.addEventListener('focusin', handleFocusIn);
  loginForm.addEventListener('focusout', handleFocusOut);

  // ربط صريح بالحقول (#login-username, #login-password, #username, #password)
  const inputSelectors = ['#login-username', '#login-password', '#username', '#password'];
  inputSelectors.forEach(sel => {
    const inp = document.querySelector(sel);
    if (inp) {
      inp.addEventListener('focus', handleFocusIn);
      inp.addEventListener('blur', handleFocusOut);
    }
  });

  // استعادة العرض الطبيعي إذا تغيرت أبعاد الشاشة إلى سطح المكتب
  window.addEventListener('resize', () => {
    if (!isMobileViewport()) {
      if (splash) splash.classList.remove('keyboard-active');
      document.body.classList.remove('keyboard-active');
    }
  }, { passive: true });
}

/**
 * إدارة وتفعيل ميزة "تذكرني" لحفظ اسم المستخدم محلياً لتسريع تسجيل الدخول
 * (Remember Me Feature - v1.7.0)
 */
export function initRememberMe() {
  try {
    const rememberMeCheckbox = document.getElementById('login-remember-me');
    const usernameInput = document.getElementById('login-username');
    if (!rememberMeCheckbox || !usernameInput) return;

    const isRemembered = localStorage.getItem('samx_remember_me') === 'true';
    const rememberedUsername = localStorage.getItem('samx_remembered_username') || '';

    rememberMeCheckbox.checked = isRemembered;
    if (isRemembered && rememberedUsername) {
      usernameInput.value = rememberedUsername;
    }
  } catch (e) {
    console.warn('initRememberMe error:', e);
  }
}

export function initSplashScreen() {
  const splash = document.getElementById('samx-splash');
  if (!splash) return;

  try {
    initLoginKeyboardAdaptation();
  } catch (e) {}

  if (splash._dismissTimer) {
    clearTimeout(splash._dismissTimer);
    splash._dismissTimer = null;
  }

  const session = getActiveAuthSession();

  // الحالة 1: المستخدم مسجل دخوله بالفعل مسبقاً خلال هذه الجلسة
  if (session) {
    applyUserRolePermissions(session);
    syncUserHeaderUI(session);

    // ترحيب سينمائي هادئ لمدة 2.0 ثانية ثم دخول التطبيق مباشرة
    splash.classList.remove('is-login-mode');
    splash._dismissTimer = setTimeout(() => {
      dismissSplashScreen();
    }, 2000);
    return;
  }

  // الحالة 2: المستخدم غير مسجل دخوله
  // المرحلة 1: عرض الشاشة الترحيبية السينمائية الفاخرة لمدة 2.0 ثانية
  splash.classList.remove('is-login-mode');
  splash._dismissTimer = setTimeout(() => {
    // المرحلة 2: التحول السلس في نفس الشاشة إلى بوابة تسجيل الدخول والبصمة
    // إظهار الشاشة بحالتها الكاملة الطبيعية بدون أي تركيز تلقائي مزعج للكيبورد
    splash.classList.add('is-login-mode');
    syncBiometricStatusUI();
    initRememberMe();
  }, 2000);
}

export function dismissSplashScreen() {
  const splash = document.getElementById('samx-splash');
  document.body.classList.remove('keyboard-active');
  if (splash) splash.classList.remove('keyboard-active');
  if (!splash) return;

  if (splash._dismissTimer) {
    clearTimeout(splash._dismissTimer);
    splash._dismissTimer = null;
  }

  splash.classList.add('hide');
  setTimeout(() => {
    try {
      splash.style.display = 'none';
    } catch(e) {}
  }, 600);
}

export function replaySplashScreen() {
  let splash = document.getElementById('samx-splash');
  if (!splash) return;

  if (splash._dismissTimer) {
    clearTimeout(splash._dismissTimer);
    splash._dismissTimer = null;
  }

  splash.style.display = 'flex';
  splash.classList.remove('hide', 'is-login-mode');

  const session = getActiveAuthSession();
  if (session) {
    // إذا كان مسجلاً للدخول، يتم فقط عرض الشعار الترحيبي والتلاشي التلقائي
    splash._dismissTimer = setTimeout(() => {
      dismissSplashScreen();
    }, 2200);
  } else {
    initSplashScreen();
  }
}

export async function handleLoginSubmit() {
  const usernameInp = document.getElementById('login-username');
  const passwordInp = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error-msg');
  const card = document.getElementById('login-portal-card');

  const username = usernameInp ? usernameInp.value : '';
  const password = passwordInp ? passwordInp.value : '';

  const authResult = await authenticateWithCredentials(username, password);

  if (authResult.success) {
    try {
      const rememberCheckbox = document.getElementById('login-remember-me');
      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('samx_remember_me', 'true');
        localStorage.setItem('samx_remembered_username', username);
      } else {
        localStorage.setItem('samx_remember_me', 'false');
        localStorage.removeItem('samx_remembered_username');
      }
    } catch (e) {}

    if (errorMsg) {
      errorMsg.innerText = '';
      errorMsg.classList.add('hidden');
    }
    applyUserRolePermissions(authResult.user);
    syncUserHeaderUI(authResult.user);
    populateBranchSelect();
    populateSpecialistSelect();
    showToast(`✅ مرحباً بك! تم تسجيل الدخول بنجاح (${authResult.user.displayName})`, 'success');
    dismissSplashScreen();
  } else {
    if (errorMsg) {
      errorMsg.innerText = authResult.message || 'بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور';
      errorMsg.classList.remove('hidden');
    }
    if (card) {
      card.classList.remove('login-shake');
      void card.offsetWidth; // إعادة تشغيل اهتزاز الخطأ
      card.classList.add('login-shake');
    }
    if (passwordInp) {
      passwordInp.focus();
      passwordInp.select();
    }
  }
}

export async function handleBiometricLogin() {
  const btn = document.getElementById('biometric-login-btn');
  const ring = btn?.querySelector('.biometric-scanner-ring');

  if (ring) {
    ring.style.borderColor = '#06b6d4';
    ring.style.boxShadow = '0 0 35px #06b6d4';
  }

  const result = await authenticateWithDeviceBiometric();

  if (result.success) {
    if (ring) {
      ring.style.borderColor = '#10b981';
      ring.style.boxShadow = '0 0 45px #10b981';
    }
    applyUserRolePermissions(result.user);
    syncUserHeaderUI(result.user);
    populateBranchSelect();
    populateSpecialistSelect();
    showToast(`✅ مرحباً بك! تم التحقق من بصمة الجهاز بنجاح (${result.user.displayName})`, 'success');
    setTimeout(() => {
      dismissSplashScreen();
    }, 350);
  } else {
    if (ring) {
      ring.style.borderColor = '';
      ring.style.boxShadow = '';
    }
    if (result.reason === 'not_enrolled') {
      showToast('يرجى تسجيل الدخول بكلمة المرور أولاً لتفعيل البصمة على هذا الجهاز', 'info');
      const userInp = document.getElementById('login-username');
      if (userInp) userInp.focus();
    } else {
      showToast(result.message || 'فشل التحقق من البصمة البيومترية', 'error');
    }
  }
}

export async function promptRegisterBiometric() {
  const session = getActiveAuthSession();
  if (!session) {
    showToast('يرجى تسجيل الدخول أولاً قبل ربط البصمة', 'warning');
    return;
  }

  showToast('جاري استدعاء مستشعر البصمة على جهازك للربط...', 'info');
  const result = await registerDeviceBiometric(session);

  if (result.success) {
    showToast('✅ تم ربط بصمة هذا الجهاز بنجاح! يمكنك الآن تسجيل الدخول السريع بلمسة واحدة.', 'success');
    syncUserHeaderUI(session);
    syncBiometricStatusUI();
    const modal = document.getElementById('user-settings-modal');
    if (modal && modal.style.display !== 'none') {
      openUserSettingsModal();
    }
  } else {
    showToast(result.message || 'تعذر ربط البصمة البيومترية', 'error');
  }
}

export function lockOrLogoutSession() {
  if (!confirm('هل ترغب في قفل الشاشة وتسجيل الخروج؟')) return;

  clearActiveAuthSession();
  syncUserHeaderUI(null);

  const modal = document.getElementById('user-settings-modal');
  if (modal) modal.style.display = 'none';

  const splash = document.getElementById('samx-splash');
  if (splash) {
    splash.style.display = 'flex';
    splash.classList.remove('hide');
    splash.classList.add('is-login-mode');

    const passInp = document.getElementById('login-password');
    if (passInp) passInp.value = '';
    const errorMsg = document.getElementById('login-error-msg');
    if (errorMsg) errorMsg.classList.add('hidden');

    syncBiometricStatusUI();
    initRememberMe();
  }

  showToast('تم قفل الشاشة بنجاح. بيانات التدقيق محفوظة بأمان 🔒', 'info');
}

export function openUserSettingsModal() {
  const modal = document.getElementById('user-settings-modal');
  if (!modal) return;

  const session = getActiveAuthSession();
  if (!session) {
    showToast('لا توجد جلسة مستخدم نشطة حالياً', 'warning');
    return;
  }

  const nameEl = document.getElementById('user-settings-name');
  const userEl = document.getElementById('user-settings-username');
  const roleEl = document.getElementById('user-settings-role-badge');
  const branchesEl = document.getElementById('user-settings-branches');
  const avatarEl = document.getElementById('user-settings-avatar');
  const bioStatusEl = document.getElementById('user-settings-biometric-status');
  const bioBtnText = document.getElementById('user-settings-bind-btn-text');

  if (nameEl) nameEl.textContent = session.displayName || session.username;
  if (userEl) userEl.textContent = `@${session.username}`;

  if (roleEl) {
    if (session.role === 'admin') {
      roleEl.textContent = 'مدير النظام الفائق (Super Admin)';
      roleEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-gold-500/20 text-gold-300 border border-gold-500/40';
    } else {
      roleEl.textContent = 'أخصائي الـ VM (Specialist)';
      roleEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40';
    }
  }

  if (avatarEl) {
    avatarEl.textContent = session.role === 'admin' ? '👑' : '👤';
  }

  if (branchesEl) {
    if (session.role === 'admin') {
      const bList = getBranches();
      branchesEl.textContent = `جميع فروع المملكة (${bList.length} فرعاً)`;
    } else if (Array.isArray(session.assignedBranches) && session.assignedBranches.includes('*')) {
      branchesEl.textContent = 'جميع فروع المملكة';
    } else if (Array.isArray(session.assignedBranches) && session.assignedBranches.length > 0) {
      branchesEl.textContent = `${session.assignedBranches.length} فروع مخصصة (${session.assignedBranches.slice(0, 2).join('، ')}${session.assignedBranches.length > 2 ? '...' : ''})`;
    } else {
      branchesEl.textContent = 'لم يتم تخصيص فروع بعد';
    }
  }

  if (bioStatusEl) {
    const isSupported = isBiometricAuthSupported();
    if (!isSupported) {
      bioStatusEl.textContent = 'غير مدعوم بالجهاز';
      bioStatusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400';
      if (bioBtnText) bioBtnText.textContent = 'المتصفح أو الجهاز لا يدعم WebAuthn';
    } else {
      const cred = getRegisteredBiometricCredential();
      const isLinked = cred && cred.username === session.username;
      if (isLinked) {
        bioStatusEl.textContent = 'مفعل ومربوط ✅';
        bioStatusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        if (bioBtnText) bioBtnText.textContent = 'تحديث / إعادة ربط البصمة';
      } else {
        bioStatusEl.textContent = 'غير مربوط ⚠️';
        bioStatusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
        if (bioBtnText) bioBtnText.textContent = 'تفعيل / ربط بصمة هذا الجهاز (WebAuthn)';
      }
    }
  }

  modal.style.display = 'flex';
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons(); } catch(e){}
  }
}

export function closeUserSettingsModal() {
  const modal = document.getElementById('user-settings-modal');
  if (modal) modal.style.display = 'none';
}

// تشغيل التطبيق بحصانة تامة ودعم لكافة حالات الجاهزية
export async function bootApp() {
  try { initSplashScreen(); } catch(e) {}

  // 0. تهيئة محرك التخزين الفائق IndexedDB وهجرة وتنظيف مساحة التخزين المحلي فوراً
  try {
    await initStorageEngine();
  } catch (idbErr) {
    console.warn('Boot IndexedDB init error:', idbErr);
  }

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
  try { autoMigrateActiveTourToArchive(); } catch(e) {}
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
    toggleReportFooter();

    const session = getActiveAuthSession();
    if (session) {
      applyUserRolePermissions(session);
      syncUserHeaderUI(session);
    }

    // 3. تفعيل وإعداد نمط التشغيل المستقل والتثبيت PWA
    initPWAInstallation();
  } catch (e) {
    console.warn('Boot UI refresh error:', e);
  }
}

// ربط الحقول بالبيانات وتفعيل التحديث الحي
export function bindMetaInputs() {
  refreshMainSelects();

  const dateInput = document.getElementById('input-date');
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
  const body = document.getElementById('meta-card-body');
  const grid = document.getElementById('meta-inputs-grid');
  const kpis = document.getElementById('meta-kpis-container');
  const header = document.getElementById('meta-card-header');
  const icon = document.getElementById('meta-collapse-icon');

  if (body) {
    body.classList.toggle('hidden');
    const isCollapsed = body.classList.contains('hidden');
    if (header) {
      if (isCollapsed) {
        header.classList.remove('mb-4', 'pb-3', 'border-b');
      } else {
        header.classList.add('mb-4', 'pb-3', 'border-b');
      }
    }
  } else {
    if (grid) grid.classList.toggle('hidden');
    if (kpis) kpis.classList.toggle('hidden');
  }

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
  const btnDual = document.getElementById('layout-btn-dual_panorama');
  const btnSingle = document.getElementById('layout-btn-single_panorama');
  const btnStacked = document.getElementById('layout-btn-stacked_panorama');

  const activeCls = "px-2 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition bg-gold-500 text-slate-950 border-gold-400 shadow";
  const inactiveCls = "px-2 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition bg-corp-950 text-slate-300 border-corp-700 hover:text-white";

  if (btnComparison) btnComparison.className = (layoutType === 'comparison') ? activeCls : inactiveCls;
  if (btnDual) btnDual.className = (layoutType === 'dual_panorama') ? activeCls : inactiveCls;
  if (btnSingle) btnSingle.className = (layoutType === 'single_panorama') ? activeCls : inactiveCls;
  if (btnStacked) btnStacked.className = (layoutType === 'stacked_panorama') ? activeCls : inactiveCls;

  const customTitleWrapper = document.getElementById('wrapper-custom-panorama-title');
  if (customTitleWrapper) {
    if (layoutType === 'dual_panorama' || layoutType === 'single_panorama' || layoutType === 'stacked_panorama') {
      customTitleWrapper.classList.remove('hidden');
    } else {
      customTitleWrapper.classList.add('hidden');
    }
  }

  const orientationWrapper = document.getElementById('wrapper-dual-panorama-orientation');
  if (orientationWrapper) {
    if (layoutType === 'dual_panorama') {
      orientationWrapper.classList.remove('hidden');
    } else {
      orientationWrapper.classList.add('hidden');
    }
  }

  const colBefore = document.getElementById('col-wrapper-before');
  const boxBefore = document.getElementById('box-wrapper-before');
  const boxAfter = document.getElementById('box-wrapper-after');
  const badgeLabelBefore = document.getElementById('badge-label-before');
  const badgeTextBefore = document.getElementById('badge-text-before');
  const badgeLabelAfter = document.getElementById('badge-label-after');
  const badgeTextAfter = document.getElementById('badge-text-after');
  const placeholderTitleAfter = document.getElementById('placeholder-title-after');
  const placeholderSubAfter = document.getElementById('placeholder-sub-after');
  const placeholderTitleBefore = document.querySelector('#placeholder-before .text-rose-300');
  const placeholderSubBefore = document.querySelector('#placeholder-before .text-slate-400');
  const imagesContainer = document.getElementById('modal-images-container');

  if (layoutType === 'dual_panorama') {
    // العرض البانورامي المزدوج (Dual Panorama): بدون تقييد Before/After
    if (colBefore) colBefore.classList.remove('hidden');
    if (boxBefore) boxBefore.classList.remove('hidden');
    if (boxAfter) boxAfter.classList.remove('hidden');
    if (imagesContainer) {
      imagesContainer.classList.remove('grid-cols-1');
      imagesContainer.classList.add('grid-cols-2');
    }
    if (badgeLabelBefore) {
      badgeLabelBefore.className = 'inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-sm text-[10px] font-bold tracking-wide select-none';
    }
    if (badgeTextBefore) badgeTextBefore.innerText = 'بانوراما 1 (View 1)';
    
    if (badgeLabelAfter) {
      badgeLabelAfter.className = 'inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-sm text-[10px] font-bold tracking-wide select-none';
    }
    if (badgeTextAfter) badgeTextAfter.innerText = 'بانوراما 2 (View 2)';

    if (placeholderTitleBefore) placeholderTitleBefore.innerText = 'صورة بانورامية 1';
    if (placeholderSubBefore) placeholderSubBefore.innerText = 'عرض بانورامي من زاوية أولى';
    if (placeholderTitleAfter) placeholderTitleAfter.innerText = 'صورة بانورامية 2';
    if (placeholderSubAfter) placeholderSubAfter.innerText = 'عرض بانورامي من زاوية ثانية';
  } else if (layoutType === 'single_panorama') {
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
    if (badgeLabelBefore) {
      badgeLabelBefore.className = 'inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#881337] text-white border border-[#ef4444] shadow-sm text-[10px] font-bold tracking-wide select-none';
    }
    if (badgeTextBefore) badgeTextBefore.innerText = 'Before';
    if (badgeTextAfter) badgeTextAfter.innerText = 'After';
    if (badgeLabelAfter) {
      badgeLabelAfter.className = 'inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#064e3b] text-white border border-[#10b981] shadow text-[10px] font-bold tracking-wide select-none';
    }
    if (placeholderTitleBefore) placeholderTitleBefore.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubBefore) placeholderSubBefore.innerText = 'بانوراما علوية (قبل التعديل)';
    if (placeholderTitleAfter) placeholderTitleAfter.innerText = 'كاميرا أو من المعرض';
    if (placeholderSubAfter) placeholderSubAfter.innerText = 'بانوراما سفلية (بعد التعديل)';
  } else {
    // Comparison (مقارنة جانبية جنباً إلى جنب: قبل وبعد)
    if (colBefore) colBefore.classList.remove('hidden');
    if (boxBefore) boxBefore.classList.remove('hidden');
    if (boxAfter) boxAfter.classList.remove('hidden');
    if (imagesContainer) {
      imagesContainer.classList.remove('grid-cols-1');
      imagesContainer.classList.add('grid-cols-2');
    }
    if (badgeLabelBefore) {
      badgeLabelBefore.className = 'inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#881337] text-white border border-[#ef4444] shadow-sm text-[10px] font-bold tracking-wide select-none';
    }
    if (badgeTextBefore) badgeTextBefore.innerText = 'Before';
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

export function setModalPanoramaOrientation(orientation = 'side_by_side') {
  const hiddenInput = document.getElementById('modal-panorama-orientation');
  if (hiddenInput) hiddenInput.value = orientation;

  const btnSide = document.getElementById('btn-orient-side_by_side');
  const btnStacked = document.getElementById('btn-orient-stacked_vertical');

  const activeCls = 'px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition bg-gold-500 text-slate-950 border-gold-400 shadow cursor-pointer';
  const inactiveCls = 'px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition bg-corp-900 text-slate-300 border-corp-700 hover:text-white cursor-pointer';

  if (btnSide) btnSide.className = (orientation === 'side_by_side') ? activeCls : inactiveCls;
  if (btnStacked) btnStacked.className = (orientation === 'stacked_vertical') ? activeCls : inactiveCls;
}

export function resetModalFields() {
  modalState.tempImgBefore = null;
  modalState.tempImgAfter = null;
  modalState.activeModalTags = [];
  modalState.activeModalChecklist = [];
  modalState.selectedModalStatuses = ['resolved'];
  modalState.selectedModalSubOptions = {
    resolved: ['معالجة كاملة 100%'],
    store_followup: [],
    management_action: []
  };
  modalState.inlineAddSubOptionOpen = {
    resolved: false,
    store_followup: false,
    management_action: false
  };
  syncModalStatusButtonsUI();
  renderStatusSubBars();
  syncFollowupContainerUI();
  setModalLayoutType('comparison');
  setModalPanoramaOrientation('side_by_side');
  
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

  const customPanoTitleInput = document.getElementById('modal-custom-panorama-title');
  if (customPanoTitleInput) customPanoTitleInput.value = '';

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

export function toggleModalStatus(statusKey) {
  if (!Array.isArray(modalState.selectedModalStatuses)) {
    modalState.selectedModalStatuses = modalState.selectedModalStatus ? [modalState.selectedModalStatus] : ['resolved'];
  }
  if (!modalState.selectedModalSubOptions || typeof modalState.selectedModalSubOptions !== 'object') {
    modalState.selectedModalSubOptions = { resolved: [], store_followup: [], management_action: [] };
  }

  const idx = modalState.selectedModalStatuses.indexOf(statusKey);
  if (idx !== -1) {
    // منع إلغاء التحديد إذا كانت هذه هي الحالة الوحيدة النشطة
    if (modalState.selectedModalStatuses.length > 1) {
      modalState.selectedModalStatuses.splice(idx, 1);
    } else {
      showToast('يجب الإبقاء على حالة إجراء واحدة على الأقل نشطة', 'info');
      return;
    }
  } else {
    modalState.selectedModalStatuses.push(statusKey);
    // تفعيل الخيار الافتراضي لـ resolved إذا تم تفعيلها أول مرة
    if (statusKey === 'resolved' && (!modalState.selectedModalSubOptions.resolved || modalState.selectedModalSubOptions.resolved.length === 0)) {
      modalState.selectedModalSubOptions.resolved = ['معالجة كاملة 100%'];
    }
  }

  modalState.selectedModalStatus = modalState.selectedModalStatuses[0] || 'resolved';

  syncModalStatusButtonsUI();
  renderStatusSubBars();
  syncFollowupContainerUI();

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// التوافقية العكسية لدالة setModalStatus
export function setModalStatus(statusKey) {
  if (!Array.isArray(modalState.selectedModalStatuses)) {
    modalState.selectedModalStatuses = [];
  }
  if (!modalState.selectedModalStatuses.includes(statusKey)) {
    modalState.selectedModalStatuses.push(statusKey);
  }
  modalState.selectedModalStatus = statusKey;

  if (statusKey === 'resolved' && (!modalState.selectedModalSubOptions?.resolved || modalState.selectedModalSubOptions.resolved.length === 0)) {
    if (!modalState.selectedModalSubOptions) modalState.selectedModalSubOptions = { resolved: [], store_followup: [], management_action: [] };
    modalState.selectedModalSubOptions.resolved = ['معالجة كاملة 100%'];
  }

  syncModalStatusButtonsUI();
  renderStatusSubBars();
  syncFollowupContainerUI();

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// مزامنة أنماط أزرار الحالات الرئيسية الثلاثة (تحديد متعدد)
export function syncModalStatusButtonsUI() {
  const activeStatuses = Array.isArray(modalState.selectedModalStatuses) ? modalState.selectedModalStatuses : ['resolved'];
  const opts = ['resolved', 'store_followup', 'management_action'];

  opts.forEach(k => {
    const btn = document.getElementById(`status-opt-${k}`);
    if (!btn) return;
    const isActive = activeStatuses.includes(k);

    if (isActive) {
      if (k === 'resolved') {
        btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-emerald-950/90 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500 shadow cursor-pointer select-none";
      } else if (k === 'store_followup') {
        btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-amber-950/90 text-amber-300 border-amber-500 ring-1 ring-amber-500 shadow cursor-pointer select-none";
      } else {
        btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-rose-950/90 text-rose-300 border-rose-500 ring-1 ring-rose-500 shadow cursor-pointer select-none";
      }
    } else {
      btn.className = "status-option px-3 py-2 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 bg-corp-950 text-slate-400 border-corp-700 hover:text-slate-200 cursor-pointer select-none";
    }
  });
}

// مزامنة إظهار حقول المتابعة والتكليف عند تفعيل أي من حالتي المتابعة أو الإدارة
export function syncFollowupContainerUI() {
  const activeStatuses = Array.isArray(modalState.selectedModalStatuses) ? modalState.selectedModalStatuses : ['resolved'];
  const hasFollowup = activeStatuses.includes('store_followup');
  const hasManagement = activeStatuses.includes('management_action');
  const followupWrapper = document.getElementById('action-followup-container');
  const labelEl = document.getElementById('followup-action-label');

  if (!followupWrapper) return;

  if (hasFollowup || hasManagement) {
    followupWrapper.classList.remove('hidden');
    if (labelEl) {
      if (hasFollowup && hasManagement) {
        labelEl.innerHTML = '<i data-lucide="calendar-clock" class="w-4 h-4 text-amber-400"></i><span>بيانات تكليف متابعة الفرع والصيانة / الإدارة:</span>';
      } else if (hasFollowup) {
        labelEl.innerHTML = '<i data-lucide="calendar-clock" class="w-4 h-4 text-amber-400"></i><span>بيانات تكليف متابعة الفرع:</span>';
      } else {
        labelEl.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4 text-rose-400"></i><span>بيانات تكليف الصيانة / الإدارة:</span>';
      }
    }
  } else {
    followupWrapper.classList.add('hidden');
  }

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// تبديل اختيار شريحة خيار فرعي ذكي
export function toggleStatusSubOption(statusKey, optionText) {
  if (!modalState.selectedModalSubOptions) {
    modalState.selectedModalSubOptions = { resolved: [], store_followup: [], management_action: [] };
  }
  if (!Array.isArray(modalState.selectedModalSubOptions[statusKey])) {
    modalState.selectedModalSubOptions[statusKey] = [];
  }

  const list = modalState.selectedModalSubOptions[statusKey];
  const idx = list.indexOf(optionText);
  if (idx !== -1) {
    list.splice(idx, 1);
  } else {
    list.push(optionText);
  }

  renderStatusSubBars();
}

// فتح/إغلاق صندوق إضافة خيار فرعي مخصص
export function toggleInlineAddSubOption(statusKey, forceState = null) {
  if (!modalState.inlineAddSubOptionOpen) {
    modalState.inlineAddSubOptionOpen = { resolved: false, store_followup: false, management_action: false };
  }
  const current = !!modalState.inlineAddSubOptionOpen[statusKey];
  const next = forceState !== null ? forceState : !current;
  modalState.inlineAddSubOptionOpen[statusKey] = next;

  const box = document.getElementById(`inline-add-suboption-box-${statusKey}`);
  const input = document.getElementById(`inline-suboption-input-${statusKey}`);
  if (box) {
    if (next) {
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
}

// حفظ خيار فرعي مخصص جديد
export function submitAddSubOption(statusKey) {
  const input = document.getElementById(`inline-suboption-input-${statusKey}`);
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('يرجى كتابة نص الخيار أولاً', 'error');
    return;
  }

  const res = addStatusSubOption(statusKey, val);
  if (!res.success) {
    showToast(res.reason || 'تعذر إضافة الخيار', 'error');
    return;
  }

  // تفعيله وتحديده تلقائياً
  if (!modalState.selectedModalSubOptions) {
    modalState.selectedModalSubOptions = { resolved: [], store_followup: [], management_action: [] };
  }
  if (!Array.isArray(modalState.selectedModalSubOptions[statusKey])) {
    modalState.selectedModalSubOptions[statusKey] = [];
  }
  if (!modalState.selectedModalSubOptions[statusKey].includes(val)) {
    modalState.selectedModalSubOptions[statusKey].push(val);
  }

  toggleInlineAddSubOption(statusKey, false);
  renderStatusSubBars();
  showToast(`✨ تمت إضافة وتحديد الخيار "${val}" بنجاح`, 'success');
}

// حذف خيار فرعي مخصص
export function confirmDeleteSubOption(statusKey, optionText, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!confirm(`هل أنت متأكد من حذف الخيار "${optionText}"؟`)) {
    return;
  }

  const res = deleteStatusSubOption(statusKey, optionText);
  if (!res.success) {
    showToast(res.reason || 'تعذر حذف الخيار', 'error');
    return;
  }

  renderStatusSubBars();
  showToast(`🗑️ تم حذف الخيار "${optionText}"`, 'info');
}

// استعادة الخيارات الافتراضية لقائمة محددة
export function confirmResetSubOptions(statusKey) {
  const titles = {
    resolved: 'معالجة ميدانياً',
    store_followup: 'متابعة الفرع',
    management_action: 'صيانة / إدارة'
  };
  if (!confirm(`هل أنت متأكد من استعادة الخيارات الفرعية الافتراضية لقسم [${titles[statusKey] || statusKey}]؟`)) {
    return;
  }

  resetStatusSubOptions(statusKey);
  renderStatusSubBars();
  showToast('🔄 تم استعادة الخيارات الافتراضية بنجاح', 'success');
}

// رسم أشرطة الخيارات الفرعية الذكية لكل حالة رئيسية مفعلة
export function renderStatusSubBars() {
  const container = document.getElementById('status-sub-bars-container');
  if (!container) return;

  const activeStatuses = Array.isArray(modalState.selectedModalStatuses) ? modalState.selectedModalStatuses : ['resolved'];
  const allSubOptions = getStatusSubOptions();

  if (activeStatuses.length === 0) {
    container.innerHTML = '';
    return;
  }

  const statusConfigs = {
    resolved: {
      key: 'resolved',
      label: 'تفاصيل المعالجة الميدانية',
      icon: 'check-circle-2',
      borderClass: 'border-emerald-500/40 bg-emerald-950/40',
      headerTextClass: 'text-emerald-400',
      chipActiveClass: 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm',
      chipInactiveClass: 'bg-corp-900 text-emerald-300 border-emerald-800/60 hover:border-emerald-500/60',
      addBtnClass: 'border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
      tagColor: 'emerald'
    },
    store_followup: {
      key: 'store_followup',
      label: 'تفاصيل ومطلوبات متابعة المعرض',
      icon: 'clock',
      borderClass: 'border-amber-500/40 bg-amber-950/40',
      headerTextClass: 'text-amber-400',
      chipActiveClass: 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm',
      chipInactiveClass: 'bg-corp-900 text-amber-300 border-amber-800/60 hover:border-amber-500/60',
      addBtnClass: 'border-amber-500/40 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
      tagColor: 'amber'
    },
    management_action: {
      key: 'management_action',
      label: 'تفاصيل ومطلوبات الصيانة / الإدارة',
      icon: 'alert-triangle',
      borderClass: 'border-rose-500/40 bg-rose-950/40',
      headerTextClass: 'text-rose-400',
      chipActiveClass: 'bg-rose-500 text-slate-950 font-bold border-rose-400 shadow-sm',
      chipInactiveClass: 'bg-corp-900 text-rose-300 border-rose-800/60 hover:border-rose-500/60',
      addBtnClass: 'border-rose-500/40 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
      tagColor: 'rose'
    }
  };

  let html = '';

  activeStatuses.forEach(statusKey => {
    const cfg = statusConfigs[statusKey];
    if (!cfg) return;

    const availableOptions = allSubOptions[statusKey] || [];
    const selectedList = modalState.selectedModalSubOptions?.[statusKey] || [];
    const isBoxOpen = !!modalState.inlineAddSubOptionOpen?.[statusKey];

    html += `
      <div class="rounded-xl border ${cfg.borderClass} p-2.5 space-y-2 transition-all duration-200">
        <!-- ترويسة الشريط الفرعي -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[11px] font-bold ${cfg.headerTextClass}">
            <i data-lucide="${cfg.icon}" class="w-3.5 h-3.5"></i>
            <span>${cfg.label}:</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="toggleInlineAddSubOption('${statusKey}')" class="text-[10px] ${cfg.headerTextClass} hover:underline font-bold flex items-center gap-0.5" title="إضافة خيار جديد">
              <span>+ إضافة خيار</span>
            </button>
            <span class="text-slate-600 text-[10px]">|</span>
            <button type="button" onclick="confirmResetSubOptions('${statusKey}')" class="text-[10px] text-slate-500 hover:text-slate-300 transition" title="استعادة الخيارات الافتراضية">استعادة</button>
          </div>
        </div>

        <!-- صندوق إضافة خيار مخصص مضمن (Inline Add Sub-option) -->
        <div id="inline-add-suboption-box-${statusKey}" class="${isBoxOpen ? '' : 'hidden'} p-2 rounded-lg bg-corp-950 border ${cfg.borderClass} space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold ${cfg.headerTextClass}">إضافة خيار مخصص جديد:</span>
            <button type="button" onclick="toggleInlineAddSubOption('${statusKey}', false)" class="text-xs text-slate-400 hover:text-white px-1">✕</button>
          </div>
          <div class="flex items-center gap-1.5">
            <input type="text" id="inline-suboption-input-${statusKey}" placeholder="اكتب نص الخيار..." class="flex-1 bg-corp-900 border border-corp-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-gold-500" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitAddSubOption('${statusKey}');}">
            <button type="button" onclick="submitAddSubOption('${statusKey}')" class="px-2.5 py-1 bg-gold-500 hover:bg-gold-400 text-slate-950 text-xs font-bold rounded-lg shrink-0 transition">إضافة وتحديد</button>
          </div>
        </div>

        <!-- شرائح الخيارات الفرعية الذكية (Sub-Chips) -->
        <div class="flex flex-wrap gap-1.5" id="sub-chips-${statusKey}">
          ${availableOptions.map(opt => {
            const isSelected = selectedList.includes(opt);
            const escapedOpt = opt.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `
              <div class="group inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer select-none ${
                isSelected ? cfg.chipActiveClass : cfg.chipInactiveClass
              }">
                <span onclick="toggleStatusSubOption('${statusKey}', '${escapedOpt}')" class="flex-1">
                  ${opt}
                </span>
                <button type="button" onclick="confirmDeleteSubOption('${statusKey}', '${escapedOpt}', event)" title="حذف الخيار" class="w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold opacity-60 hover:opacity-100 hover:bg-rose-500 hover:text-white transition ${
                  isSelected ? 'text-slate-900' : 'text-slate-400'
                }">
                  ×
                </button>
              </div>
            `;
          }).join('')}
          <button type="button" onclick="toggleInlineAddSubOption('${statusKey}', true)" class="text-[11px] px-2 py-1 rounded-lg border border-dashed ${cfg.addBtnClass} font-bold inline-flex items-center gap-1 transition">
            <span>+ خيار جديد</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

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

// ضغط الصور الميدانية الذكي عبر Canvas الفائق (1400px WebP / JPEG 0.78)
export async function processImageFile(event, type) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  showToast('جاري تحسين وضغط الصورة الذكي...', 'info');

  try {
    const result = await optimizeImage(file, 1400, 0.78);
    const compressedDataUrl = result.dataUrl;

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

    const kbSize = Math.round(result.compressedSize / 1024);
    showToast(`تمت إضافة الصورة بنجاح (${kbSize} كيلوبايت - جودة طباعة فائقة 1400px)`, 'success');
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  } catch (err) {
    console.error('processImageFile error:', err);
    showToast('تعذر معالجة الصورة المحددة', 'error');
  }
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
  const customPanoTitleInput = document.getElementById('modal-custom-panorama-title');
  const panoramaTitle = customPanoTitleInput ? customPanoTitleInput.value.trim() : '';
  const customOrientationInput = document.getElementById('modal-panorama-orientation');
  const panoramaOrientation = customOrientationInput ? customOrientationInput.value : 'side_by_side';

  if (!modalState.tempImgBefore && !modalState.tempImgAfter) {
    showToast('يرجى التقاط أو رفع صورة واحدة على الأقل للتسجيل', 'error');
    return;
  }

  const activeStatuses = Array.isArray(modalState.selectedModalStatuses) && modalState.selectedModalStatuses.length > 0
    ? [...modalState.selectedModalStatuses]
    : [modalState.selectedModalStatus || 'resolved'];
  const activeSubOptions = {
    resolved: [...(modalState.selectedModalSubOptions?.resolved || [])],
    store_followup: [...(modalState.selectedModalSubOptions?.store_followup || [])],
    management_action: [...(modalState.selectedModalSubOptions?.management_action || [])]
  };

  const isFollowup = activeStatuses.includes('store_followup') || activeStatuses.includes('management_action');
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
        panoramaTitle: panoramaTitle,
        panoramaOrientation: panoramaOrientation,
        status: activeStatuses[0] || 'resolved',
        statuses: activeStatuses,
        statusSubOptions: activeSubOptions,
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
      panoramaTitle: panoramaTitle,
      panoramaOrientation: panoramaOrientation,
      status: activeStatuses[0] || 'resolved',
      statuses: activeStatuses,
      statusSubOptions: activeSubOptions,
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
  setModalPanoramaOrientation(sec.panoramaOrientation || 'side_by_side');
  const customPanoTitleInput = document.getElementById('modal-custom-panorama-title');
  if (customPanoTitleInput) {
    customPanoTitleInput.value = sec.panoramaTitle || '';
  }
  
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

  // استعادة الحالات والخيارات الفرعية
  const restoredStatuses = getSectionStatuses(sec);
  modalState.selectedModalStatuses = [...restoredStatuses];
  modalState.selectedModalStatus = restoredStatuses[0] || 'resolved';
  modalState.selectedModalSubOptions = {
    resolved: sec.statusSubOptions?.resolved ? [...sec.statusSubOptions.resolved] : (restoredStatuses.includes('resolved') ? ['معالجة كاملة 100%'] : []),
    store_followup: sec.statusSubOptions?.store_followup ? [...sec.statusSubOptions.store_followup] : [],
    management_action: sec.statusSubOptions?.management_action ? [...sec.statusSubOptions.management_action] : []
  };

  syncModalStatusButtonsUI();
  renderStatusSubBars();
  syncFollowupContainerUI();

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

// ==================== معاينة ورقة التقرير الأفقي الغامرة والملاءمة للجوال (LANDSCAPE REPORT LIGHTBOX & FIT ENGINE v1.7.0) ====================
let isMobileFitMode = true; // نمط الملاءمة للشاشة مفعل افتراضياً لمنع إجهاد التمرير الأفقي

export function openReportLightboxModal() {
  const source = document.getElementById('print-sheet-wrapper');
  const target = document.getElementById('report-lightbox-content');
  if (source && target) {
    target.innerHTML = source.innerHTML;
  }
  showModal('report-lightbox-modal');
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export function closeReportLightbox() {
  hideModal('report-lightbox-modal');
  const target = document.getElementById('report-lightbox-content');
  if (target) {
    target.innerHTML = '';
  }
}

export function updatePreviewScale() {
  const outer = document.getElementById('report-preview-scale-wrapper');
  const stage = document.getElementById('report-scale-stage');
  const sheet = document.getElementById('print-sheet-wrapper');
  const badge = document.getElementById('preview-fit-badge');
  const fitLabel = document.getElementById('fit-mode-label');
  const fitIcon = document.getElementById('fit-mode-icon');
  
  if (!outer || !stage || !sheet) return;

  const isMobile = window.innerWidth <= 768;
  
  if (!isMobile || !isMobileFitMode) {
    // وضع العرض الطبيعي بدون تحجيم (Desktop or Full Scroll Mode)
    stage.style.transform = '';
    stage.style.transformOrigin = '';
    stage.style.width = '';
    outer.style.height = '';
    outer.style.overflowX = isMobile ? 'auto' : 'visible';
    if (sheet) {
      if (isMobile) {
        sheet.style.minWidth = '860px';
      } else {
        sheet.style.minWidth = '';
      }
    }
    if (fitLabel) fitLabel.textContent = 'الحجم الطبيعي';
    if (fitIcon) fitIcon.textContent = '🔍';
    if (badge) badge.textContent = isMobile ? 'الحجم الطبيعي 100%' : 'العرض الكامل 100%';
    return;
  }

  // وضع ملاءمة الشاشة للجوال (Fit-to-View): تحجيم ورقة الـ A4 الأفقية بنسبة متناسبة لعرض الشاشة دون تمرير أفقي
  const containerWidth = outer.clientWidth || (window.innerWidth - 24);
  const baseWidth = 860;
  const scale = Math.min(1, Math.max(0.28, containerWidth / baseWidth));
  
  sheet.style.minWidth = `${baseWidth}px`;
  stage.style.width = `${baseWidth}px`;
  stage.style.transformOrigin = 'top center';
  stage.style.transform = `scale(${scale})`;
  
  const sheetHeight = sheet.offsetHeight || 620;
  outer.style.height = `${Math.ceil(sheetHeight * scale)}px`;
  outer.style.overflow = 'hidden';
  
  if (fitLabel) fitLabel.textContent = 'ملاءمة الشاشة';
  if (fitIcon) fitIcon.textContent = '📐';
  if (badge) badge.textContent = `ملاءمة ${Math.round(scale * 100)}%`;
}

export function toggleMobileFitMode() {
  isMobileFitMode = !isMobileFitMode;
  updatePreviewScale();
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

  const views = ['audit', 'preview', 'settings', 'team'];
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
    toggleReportFooter();
    setTimeout(() => {
      updatePreviewScale();
    }, 60);
  } else if (tabId === 'settings') {
    renderBulkExportUI();
  } else if (tabId === 'team') {
    if (typeof window.renderTeamManagementUI === 'function') {
      window.renderTeamManagementUI();
    }
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

/**
 * حفظ أو تحديث الجولة الحالية في سجل الجولات المؤرشفة (Persistent savedTours Archive)
 */
export function saveCurrentTourToArchive(showFeedback = true) {
  if (!currentAudit) return;
  
  // حفظ العمل النشط محلياً أولاً
  saveAuditToStorage();
  
  const result = archiveCurrentAudit();
  if (result.success) {
    renderBulkExportUI();
    if (showFeedback) {
      const bName = result.item?.branchName || currentAudit.branchName || 'المعرض';
      const wNum = result.item?.weekNumber || currentAudit.weekNumber || 1;
      showToast(`تم حفظ الجولة (${bName} - أسبوع ${wNum}) في الأرشيف بنجاح 💾`, 'success');
    }
  } else {
    if (showFeedback) {
      showToast(result.reason || 'تعذر حفظ الجولة في الأرشيف', 'error');
    }
  }
}

/**
 * بدء جولة تدقيق جديدة فارغة مع حفظ الجولة الحالية تلقائياً بعد التأكيد
 */
export function startNewTourPrompt() {
  const branchName = (currentAudit?.branchName || '').trim();
  const sectionsCount = currentAudit?.sections?.length || 0;
  const hasWork = (branchName !== '' && branchName !== 'لم يتم تحديد الفرع') || sectionsCount > 0;

  if (hasWork) {
    if (!confirm('هل تريد حفظ الجولة الحالية وبدء جولة جديدة فارغة؟')) {
      return;
    }
    // حفظ الجولة الحالية تلقائياً في الأرشيف
    saveCurrentTourToArchive(false);
  }

  // توليد معرف جديد فريد وتفريغ بيانات الجولة
  currentAudit.id = 'tour_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  currentAudit.branchName = '';
  currentAudit.sections = [];
  currentAudit.visitSummary = '';
  currentAudit.auditDate = new Date().toISOString().split('T')[0];
  calculateCurrentWeek();

  saveAuditToStorage();
  bindMetaInputs();
  renderAuditCards();
  renderBulkExportUI();
  switchTab('audit');

  showToast('تم حفظ الجولة السابقة وبدء جولة جديدة فارغة بنجاح ➕', 'success');

  setTimeout(() => {
    const branchSelect = document.getElementById('select-branch');
    if (branchSelect) branchSelect.focus();
  }, 100);
}

/**
 * فتح ومعاينة تقرير جولة مؤرشفة مباشرة في نافذة الطباعة وتقرير الـ PDF
 */
export function previewArchivedAudit(id) {
  const archived = getArchivedAuditById(id);
  if (!archived) {
    showToast('تعذر العثور على بيانات الجولة المطلوبة في الأرشيف', 'error');
    return;
  }

  // حفظ العمل النشط أولاً بأمان
  saveAuditToStorage();

  const cloned = JSON.parse(JSON.stringify(archived));
  Object.assign(currentAudit, cloned);
  if (!currentAudit.id) currentAudit.id = cloned.id || ('tour_' + Date.now());

  bindMetaInputs();
  saveAuditToStorage();
  renderAuditCards();
  switchTab('preview');
  showToast(`تم فتح معاينة تقرير (${cloned.branchName || 'المعرض'} - أسبوع ${cloned.weekNumber || 1}) جاهز للطباعة والـ PDF`, 'info');
}

export function archiveCurrentAuditToStorage() {
  saveCurrentTourToArchive(true);
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
  if (!confirm('هل ترغب في تفريغ أرشيف الجولات المحفوظة بالكامل؟')) return;
  resetArchivedAuditsToDefault();
  renderBulkExportUI();
  showToast('تم تفريغ أرشيف الجولات بنجاح', 'info');
}

/**
 * حذف الجولات المحددة فقط من الأرشيف بعد تأكيد المستخدم
 */
export function deleteSelectedArchivedAudits() {
  const checkedBoxes = Array.from(document.querySelectorAll('.bulk-audit-checkbox:checked'));
  if (checkedBoxes.length === 0) {
    showToast('يرجى تحديد جولة واحدة على الأقل لحذفها', 'info');
    return;
  }
  const count = checkedBoxes.length;
  if (!confirm(`هل أنت متأكد من حذف ${count} جولة محددة نهائياً من الأرشيف؟`)) {
    return;
  }
  checkedBoxes.forEach(cb => {
    const id = cb.dataset.id || cb.value;
    if (id) {
      deleteArchivedAudit(id);
    }
  });
  renderBulkExportUI();
  showToast(`تم حذف ${count} جولة محددة بنجاح من الأرشيف 🗑️`, 'success');
}

export function toggleReportFooter(show = null) {
  const toggleCb = document.getElementById('toggleSignatures') || document.getElementById('toggle-print-footer');
  const showSignatures = (typeof show === 'boolean') 
    ? show 
    : (toggleCb?.checked ?? true);

  if (toggleCb && typeof show === 'boolean' && toggleCb.checked !== show) {
    toggleCb.checked = show;
  }

  const signatureSection = document.querySelector('.official-signatures-section') || document.getElementById('print-signatures-footer');
  if (signatureSection) {
    signatureSection.style.display = showSignatures ? 'block' : 'none';
    if (showSignatures) {
      signatureSection.classList.remove('hidden', 'no-print', 'is-hidden-print');
    } else {
      signatureSection.classList.add('hidden', 'no-print', 'is-hidden-print');
    }
  }
}

// التحكم في ظهور عبارة الاعتماد السفلية بالتقرير
export function toggleFooterCompliance(show) {
  saveBrandingSettings({ showFooterCompliance: Boolean(show) });
  syncBrandingUI();
  showToast(show ? 'تم تفعيل ظهور عبارة الاعتماد السفلية في التقرير' : 'تم إخفاء عبارة الاعتماد السفلية من التقرير', 'info');
}

// التحكم في ظهور مؤشر الجاهزية البصرية في ترويسة التقرير
export function toggleReadinessScore(show = null) {
  const cb = document.getElementById('toggle-readiness-score');
  const isChecked = (typeof show === 'boolean') ? show : (cb ? cb.checked : true);
  if (cb && typeof show === 'boolean') cb.checked = isChecked;

  const scoreRow = document.getElementById('print-header-score-row');
  if (scoreRow) {
    if (isChecked) {
      scoreRow.style.display = 'flex';
      scoreRow.classList.remove('hidden', 'no-print', 'is-hidden-print');
    } else {
      scoreRow.style.display = 'none';
      scoreRow.classList.add('hidden', 'no-print', 'is-hidden-print');
    }
  }
}

// ==================== إدارة وتخصيص ملخص إنجازات وتعديلات الزيارة الميدانية ====================

export function openVisitSummaryModal() {
  const modalTextarea = document.getElementById('visit-summary-textarea');
  if (modalTextarea) {
    const points = getEffectiveVisitSummary(currentAudit);
    modalTextarea.value = (currentAudit.visitSummary && currentAudit.visitSummary.trim())
      ? currentAudit.visitSummary.trim()
      : points.join('\n');
  }
  updateVisitSummaryModalPreview();
  showModal('visit-summary-modal');
}

export function closeVisitSummaryModal() {
  hideModal('visit-summary-modal');
}

export function updateVisitSummaryModalPreview() {
  const modalTextarea = document.getElementById('visit-summary-textarea');
  const previewContainer = document.getElementById('visit-summary-modal-preview-list');
  const countBadge = document.getElementById('visit-summary-preview-count');
  if (!previewContainer) return;

  const raw = modalTextarea ? modalTextarea.value : '';
  const lines = parseJustificationNotes(raw);

  if (countBadge) {
    countBadge.innerText = `${lines.length} نقاط`;
  }

  if (lines.length === 0) {
    previewContainer.innerHTML = `
      <div class="text-xs text-slate-400 py-2 text-center">لا توجد نقاط مسجلة حالياً</div>
    `;
    return;
  }

  previewContainer.innerHTML = lines.map((line, idx) => `
    <div class="flex items-start gap-2 text-xs text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
      <span class="w-4 h-4 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">${idx + 1}</span>
      <div class="flex-1 text-right" dir="rtl">${formatSummaryPointHtml(line)}</div>
      <span class="text-emerald-600 font-bold">✓</span>
    </div>
  `).join('');
}

export function autoGenerateVisitSummaryPrompt() {
  const aggregated = aggregateVisitAchievements(currentAudit);
  const modalTextarea = document.getElementById('visit-summary-textarea');
  if (modalTextarea) {
    modalTextarea.value = aggregated.join('\n');
    updateVisitSummaryModalPreview();
    showToast('تم استخراج وتجميع الإنجازات تلقائياً من الأقسام الموثقة', 'success');
  }
}

export function clearVisitSummaryToDefault() {
  currentAudit.visitSummary = '';
  saveAuditToStorage();
  const aggregated = aggregateVisitAchievements(currentAudit);
  const modalTextarea = document.getElementById('visit-summary-textarea');
  if (modalTextarea) {
    modalTextarea.value = aggregated.join('\n');
    updateVisitSummaryModalPreview();
  }
  renderVisitSummary();
  showToast('تمت استعادة التجميع الذكي التلقائي للملخص', 'info');
}

export function saveVisitSummaryFromModal() {
  const modalTextarea = document.getElementById('visit-summary-textarea');
  const val = modalTextarea ? modalTextarea.value.trim() : '';
  currentAudit.visitSummary = val;
  saveAuditToStorage();
  renderVisitSummary();
  closeVisitSummaryModal();
  showToast('✅ تم حفظ ملخص إنجازات الزيارة الميدانية وتطبيقه بنجاح على التقرير!', 'success');
}

export function updateLiveVisitSummary(value) {
  currentAudit.visitSummary = typeof value === 'string' ? value : '';
  saveAuditToStorage();
  renderVisitSummary();
}

export function resetVisitSummaryToAuto() {
  currentAudit.visitSummary = '';
  saveAuditToStorage();
  const aggregated = aggregateVisitAchievements(currentAudit);
  const liveInput = document.getElementById('report-visit-summary-input');
  if (liveInput) {
    liveInput.value = aggregated.join('\n');
  }
  renderVisitSummary();
  showToast('تمت إعادة استخراج وتجميع ملخص الإنجازات تلقائياً من الأقسام الموثقة', 'info');
}

export function appendPointToVisitSummary() {
  const modalTextarea = document.getElementById('visit-summary-textarea');
  const liveInput = document.getElementById('report-visit-summary-input');
  const modal = document.getElementById('visit-summary-modal');
  const isModalOpen = modal && modal.style.display !== 'none';

  const targetInput = (isModalOpen && modalTextarea) ? modalTextarea : (modalTextarea || liveInput);
  const currentVal = targetInput ? targetInput.value.trim() : (currentAudit.visitSummary || '');
  const newPoint = 'القسم العام: ضبط وتنسيق المعروضات وفق معايير الهوية المعتمدة.';
  const updatedVal = currentVal ? `${currentVal}\n${newPoint}` : newPoint;

  if (targetInput) {
    targetInput.value = updatedVal;
    targetInput.focus();
    targetInput.scrollTop = targetInput.scrollHeight;
  }
  if (isModalOpen) {
    updateVisitSummaryModalPreview();
  } else {
    updateLiveVisitSummary(updatedVal);
  }
  showToast('تمت إضافة نقطة إنجاز جديدة، يمكنك تحريرها الآن', 'success');
}

// ==================== تحكم المدقق الذكي ومحلل الجاهزية (Smart AI Auditor Controller) ====================
let tempAuditorAnalysis = null;
let tempAuditorScore = 90;

export function openSmartAuditorModal() {
  try {
    tempAuditorAnalysis = analyzeTourWithAI(currentAudit);
    
    // إعداد المؤشر
    tempAuditorScore = tempAuditorAnalysis.score || 90;
    const slider = document.getElementById('ai-auditor-score-slider');
    const sliderVal = document.getElementById('ai-auditor-score-slider-val');
    const badge = document.getElementById('ai-auditor-score-badge');
    const statsSummary = document.getElementById('ai-auditor-stats-summary');

    if (slider) slider.value = tempAuditorScore;
    if (sliderVal) sliderVal.innerText = `${tempAuditorScore}%`;
    if (badge) {
      badge.innerText = tempAuditorAnalysis.text || `${tempAuditorScore}%`;
      badge.className = `font-black text-xs px-2.5 py-1 rounded-lg border ${tempAuditorAnalysis.badgeClass}`;
    }
    if (statsSummary) {
      statsSummary.innerText = `${tempAuditorAnalysis.stats.totalSections} أقسام تم فحصها (${tempAuditorAnalysis.stats.fullyResolved} مكتمل، ${tempAuditorAnalysis.stats.beforeAfterCount} مقارنة قبل/بعد)`;
    }

    // إعداد قائمة نقاط القوة والإنجازات الميدانية
    const strengthsList = document.getElementById('ai-auditor-strengths-list');
    const strengthsCount = document.getElementById('ai-auditor-strengths-count');
    const positiveItems = tempAuditorAnalysis.positiveFindings || [];
    if (strengthsCount) strengthsCount.innerText = positiveItems.length;
    if (strengthsList) {
      if (positiveItems.length === 0) {
        strengthsList.innerHTML = `<div class="text-slate-400 py-1 text-center">لا توجد بنود إنجاز مكتملة مرصودة</div>`;
      } else {
        strengthsList.innerHTML = positiveItems.map(s => `
          <div class="flex items-start gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-emerald-500/20">
            <span class="text-emerald-400 font-bold shrink-0">✓</span>
            <div>
              <strong class="text-emerald-300 block text-[10.5px]">${s.source}</strong>
              <span class="text-slate-300 text-[10px] leading-relaxed">${s.text}</span>
            </div>
          </div>
        `).join('');
      }
    }

    // إعداد قائمة البنود المعلقة والملاحظات التشغيلية الحرجة
    const pendingList = document.getElementById('ai-auditor-pending-list');
    const pendingCount = document.getElementById('ai-auditor-pending-count');
    const negativeItems = tempAuditorAnalysis.negativeFindings || [];
    if (pendingCount) pendingCount.innerText = negativeItems.length;
    if (pendingList) {
      if (negativeItems.length === 0) {
        pendingList.innerHTML = `<div class="text-slate-400 py-1 text-center">لا توجد ملاحظات أو قصور تشغيلي مرصود</div>`;
      } else {
        pendingList.innerHTML = negativeItems.map(p => `
          <div class="flex items-start gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-rose-500/30">
            <span class="text-rose-400 font-bold shrink-0">⚠️</span>
            <div>
              <strong class="text-rose-300 block text-[10.5px]">${p.source}</strong>
              <span class="text-slate-200 text-[10px] leading-relaxed">${p.text}</span>
            </div>
          </div>
        `).join('');
      }
    }

    showModal('smart-auditor-modal');
  } catch (err) {
    console.error('openSmartAuditorModal error:', err);
    showToast('حدث خطأ أثناء تشغيل المدقق الذكي لمؤشر الجاهزية', 'error');
  }
}

export function closeSmartAuditorModal() {
  hideModal('smart-auditor-modal');
}

export function onAuditorScoreSliderChange(val) {
  tempAuditorScore = parseInt(val, 10) || 0;
  const sliderVal = document.getElementById('ai-auditor-score-slider-val');
  if (sliderVal) sliderVal.innerText = `${tempAuditorScore}%`;

  const badge = document.getElementById('ai-auditor-score-badge');
  if (badge) {
    let label = 'ممتاز ومطابق للمعايير';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (tempAuditorScore >= 88) {
      label = 'ممتاز ومطابق للمعايير';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (tempAuditorScore >= 75) {
      label = 'جيد مع بنود متابعة';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    } else {
      label = 'يحتاج إجراءات تصحيحية';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    }
    badge.innerText = `${tempAuditorScore}% • ${label}`;
    badge.className = `font-black text-xs px-2.5 py-1 rounded-lg border ${badgeClass}`;
  }
}

export function applySmartAuditorResults() {
  try {
    // 1. تطبيق مؤشر الجاهزية المعتمد في كائن الجولة
    currentAudit.readinessScore = tempAuditorScore;

    // 2. الحفظ في IndexedDB والمزامنة السحابية
    saveAuditToStorage();

    // 3. تحديث شارة مؤشر الجاهزية فورياً في ترويسة التقرير
    syncQuickDisplays();

    closeSmartAuditorModal();
    showToast(`✅ تم اعتماد وتطبيق مؤشر الجاهزية الذكي (${tempAuditorScore}%) بنجاح!`, 'success');
  } catch (err) {
    console.error('applySmartAuditorResults error:', err);
    showToast('فشل تطبيق مؤشر الجاهزية', 'error');
  }
}

// ==================== إدارة الهوية البصرية وشعار الشركة (Brand Identity Controller) ====================
let tempBrandingState = {
  companyName: '',
  companySubtitle: '',
  logoData: '',
  footerDisclaimer: '',
  showFooterCompliance: true
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

  const showCompInput = document.getElementById('branding-toggle-show-compliance');
  if (showCompInput) showCompInput.checked = current.showFooterCompliance !== false;

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
  const showCompInput = document.getElementById('branding-toggle-show-compliance');

  const companyName = nameInput ? nameInput.value.trim() : tempBrandingState.companyName;
  const companySubtitle = subInput ? subInput.value.trim() : tempBrandingState.companySubtitle;
  const footerDisclaimer = discInput ? discInput.value.trim() : tempBrandingState.footerDisclaimer;
  const showFooterCompliance = showCompInput ? showCompInput.checked : tempBrandingState.showFooterCompliance;

  saveBrandingSettings({
    companyName: companyName || 'SAMX-VM',
    companySubtitle: companySubtitle || 'العرض المرئي والتنسيق التجاري',
    logoData: tempBrandingState.logoData || '',
    footerDisclaimer: footerDisclaimer || 'تقرير تدقيق معتمد صادر من منصة العرض المرئي',
    showFooterCompliance: showFooterCompliance !== false
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

  const showCompInput = document.getElementById('branding-toggle-show-compliance');
  if (showCompInput) showCompInput.checked = def.showFooterCompliance !== false;

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
  const showCompInput = document.getElementById('branding-toggle-show-compliance');

  const onInput = () => {
    tempBrandingState.companyName = nameInput ? nameInput.value : '';
    tempBrandingState.companySubtitle = subInput ? subInput.value : '';
    tempBrandingState.footerDisclaimer = discInput ? discInput.value : '';
    if (showCompInput) tempBrandingState.showFooterCompliance = showCompInput.checked;
    updateBrandingLivePreview(tempBrandingState);
  };

  if (nameInput) nameInput.addEventListener('input', onInput);
  if (subInput) subInput.addEventListener('input', onInput);
  if (discInput) discInput.addEventListener('input', onInput);
  if (showCompInput) showCompInput.addEventListener('change', onInput);

  // مستمع التغييرات اللحظية لحقل ملخص إنجازات الزيارة
  const summaryTextarea = document.getElementById('visit-summary-textarea');
  if (summaryTextarea) {
    summaryTextarea.addEventListener('input', () => {
      updateVisitSummaryModalPreview();
    });
  }
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
  toggleReportFooter();
  const cleanBranch = (currentAudit.branchName || 'تقرير_VM').replace(/[/\\?%*:|"<>]/g, '_');
  const cleanDate = (currentAudit.auditDate || '').replace(/[/\\?%*:|"<>]/g, '_');
  const originalTitle = document.title;
  document.title = `SAMX-VM_${cleanBranch}_${cleanDate}`;
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

export async function exportPdfReport() {
  printReport();
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
  const branch = currentAudit.branchName || 'فرع المعرض العام';
  const date = currentAudit.auditDate || new Date().toISOString().split('T')[0];
  const auditor = currentAudit.auditorName || 'أخصائي الـ VM';
  const secCount = (currentAudit.sections || []).length;
  const score = calculateReadinessScore(currentAudit);
  const scoreLine = (secCount > 0) ? `\n📊 *مؤشر الجاهزية البصرية:* ${score.text}` : '';
  
  const msg = `*تقرير الزيارة الميدانية للعرض المرئي (SAMX-VM)*\n🏠 *المعرض:* ${branch}\n📅 *تاريخ التدقيق:* ${date}\n👤 *أخصائي الـ VM:* ${auditor}\n📋 *إجمالي الأقسام:* ${secCount} أقسام${scoreLine}\n\n📄 التقرير التنفيذي الرسمي المعتمد جاهز ومحفوظ بصيغة PDF.`;
  
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  try {
    window.open(waUrl, '_blank');
  } catch (e) {
    window.location.href = waUrl;
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

// ==================== دوال إدارة الفريق والفروع السحابية (Super Admin Team Engine) ====================

export function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btnEl) {
    btnEl.innerHTML = isPass 
      ? '<i data-lucide="eye-off" class="w-3.5 h-3.5 text-amber-400"></i>' 
      : '<i data-lucide="eye" class="w-3.5 h-3.5"></i>';
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch(e){}
    }
  }
}

export function toggleCardPasswordReveal(username) {
  const el = document.getElementById(`pass-display-${username}`);
  if (!el) return;
  const pass = el.getAttribute('data-pass') || '';
  if (el.innerText === '••••••••') {
    el.innerText = pass;
    el.classList.add('text-amber-300');
    el.classList.remove('text-slate-300');
  } else {
    el.innerText = '••••••••';
    el.classList.remove('text-amber-300');
    el.classList.add('text-slate-300');
  }
}

export function selectAllTeamBranches(selectAll = true) {
  const cbs = document.querySelectorAll('.team-branch-cb');
  cbs.forEach(cb => {
    cb.checked = selectAll;
  });
}

export function resetSpecialistForm() {
  const form = document.getElementById('team-specialist-form');
  if (form) form.reset();
  const modeInp = document.getElementById('spec-form-mode');
  if (modeInp) modeInp.value = 'create';
  const usernameInp = document.getElementById('spec-username');
  if (usernameInp) usernameInp.readOnly = false;
  const title = document.getElementById('team-form-title');
  if (title) title.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4 text-gold-400"></i><span>إضافة أخصائي VM جديد للفريق</span>';
  const btnText = document.getElementById('spec-save-btn-text');
  if (btnText) btnText.innerText = 'حفظ وتفعيل حساب الأخصائي';
  const cancelBtn = document.getElementById('team-form-cancel-btn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  selectAllTeamBranches(false);
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export function editSpecialistUser(username) {
  const clean = String(username || '').toLowerCase();
  const registry = getUsersRegistry();
  const user = registry.find(u => String(u.username).toLowerCase() === clean);
  if (!user) {
    showToast('لم يتم العثور على بيانات المستخدم', 'error');
    return;
  }

  const modeInp = document.getElementById('spec-form-mode');
  if (modeInp) modeInp.value = 'edit';
  const nameInp = document.getElementById('spec-display-name');
  if (nameInp) nameInp.value = user.displayName || '';
  const usernameInp = document.getElementById('spec-username');
  if (usernameInp) {
    usernameInp.value = user.username || '';
    if (user.username === 'sam') usernameInp.readOnly = true;
  }
  const passInp = document.getElementById('spec-password');
  if (passInp) passInp.value = user.password || '';

  // تحديد الفروع المخصصة
  const branches = Array.isArray(user.assignedBranches) ? user.assignedBranches : ['*'];
  const isAll = branches.includes('*');
  const cbs = document.querySelectorAll('.team-branch-cb');
  cbs.forEach(cb => {
    cb.checked = isAll || branches.includes(cb.value);
  });

  const title = document.getElementById('team-form-title');
  if (title) title.innerHTML = `<i data-lucide="edit-3" class="w-4 h-4 text-amber-400"></i><span>تعديل حساب الأخصائي (${user.displayName || user.username})</span>`;
  const btnText = document.getElementById('spec-save-btn-text');
  if (btnText) btnText.innerText = 'تحديث وحفظ التعديلات';
  const cancelBtn = document.getElementById('team-form-cancel-btn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');

  const viewTeam = document.getElementById('view-team');
  if (viewTeam) viewTeam.scrollIntoView({ behavior: 'smooth' });
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

export async function handleSaveSpecialistSubmit() {
  const nameInp = document.getElementById('spec-display-name');
  const usernameInp = document.getElementById('spec-username');
  const passInp = document.getElementById('spec-password');

  const displayName = (nameInp?.value || '').trim();
  const rawUsername = (usernameInp?.value || '').trim().toLowerCase();
  const password = (passInp?.value || '').trim();

  if (!displayName || !rawUsername || !password) {
    showToast('يرجى ملء كافة الحقول الإجبارية', 'error');
    return;
  }

  const checkedBranches = [];
  document.querySelectorAll('.team-branch-cb:checked').forEach(cb => {
    checkedBranches.push(cb.value);
  });

  const allBranches = getBranches();
  const assignedBranches = (checkedBranches.length === 0 || checkedBranches.length === allBranches.length)
    ? ['*']
    : checkedBranches;

  const role = rawUsername === 'sam' ? 'admin' : 'specialist';

  const userPayload = {
    username: rawUsername,
    password,
    displayName,
    role,
    assignedBranches
  };

  try {
    const { saveUserCloud } = await import('./api.js');
    await saveUserCloud(userPayload);
  } catch (e) {
    console.warn('saveUserCloud error:', e);
  }

  // تحديث السجل المحلي
  const registry = getUsersRegistry();
  const existingIdx = registry.findIndex(u => String(u.username).toLowerCase() === rawUsername);
  if (existingIdx !== -1) {
    registry[existingIdx] = userPayload;
  } else {
    registry.push(userPayload);
  }
  localStorage.setItem(STORAGE_KEY_USERS_REGISTRY, JSON.stringify(registry));

  showToast(`✅ تم حفظ حساب الأخصائي (${displayName}) بنجاح`, 'success');
  resetSpecialistForm();
  renderTeamManagementUI();
  populateSpecialistSelect();
}

export async function deleteSpecialistUserPrompt(username) {
  if (username === 'sam') {
    showToast('لا يمكن حذف حساب مدير النظام الفائق (sam)', 'error');
    return;
  }

  const confirmed = window.confirm(`هل أنت متأكد من رغبتك في حذف حساب المستخدم (@${username}) نهائياً؟`);
  if (!confirmed) return;

  try {
    const { deleteUserCloud } = await import('./api.js');
    await deleteUserCloud(username);
  } catch (e) {}

  let registry = getUsersRegistry();
  registry = registry.filter(u => String(u.username).toLowerCase() !== username.toLowerCase());
  localStorage.setItem(STORAGE_KEY_USERS_REGISTRY, JSON.stringify(registry));

  showToast(`تم حذف حساب الأخصائي (@${username}) بنجاح`, 'success');
  renderTeamManagementUI();
  populateSpecialistSelect();
}

export function refreshTeamManagementUI() {
  renderTeamManagementUI();
  showToast('تم تحديث قائمة فريق العمل والفروع', 'info');
}

export async function handleCloudSyncTours() {
  const btnText = document.getElementById('cloud-sync-btn-text');
  if (btnText) btnText.innerText = 'جاري المزامنة... ⏳';

  const activeUser = getActiveAuthSession() || { username: 'sam', role: 'admin' };

  try {
    const { syncAllToursCloud } = await import('./api.js');
    const syncRes = await syncAllToursCloud(activeUser);
    showToast(`✅ تمت المزامنة السحابية بنجاح! تم رفع (${syncRes.pushed}) وسحب (${syncRes.pulled}) جولات`, 'success');
  } catch (err) {
    showToast(`فشلت المزامنة السحابية: ${err.message}`, 'error');
  } finally {
    if (btnText) btnText.innerText = '🔄 مزامنة سحابية فورية';
    renderBulkExportUI();
  }
}

// ==================== إدارة التثبيت ونمط التشغيل المستقل (PWA Installation Controller) ====================
let deferredPWAInstallPrompt = null;

export function initPWAInstallation() {
  try {
    // 1. تسجيل Service Worker لدعم التشغيل بدون إنترنت والتخزين المؤقت
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then((reg) => {
            console.log('SAMX-VM: Service Worker registered successfully', reg.scope);
          })
          .catch((err) => {
            console.warn('SAMX-VM: Service Worker registration failed', err);
          });
      });
    }

    // 2. التحقق من نمط التشغيل المستقل (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator && window.navigator.standalone === true);

    const pwaStatusText = document.getElementById('pwa-status-text');
    const pwaInstalledPill = document.getElementById('pwa-installed-pill');
    const btnInstall = document.getElementById('btn-install-pwa');
    const btnInstallText = document.getElementById('btn-install-pwa-text');

    if (isStandalone) {
      if (pwaStatusText) pwaStatusText.innerText = 'يعمل كتطبيق مستقل ✅';
      if (pwaInstalledPill) pwaInstalledPill.innerText = 'مثبت حالياً ✓';
      if (btnInstallText) btnInstallText.innerText = '✓ التطبيق مثبت بالفعل على هذا الجهاز';
      if (btnInstall) {
        btnInstall.disabled = true;
        btnInstall.classList.add('opacity-70', 'pointer-events-none');
      }
    }

    // 3. التقاط حدث التثبيت beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPWAInstallPrompt = e;
      if (pwaStatusText) pwaStatusText.innerText = 'جاهز للتثبيت بنقرة واحدة 📲';
      if (btnInstallText) btnInstallText.innerText = '📲 تثبيت التطبيق على هذا الجهاز الآن';
      if (btnInstall) {
        btnInstall.disabled = false;
        btnInstall.classList.remove('opacity-70', 'pointer-events-none');
      }
    });

    // 4. الاستماع لاكتمال التثبيت appinstalled
    window.addEventListener('appinstalled', () => {
      deferredPWAInstallPrompt = null;
      if (pwaStatusText) pwaStatusText.innerText = 'تم التثبيت بنجاح 🎉';
      if (pwaInstalledPill) pwaInstalledPill.innerText = 'مثبت ✓';
      if (btnInstallText) btnInstallText.innerText = '✓ تم تثبيت التطبيق بنجاح';
      if (btnInstall) {
        btnInstall.disabled = true;
        btnInstall.classList.add('opacity-70', 'pointer-events-none');
      }
      showToast('🎉 مبروك! تم تثبيت SAMX-VM كتطبيق مستقل على جهازك', 'success');
    });
  } catch (err) {
    console.warn('initPWAInstallation error:', err);
  }
}

export async function triggerPWAInstall() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator && window.navigator.standalone === true);

  if (isStandalone) {
    showToast('التطبيق مثبت ويعمل بالفعل بنمط الشاشة الكاملة المستقل', 'info');
    return;
  }

  if (deferredPWAInstallPrompt) {
    try {
      await deferredPWAInstallPrompt.prompt();
      const choiceResult = await deferredPWAInstallPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        showToast('جاري تثبيت التطبيق على جهازك...', 'success');
      }
      deferredPWAInstallPrompt = null;
    } catch (err) {
      console.error('PWA install prompt error:', err);
    }
    return;
  }

  // إرشادات للأجهزة الذكية في حال عدم توفر الحدث المباشر (e.g. iOS Safari)
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  if (isIOS) {
    showToast('على iPhone/iPad: اضغط على زر المشاركة (Share) في Safari ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)', 'info');
  } else {
    showToast('لتثبيت التطبيق: افتح قائمة المتصفح (⋮) ثم اضغط على "تثبيت التطبيق" أو "Install App"', 'info');
  }
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
  window.toggleReportFooter = toggleReportFooter;
  window.toggleFooterCompliance = toggleFooterCompliance;
  window.openVisitSummaryModal = openVisitSummaryModal;
  window.closeVisitSummaryModal = closeVisitSummaryModal;
  window.updateVisitSummaryModalPreview = updateVisitSummaryModalPreview;
  window.autoGenerateVisitSummaryPrompt = autoGenerateVisitSummaryPrompt;
  window.clearVisitSummaryToDefault = clearVisitSummaryToDefault;
  window.saveVisitSummaryFromModal = saveVisitSummaryFromModal;
  window.updateLiveVisitSummary = updateLiveVisitSummary;
  window.resetVisitSummaryToAuto = resetVisitSummaryToAuto;
  window.appendPointToVisitSummary = appendPointToVisitSummary;
  window.setModalPanoramaOrientation = setModalPanoramaOrientation;
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
  window.toggleModalStatus = toggleModalStatus;
  window.setModalStatus = setModalStatus;
  window.toggleStatusSubOption = toggleStatusSubOption;
  window.toggleInlineAddSubOption = toggleInlineAddSubOption;
  window.submitAddSubOption = submitAddSubOption;
  window.confirmDeleteSubOption = confirmDeleteSubOption;
  window.confirmResetSubOptions = confirmResetSubOptions;
  window.renderStatusSubBars = renderStatusSubBars;
  window.syncModalStatusButtonsUI = syncModalStatusButtonsUI;
  window.syncFollowupContainerUI = syncFollowupContainerUI;
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
  window.saveCurrentTourToArchive = saveCurrentTourToArchive;
  window.startNewTourPrompt = startNewTourPrompt;
  window.previewArchivedAudit = previewArchivedAudit;
  window.uploadJsonToArchive = uploadJsonToArchive;
  window.toggleSelectAllArchivedAudits = toggleSelectAllArchivedAudits;
  window.confirmDeleteArchivedAudit = confirmDeleteArchivedAudit;
  window.loadArchivedAuditToEditor = loadArchivedAuditToEditor;
  window.downloadSingleArchivedAuditJson = downloadSingleArchivedAuditJson;
  window.confirmResetArchivedAudits = confirmResetArchivedAudits;
  window.deleteSelectedArchivedAudits = deleteSelectedArchivedAudits;
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
  window.handleLoginSubmit = handleLoginSubmit;
  window.handleBiometricLogin = handleBiometricLogin;
  window.promptRegisterBiometric = promptRegisterBiometric;
  window.lockOrLogoutSession = lockOrLogoutSession;
  window.syncBiometricStatusUI = syncBiometricStatusUI;
  window.getActiveAuthSession = getActiveAuthSession;
  window.applyUserRolePermissions = applyUserRolePermissions;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.toggleCardPasswordReveal = toggleCardPasswordReveal;
  window.selectAllTeamBranches = selectAllTeamBranches;
  window.resetSpecialistForm = resetSpecialistForm;
  window.editSpecialistUser = editSpecialistUser;
  window.handleSaveSpecialistSubmit = handleSaveSpecialistSubmit;
  window.deleteSpecialistUserPrompt = deleteSpecialistUserPrompt;
  window.refreshTeamManagementUI = refreshTeamManagementUI;
  window.renderTeamManagementUI = renderTeamManagementUI;
  window.handleCloudSyncTours = handleCloudSyncTours;
  window.openUserSettingsModal = openUserSettingsModal;
  window.closeUserSettingsModal = closeUserSettingsModal;
  window.toggleReadinessScore = toggleReadinessScore;
  window.openSmartAuditorModal = openSmartAuditorModal;
  window.closeSmartAuditorModal = closeSmartAuditorModal;
  window.onAuditorScoreSliderChange = onAuditorScoreSliderChange;
  window.applySmartAuditorResults = applySmartAuditorResults;
  window.triggerPWAInstall = triggerPWAInstall;
  window.initPWAInstallation = initPWAInstallation;
  window.initLoginKeyboardAdaptation = initLoginKeyboardAdaptation;
  window.initRememberMe = initRememberMe;
  window.openReportLightboxModal = openReportLightboxModal;
  window.closeReportLightbox = closeReportLightbox;
  window.updatePreviewScale = updatePreviewScale;
  window.toggleMobileFitMode = toggleMobileFitMode;

  window.addEventListener('resize', () => {
    const preview = document.getElementById('view-preview');
    if (preview && !preview.classList.contains('hidden')) {
      updatePreviewScale();
    }
  }, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(updatePreviewScale, 150);
  }, { passive: true });

  window.bootApp = bootApp;
}

// بدء التشغيل التلقائي عند جاهزية المستند
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
