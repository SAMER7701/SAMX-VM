/**
 * SAMX-VM Authentication & Biometric Security Engine (Phase 1)
 * Version: 1.5.0
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
export function authenticateWithCredentials(usernameInput, passwordInput) {
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

  // 2. التحقق من سجل المستخدمين المسجلين (مثل الأخصائيين)
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
  const specialistLockBadge = document.getElementById('specialist-locked-badge');

  if (user.role === 'specialist') {
    // الأخصائي: قفل اسم الأخصائي لمنع انتحال صفة زميل آخر
    const specialistName = user.displayName || user.username;
    currentAudit.auditorName = specialistName;

    if (specialistSelect) {
      // التأكد من وجود خيار باسم الأخصائي
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

    if (manageSpecialistsBtn) {
      manageSpecialistsBtn.style.display = 'none';
    }

    // إظهار شارة القفل الأمني إن وُجدت
    if (specialistLockBadge) {
      specialistLockBadge.classList.remove('hidden');
    }
  } else {
    // المدير الفائق (sam / admin): فتح كافة الحقول والصلاحيات وإدارة الأخصائيين
    if (specialistSelect) {
      specialistSelect.disabled = false;
      specialistSelect.title = '';
      specialistSelect.classList.remove('opacity-80', 'cursor-not-allowed', 'bg-corp-900');
    }
    if (manageSpecialistsBtn) {
      manageSpecialistsBtn.style.display = 'inline-flex';
    }
    if (specialistLockBadge) {
      specialistLockBadge.classList.add('hidden');
    }
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
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500/20 to-gold-500/10 border border-gold-500/40 text-gold-300 shadow-sm shadow-gold-500/5 select-none" title="جلسة مدير النظام الفائق نشطة">
        <span class="text-amber-400">👑</span>
        <span class="hidden sm:inline text-gold-400 font-bold">مدير النظام:</span>
        <span class="text-white">${activeUser.username}</span>
      </div>
    `;
  } else {
    badgeContainer.innerHTML = `
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300 shadow-sm select-none" title="جلسة أخصائي الـ VM">
        <span>👤</span>
        <span class="hidden sm:inline text-sky-400">أخصائي:</span>
        <span class="text-white truncate max-w-[120px]">${activeUser.displayName || activeUser.username}</span>
      </div>
    `;
  }

  // فحص حالة زر ربط البصمة في الشريط العلوي
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
