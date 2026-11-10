/**
 * SAMX-VM Authentication & Biometric Security Engine (Phase 2)
 * Version: 1.6.8
 * Features:
 * - Immutable Super Admin (sam / 7701)
 * - Session Management (sessionStorage) & Role-Based Access Control (RBAC)
 * - Browser-Native WebAuthn Biometric Sensor Authentication (Fingerprint / FaceID)
 * - Specialist Identity Lock & Header Status Synchronization
 */

import {
  STORAGE_KEY_AUTH_SESSION,
  STORAGE_KEY_USERS_REGISTRY,
  STORAGE_KEY_BIOMETRIC_CRED,
  STORAGE_KEY_LAST_USER,
  currentAudit
} from './store.js';

// ==================== حساب مدير النظام الفائق (Super Admin) ====================
export const SUPER_ADMIN_USER = {
  username: 'sam',
  password: '7701',
  role: 'admin',
  displayName: 'سمير سلطان (مدير النظام)',
  assignedBranches: ['*']
};

/**
 * الحصول على سجل المستخدمين المعتمد في النظام
 */
export function getUsersRegistry() {
  if (typeof localStorage === 'undefined') return [SUPER_ADMIN_USER];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS_REGISTRY);
    let users = [];
    if (raw) {
      users = JSON.parse(raw);
    }
    if (!Array.isArray(users)) users = [];

    // التأكد الدائم من وجود حساب المدير الفائق sam
    const adminIdx = users.findIndex(u => u && String(u.username).toLowerCase() === 'sam');
    if (adminIdx === -1) {
      users.unshift({ ...SUPER_ADMIN_USER });
      localStorage.setItem(STORAGE_KEY_USERS_REGISTRY, JSON.stringify(users));
    } else {
      // مزامنة كلمة مرور وصلاحيات المدير الفائق لمنع أي تعديل خاطئ
      users[adminIdx] = {
        ...users[adminIdx],
        username: 'sam',
        password: '7701',
        role: 'admin',
        displayName: 'سمير سلطان (مدير النظام)',
        assignedBranches: ['*']
      };
      localStorage.setItem(STORAGE_KEY_USERS_REGISTRY, JSON.stringify(users));
    }
    return users;
  } catch (e) {
    console.warn('getUsersRegistry error:', e);
    return [{ ...SUPER_ADMIN_USER }];
  }
}

/**
 * فحص الجلسة النشطة الحالية للمستخدم
 */
export function getActiveAuthSession() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.username) {
      return session;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * حفظ جلسة المستخدم النشطة
 */
export function saveActiveAuthSession(user) {
  if (!user || !user.username) return false;
  try {
    const sessionData = {
      username: String(user.username).toLowerCase(),
      role: user.role || 'specialist',
      displayName: user.displayName || user.username,
      assignedBranches: user.assignedBranches || ['*'],
      loginTime: new Date().toISOString()
    };
    sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(sessionData));
    localStorage.setItem(STORAGE_KEY_LAST_USER, JSON.stringify({
      username: sessionData.username,
      displayName: sessionData.displayName,
      role: sessionData.role
    }));
    return sessionData;
  } catch (e) {
    console.error('saveActiveAuthSession error:', e);
    return null;
  }
}

/**
 * إنهاء وقفل الجلسة (Logout / Lock)
 */
export function clearActiveAuthSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
    sessionStorage.removeItem('samx_splash_shown');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * التحقق من بيانات الدخول (اسم المستخدم وكلمة المرور)
 */
export async function authenticateWithCredentials(usernameInput, passwordInput) {
  const cleanUsername = String(usernameInput || '').trim().toLowerCase();
  const cleanPassword = String(passwordInput || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return {
      success: false,
      message: 'يرجى إدخال اسم المستخدم وكلمة المرور'
    };
  }

  // 1. التحقق الفوري من المدير الفائق sam / 7701
  if (cleanUsername === 'sam' && cleanPassword === '7701') {
    const user = {
      username: 'sam',
      role: 'admin',
      displayName: 'سمير سلطان (مدير النظام)',
      assignedBranches: ['*']
    };
    const session = saveActiveAuthSession(user);
    return { success: true, user: session };
  }

  // 2. محاولة التحقق عبر السحابة (Cloudflare D1 / API) أولاً
  try {
    const { loginCloud } = await import('./api.js');
    const cloudRes = await loginCloud(cleanUsername, cleanPassword);
    if (cloudRes && cloudRes.success && cloudRes.user) {
      const registry = getUsersRegistry();
      const existingIdx = registry.findIndex(u => String(u.username).toLowerCase() === cleanUsername);
      const userObj = {
        username: cloudRes.user.username,
        password: cleanPassword,
        role: cloudRes.user.role || 'specialist',
        displayName: cloudRes.user.displayName,
        assignedBranches: cloudRes.user.assignedBranches || ['*']
      };
      if (existingIdx !== -1) {
        registry[existingIdx] = userObj;
      } else {
        registry.push(userObj);
      }
      try {
        localStorage.setItem(STORAGE_KEY_USERS_REGISTRY, JSON.stringify(registry));
      } catch (e) {}

      const session = saveActiveAuthSession(userObj);
      return { success: true, user: session };
    }
  } catch (cloudErr) {
    console.warn('Cloud login attempt error:', cloudErr);
  }

  // 3. التحقق من سجل المستخدمين المسجلين محلياً (Offline fallback)
  const registry = getUsersRegistry();
  const found = registry.find(u => 
    u && String(u.username).toLowerCase() === cleanUsername && String(u.password) === cleanPassword
  );

  if (found) {
    const session = saveActiveAuthSession(found);
    return { success: true, user: session };
  }

  return {
    success: false,
    message: 'بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور'
  };
}

// ==================== محرك المصادقة البيومترية الحقيقية (WebAuthn Native API) ====================

/**
 * فحص دعم المتصفح والنظام لمستشعر البصمة البيومتري
 */
export function isBiometricAuthSupported() {
  return typeof window !== 'undefined' && 
         Boolean(window.PublicKeyCredential && navigator.credentials && typeof navigator.credentials.create === 'function');
}

/**
 * تحويل ArrayBuffer إلى Base64URL
 */
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * تحويل Base64URL إلى ArrayBuffer
 */
function base64UrlToBuffer(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * استرجاع بيانات البصمة المسجلة مسبقاً على هذا الجهاز
 */
export function getRegisteredBiometricCredential() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BIOMETRIC_CRED);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * ربط وتفعيل بصمة هذا الجهاز (Fingerprint / FaceID / TouchID)
 */
export async function registerDeviceBiometric(targetUser = null) {
  if (!isBiometricAuthSupported()) {
    return {
      success: false,
      message: 'مستشعر البصمة البيومتري غير مدعوم في هذا المتصفح أو الجهاز.'
    };
  }

  const currentUser = targetUser || getActiveAuthSession();
  if (!currentUser) {
    return {
      success: false,
      message: 'يرجى تسجيل الدخول أولاً قبل ربط البصمة بهذا الجهاز.'
    };
  }

  try {
    // توليد تحدٍ أمني مشفر (Cryptographic Challenge)
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userIdBytes = new TextEncoder().encode(currentUser.username);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'SAMX-VM Security Portal',
          id: window.location.hostname || 'localhost'
        },
        user: {
          id: userIdBytes,
          name: currentUser.username,
          displayName: currentUser.displayName || currentUser.username
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // مستشعر الجهاز المدمج (بصمة الإصبع أو الوجه)
          userVerification: 'preferred',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    });

    if (!credential || !credential.id) {
      return { success: false, message: 'لم يتم استكمال عملية التحقق من البصمة.' };
    }

    const credIdBase64 = bufferToBase64Url(credential.rawId);
    const storedCred = {
      id: credIdBase64,
      username: currentUser.username,
      displayName: currentUser.displayName,
      role: currentUser.role,
      assignedBranches: currentUser.assignedBranches || ['*'],
      registeredAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_BIOMETRIC_CRED, JSON.stringify(storedCred));
    return { success: true, credential: storedCred };
  } catch (err) {
    console.warn('WebAuthn biometric registration error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, message: 'تم إلغاء طلب مسح البصمة من قبل المستخدم.' };
    }
    return { success: false, message: 'تعذر ربط البصمة: ' + (err.message || 'خطأ غير معروف') };
  }
}

/**
 * المصادقة والدخول السريع عبر بصمة الجهاز (WebAuthn Get Assertion)
 */
export async function authenticateWithDeviceBiometric() {
  if (!isBiometricAuthSupported()) {
    return {
      success: false,
      reason: 'unsupported',
      message: 'المتصفح لا يدعم المصادقة البيومترية.'
    };
  }

  const registered = getRegisteredBiometricCredential();
  if (!registered || !registered.id) {
    return {
      success: false,
      reason: 'not_enrolled',
      message: 'يرجى تسجيل الدخول بكلمة المرور أولاً لتفعيل البصمة على هذا الجهاز'
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const credBuffer = base64UrlToBuffer(registered.id);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: credBuffer,
          type: 'public-key',
          transports: ['internal']
        }],
        userVerification: 'preferred',
        timeout: 60000
      }
    });

    if (assertion) {
      const user = {
        username: registered.username,
        role: registered.role || (registered.username === 'sam' ? 'admin' : 'specialist'),
        displayName: registered.displayName || (registered.username === 'sam' ? 'سمير سلطان (مدير النظام)' : registered.username),
        assignedBranches: registered.assignedBranches || ['*'],
        loginMethod: 'biometric'
      };
      const session = saveActiveAuthSession(user);
      return { success: true, user: session };
    }

    return { success: false, message: 'تعذر التحقق من البصمة.' };
  } catch (err) {
    console.warn('WebAuthn biometric authentication error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, message: 'تم إلغاء عملية مسح البصمة.' };
    }
    return { success: false, message: 'فشل التحقق من البصمة البيومترية.' };
  }
}

// ==================== تطبيق الصلاحيات وتحديث الواجهة (RBAC & UI Binding) ====================

/**
 * تطبيق قيود وصلاحيات المستخدم النشط على حقول ومكونات التدقيق
 */
export function applyUserRolePermissions(user) {
  if (!user) return;

  const specialistSelect = document.getElementById('select-specialist');
  const manageSpecialistsBtn = document.getElementById('btn-manage-specialists');
  const manageBranchesBtn = document.getElementById('btn-manage-branches');
  const specialistLockBadge = document.getElementById('specialist-locked-badge');
  const teamNavTab = document.getElementById('tab-nav-team');
  const teamMobileTab = document.getElementById('mobile-nav-team');
  const branchSelect = document.getElementById('select-branch');
  const archiveSpecialistFilter = document.getElementById('bulk-specialist-filter-container');

  if (user.role === 'specialist') {
    // 1. إخفاء تبويب إدارة الفريق للأخصائي تماماً
    if (teamNavTab) teamNavTab.style.display = 'none';
    if (teamMobileTab) teamMobileTab.style.display = 'none';
    if (archiveSpecialistFilter) archiveSpecialistFilter.style.display = 'none';

    // 2. قفل اسم الأخصائي لمنع انتحال صفة زميل آخر
    const specialistName = user.displayName || user.username;
    currentAudit.auditorName = specialistName;

    if (specialistSelect) {
      let optionExists = false;
      for (let i = 0; i < specialistSelect.options.length; i++) {
        if (specialistSelect.options[i].value === specialistName) {
          optionExists = true;
          break;
        }
      }
      if (!optionExists) {
        const opt = document.createElement('option');
        opt.value = specialistName;
        opt.textContent = specialistName;
        specialistSelect.appendChild(opt);
      }
      specialistSelect.value = specialistName;
      specialistSelect.disabled = true;
      specialistSelect.title = 'اسم الأخصائي مقفل تلقائياً وفقاً لحساب الدخول النشط';
      specialistSelect.classList.add('opacity-80', 'cursor-not-allowed', 'bg-corp-900');
    }

    if (manageSpecialistsBtn) manageSpecialistsBtn.style.display = 'none';
    if (manageBranchesBtn) manageBranchesBtn.style.display = 'none';
    if (specialistLockBadge) specialistLockBadge.classList.remove('hidden');

    // 3. ربط وتخصيص الفروع للأخصائي (Branch-to-Specialist Binding)
    if (branchSelect && Array.isArray(user.assignedBranches) && !user.assignedBranches.includes('*')) {
      const assigned = user.assignedBranches;
      if (assigned.length > 0) {
        let optHtml = '';
        assigned.forEach(bName => {
          const selected = (bName === currentAudit.branchName) ? 'selected' : '';
          optHtml += `<option value="${bName}" ${selected}>${bName}</option>`;
        });
        branchSelect.innerHTML = optHtml;
        if (!assigned.includes(currentAudit.branchName)) {
          currentAudit.branchName = assigned[0];
          branchSelect.value = assigned[0];
        }
      }
    }
  } else {
    // المدير الفائق (sam / admin): إظهار تبويب إدارة الفريق وكافة الصلاحيات
    if (teamNavTab) teamNavTab.style.display = 'flex';
    if (teamMobileTab) teamMobileTab.style.display = 'flex';
    if (archiveSpecialistFilter) archiveSpecialistFilter.style.display = 'block';

    if (specialistSelect) {
      specialistSelect.disabled = false;
      specialistSelect.title = '';
      specialistSelect.classList.remove('opacity-80', 'cursor-not-allowed', 'bg-corp-900');
    }
    if (manageSpecialistsBtn) manageSpecialistsBtn.style.display = 'inline-flex';
    if (manageBranchesBtn) manageBranchesBtn.style.display = 'inline-flex';
    if (specialistLockBadge) specialistLockBadge.classList.add('hidden');
  }

  syncUserHeaderUI(user);
}

/**
 * مزامنة شارة المستخدم في الشريط العلوي للشاشة
 */
export function syncUserHeaderUI(user = null) {
  const activeUser = user || getActiveAuthSession();
  const badgeContainer = document.getElementById('header-user-badge');
  const bindBiometricBtn = document.getElementById('header-bind-biometric-btn');
  const logoutBtn = document.getElementById('header-logout-btn');

  if (!badgeContainer) return;

  if (!activeUser) {
    badgeContainer.innerHTML = '';
    badgeContainer.classList.add('hidden');
    if (bindBiometricBtn) bindBiometricBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    return;
  }

  badgeContainer.classList.remove('hidden');
  if (logoutBtn) logoutBtn.classList.remove('hidden');

  if (activeUser.role === 'admin') {
    badgeContainer.innerHTML = `
      <button type="button" onclick="openUserSettingsModal()" class="group flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/20 via-gold-500/15 to-amber-600/10 hover:from-amber-500/30 hover:to-gold-500/20 border border-gold-500/40 hover:border-gold-400 text-gold-300 shadow-sm shadow-gold-500/5 select-none whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer" title="إعدادات الحساب وجلسة مدير النظام">
        <span class="text-amber-400 shrink-0 text-sm">👑</span>
        <span class="hidden sm:inline text-gold-400 font-bold whitespace-nowrap">المدير:</span>
        <span class="text-white whitespace-nowrap font-mono">${activeUser.username}</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50 animate-pulse" title="متصل"></span>
        <span class="text-[10px] text-slate-400 group-hover:text-amber-300 transition-colors mr-0.5">⚙️</span>
      </button>
    `;
  } else {
    badgeContainer.innerHTML = `
      <button type="button" onclick="openUserSettingsModal()" class="group flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 hover:border-sky-400/50 text-sky-300 shadow-sm select-none whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer" title="إعدادات الحساب وجلسة أخصائي الـ VM">
        <span class="shrink-0 text-sm">👤</span>
        <span class="hidden sm:inline text-sky-400 whitespace-nowrap">أخصائي:</span>
        <span class="text-white truncate max-w-[85px] sm:max-w-[130px] whitespace-nowrap">${activeUser.displayName || activeUser.username}</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50 animate-pulse" title="متصل"></span>
        <span class="text-[10px] text-slate-400 group-hover:text-sky-300 transition-colors mr-0.5">⚙️</span>
      </button>
    `;
  }

  // فحص حالة زر ربط البصمة في الشريط العلوي (إن وجد)
  if (bindBiometricBtn) {
    const isSupported = isBiometricAuthSupported();
    const cred = getRegisteredBiometricCredential();
    const isLinkedForThisUser = cred && cred.username === activeUser.username;

    if (isSupported && !isLinkedForThisUser) {
      bindBiometricBtn.classList.remove('hidden');
      bindBiometricBtn.title = 'ربط بصمة إصبع أو وجه هذا الجهاز للدخول السريع';
    } else {
      bindBiometricBtn.classList.add('hidden');
    }
  }
}
