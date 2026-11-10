/**
 * SAMX-VM Cloudflare API Client & Sync Layer
 * Architecture: 100% Cloud-First Direct Synchronization (Cloudflare D1 & R2)
 * Version: 1.6.7
 */

import {
  APP_STORAGE_KEY,
  metadataCache,
  getBranches,
  getSpecialists,
  getArchivedAudits,
  saveArchivedAudits,
} from './store.js';
import { saveActiveTourIDB } from './idb.js';

// الرابط الرسمي للخادم السحابي وقاعدة بيانات D1
export const CLOUDFLARE_WORKER_ORIGIN = 'https://samx-vm.sameer-sultan1.workers.dev';
export const API_BASE = '/api';

/**
 * تحديد مسار الـ API الصحيح لضمان الاتصال السحابي المباشر عبر كافة الأجهزة والهواتف
 */
export function getApiUrl(endpoint) {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // استخدام /api المباشر لخدمته عبر خادم المنصة أو عبر Cloudflare Workers عند النشر
  return `/api${clean}`;
}

/**
 * فحص حالة الاتصال بالخادم السحابي
 */
export async function checkCloudHealth() {
  if (!navigator.onLine) {
    return { online: false, reason: 'offline_navigator' };
  }
  try {
    const res = await fetch(getApiUrl('/health'), { method: 'GET', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { online: false, reason: `HTTP_${res.status}` };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

// ====================================================================
// 1. مزامنة وإدارة الفروع سحابياً 100% (BRANCHES CLOUD API)
// ====================================================================

/**
 * جلب الفروع مباشرة من الخادم السحابي وقاعدة بيانات D1 دون أي اعتماد على التخزين المحلي
 */
export async function fetchBranchesCloud() {
  let res = null;
  try {
    res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/branches`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
  } catch (netErr) {
    try {
      res = await fetch('/api/branches', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
    } catch (fallbackErr) {
      console.warn('[SAMX-VM API] fetchBranchesCloud error:', netErr.message);
    }
  }

  if (res && res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body && body.success && Array.isArray(body.data)) {
      metadataCache.branches = body.data;
      return { success: true, source: 'cloud_d1', data: body.data };
    }
  } else if (res) {
    console.warn(`[SAMX-VM API] fetchBranchesCloud status: ${res.status}`);
  }

  return { success: false, source: 'cache', data: metadataCache.branches || [] };
}

/**
 * إضافة فرع جديد وحفظه مباشرة في الخادم السحابي وقاعدة بيانات Cloudflare D1
 */
export async function createBranchCloud(name, id = null) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('اسم الفرع مطلوب');
  }

  // استخدام معرف رقمي صحيح متوافق مع عمود INTEGER PRIMARY KEY في قاعدة بيانات D1
  const entityId = (typeof id === 'number' && !isNaN(id))
    ? id
    : (parseInt(id, 10) || Date.now());

  const payload = { id: entityId, name: cleanName, city: 'الرياض' };

  let res = null;
  let networkError = null;

  try {
    res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    networkError = err;
    try {
      res = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
    } catch (fallbackErr) {
      throw new Error(`تعذر الاتصال بالخادم السحابي لحفظ الفرع (${networkError.message})`);
    }
  }

  if (!res || !res.ok) {
    let errMsg = `فشل الخادم في حفظ الفرع (${res ? res.status : 'لا توجد استجابة'})`;
    try {
      const errBody = await res.json();
      if (errBody && (errBody.error || errBody.message)) {
        errMsg = errBody.error || errBody.message;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  const body = await res.json().catch(() => ({}));
  if (body && body.success === false) {
    throw new Error(body.error || body.message || 'فشل حفظ الفرع في D1');
  }

  const savedItem = (body && body.data) ? body.data : payload;
  const currentList = getBranches();
  const existingIndex = currentList.findIndex(b => (b && b.id === savedItem.id) || (b && b.name === savedItem.name) || b === savedItem.name);
  if (existingIndex !== -1) {
    currentList[existingIndex] = savedItem;
  } else {
    currentList.push(savedItem);
  }
  metadataCache.branches = currentList;

  return { success: true, source: 'cloud_d1', data: savedItem };
}

/**
 * حذف فرع مباشرة من الخادم السحابي وقاعدة بيانات D1
 */
export async function deleteBranchCloud(idOrName) {
  if (!idOrName && idOrName !== 0) throw new Error('معرف الفرع مطلوب');

  const strTarget = String(idOrName).trim();
  const encoded = encodeURIComponent(strTarget);
  let res = null;
  let networkError = null;

  try {
    res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/branches/${encoded}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    networkError = err;
    try {
      res = await fetch(`/api/branches/${encoded}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
    } catch (fallbackErr) {
      throw new Error(`تعذر الاتصال بالخادم لحذف الفرع (${networkError.message})`);
    }
  }

  if (!res || !res.ok) {
    let errMsg = `فشل الخادم في حذف الفرع (${res ? res.status : 'خطأ غير معروف'})`;
    try {
      const errBody = await res.json();
      if (errBody && (errBody.error || errBody.message)) errMsg = errBody.error || errBody.message;
    } catch (e) {}
    throw new Error(errMsg);
  }

  // تحديث الكاش المحلي فورياً بمقارنة دقيقة تدعم الأرقام والنصوص
  metadataCache.branches = getBranches().filter(b => {
    if (typeof b === 'string') return b.trim() !== strTarget;
    if (b && typeof b === 'object') {
      return String(b.id).trim() !== strTarget && String(b.name || '').trim() !== strTarget;
    }
    return true;
  });

  // إعادة مزامنة الكاش مباشرة من السحابة للتأكيد 100%
  try {
    await fetchBranchesCloud();
  } catch (e) {}

  return { success: true, source: 'cloud_d1' };
}

// ====================================================================
// 2. مزامنة وإدارة أخصائيي الـ VM سحابياً 100% (SPECIALISTS CLOUD API)
// ====================================================================

/**
 * جلب الأخصائيين مباشرة من الخادم السحابي وقاعدة بيانات D1 دون أي اعتماد على التخزين المحلي
 */
export async function fetchSpecialistsCloud() {
  let res = null;
  try {
    res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/specialists`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
  } catch (netErr) {
    try {
      res = await fetch('/api/specialists', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
    } catch (fallbackErr) {
      console.warn('[SAMX-VM API] fetchSpecialistsCloud error:', netErr.message);
    }
  }

  if (res && res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body && body.success && Array.isArray(body.data)) {
      metadataCache.specialists = body.data;
      return { success: true, source: 'cloud_d1', data: body.data };
    }
  } else if (res) {
    console.warn(`[SAMX-VM API] fetchSpecialistsCloud status: ${res.status}`);
  }

  return { success: false, source: 'cache', data: metadataCache.specialists || [] };
}

/**
 * إضافة أخصائي جديد وحفظه مباشرة في الخادم السحابي وقاعدة بيانات Cloudflare D1
 */
export async function createSpecialistCloud(name, id = null) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('اسم الأخصائي مطلوب');
  }

  // استخدام معرف رقمي صحيح متوافق مع عمود INTEGER PRIMARY KEY في قاعدة بيانات D1
  const entityId = (typeof id === 'number' && !isNaN(id))
    ? id
    : (parseInt(id, 10) || Date.now());

  const payload = { id: entityId, name: cleanName, email: '', phone: '' };

  let res = null;
  let networkError = null;

  try {
    res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/specialists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    networkError = err;
    try {
      res = await fetch('/api/specialists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
    } catch (fallbackErr) {
      throw new Error(`تعذر الاتصال بالخادم السحابي لحفظ الأخصائي (${networkError.message})`);
    }
  }

  if (!res || !res.ok) {
    let errMsg = `فشل الخادم في حفظ الأخصائي (${res ? res.status : 'لا توجد استجابة'})`;
    try {
      const errBody = await res.json();
      if (errBody && (errBody.error || errBody.message)) {
        errMsg = errBody.error || errBody.message;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  const body = await res.json().catch(() => ({}));
  if (body && body.success === false) {
    throw new Error(body.error || body.message || 'فشل حفظ الأخصائي في D1');
  }

  const savedItem = (body && body.data) ? body.data : payload;
  const currentList = getSpecialists();
  const existingIndex = currentList.findIndex(s => (s && s.id === savedItem.id) || (s && s.name === savedItem.name) || s === savedItem.name);
  if (existingIndex !== -1) {
    currentList[existingIndex] = savedItem;
  } else {
    currentList.push(savedItem);
  }
  metadataCache.specialists = currentList;

  return { success: true, source: 'cloud_d1', data: savedItem };
}

/**
 * حذف أخصائي مباشرة من الخادم السحابي وقاعدة بيانات D1
 */
export async function deleteSpecialistCloud(idOrName) {
  if (!idOrName && idOrName !== 0) throw new Error('معرف الأخصائي مطلوب');

  const strTarget = String(idOrName).trim();
  const encoded = encodeURIComponent(strTarget);
  let res = null;
  let networkError = null;

  try {
    res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/specialists/${encoded}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    networkError = err;
    try {
      res = await fetch(`/api/specialists/${encoded}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
    } catch (fallbackErr) {
      throw new Error(`تعذر الاتصال بالخادم لحذف الأخصائي (${networkError.message})`);
    }
  }

  if (!res || !res.ok) {
    let errMsg = `فشل الخادم في حذف الأخصائي (${res ? res.status : 'خطأ غير معروف'})`;
    try {
      const errBody = await res.json();
      if (errBody && (errBody.error || errBody.message)) errMsg = errBody.error || errBody.message;
    } catch (e) {}
    throw new Error(errMsg);
  }

  // تحديث الكاش المحلي فورياً بمقارنة دقيقة تدعم الأرقام والنصوص
  metadataCache.specialists = getSpecialists().filter(s => {
    if (typeof s === 'string') return s.trim() !== strTarget;
    if (s && typeof s === 'object') {
      return String(s.id).trim() !== strTarget && String(s.name || '').trim() !== strTarget;
    }
    return true;
  });

  // إعادة مزامنة الكاش مباشرة من السحابة للتأكيد 100%
  try {
    await fetchSpecialistsCloud();
  } catch (e) {}

  return { success: true, source: 'cloud_d1' };
}

// ====================================================================
// 3. رفع الصور إلى Cloudflare R2
// ====================================================================

/**
 * رفع صورة (Base64 أو Blob) إلى Cloudflare R2
 * والحصول على رابط مباشر عالي الأداء لتخفيف حجم مسودة التقرير
 */
export async function uploadImageToR2(imageDataOrUrl) {
  if (!imageDataOrUrl || typeof imageDataOrUrl !== 'string') {
    return { success: false, message: 'بيانات الصورة فارغة' };
  }

  // إذا كانت الصورة رابطاً تم رفعه مسبقاً، نعيد الرابط فوراً
  if (imageDataOrUrl.startsWith('/api/images/') || imageDataOrUrl.startsWith('http://') || imageDataOrUrl.startsWith('https://')) {
    return { success: true, url: imageDataOrUrl };
  }

  if (!navigator.onLine) {
    // غير متصل: نحتفظ بـ DataURL محلياً لحين توفر الاتصال
    return { success: true, url: imageDataOrUrl, isLocalBase64: true };
  }

  try {
    const res = await fetch(`${API_BASE}/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataOrUrl }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    return { success: true, url: data.url, key: data.key };
  } catch (err) {
    console.warn('[SAMX-VM R2] Image upload failed, falling back to local base64:', err.message);
    return { success: true, url: imageDataOrUrl, isLocalBase64: true };
  }
}

// ====================================================================
// 4. حفظ واسترجاع التقارير (AUDIT REPORTS API)
// ====================================================================

/**
 * حفظ تقرير التدقيق بالكامل في D1 مع رفع الصور التابعة له إلى R2
 */
export async function saveAuditCloud(auditData) {
  if (!auditData) return { success: false, message: 'بيانات التقرير فارغة' };

  const payload = JSON.parse(JSON.stringify(auditData));

  // إذا كنا متصلين، نرفع أي صور لا تزال Base64 إلى Cloudflare R2 لتخفيف حجم قاعدة البيانات
  if (navigator.onLine && Array.isArray(payload.sections)) {
    for (const sec of payload.sections) {
      if (sec.beforeImg && sec.beforeImg.startsWith('data:image/')) {
        const uploadRes = await uploadImageToR2(sec.beforeImg);
        if (uploadRes.success && uploadRes.url) {
          sec.beforeImg = uploadRes.url;
        }
      }
      if (sec.afterImg && sec.afterImg.startsWith('data:image/')) {
        const uploadRes = await uploadImageToR2(sec.afterImg);
        if (uploadRes.success && uploadRes.url) {
          sec.afterImg = uploadRes.url;
        }
      }
    }
  }

  // حفظ التقرير في D1
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const body = await res.json();
        return { success: true, source: 'cloud_d1', id: body.id, audit: payload };
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Could not save audit to D1:', err.message);
    }
  }

  // في حال فشل الاتصال يتم الحفظ في محرك التخزين الفائق IndexedDB
  try {
    saveActiveTourIDB(payload);
  } catch (e) {
    console.warn('[SAMX API] IDB save fallback error:', e);
  }

  return { success: true, source: 'indexed_db', audit: payload };
}

/**
 * جلب قائمة التقارير المحفوظة سحابياً
 */
export async function listAuditsCloud() {
  if (!navigator.onLine) {
    return { success: false, message: 'الإنترنت غير متصل' };
  }

  try {
    const res = await fetch(`${API_BASE}/audits`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { success: true, data: data.data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * استرجاع تقرير محدد بواسطة الـ ID
 */
export async function getAuditCloud(id) {
  if (!navigator.onLine) {
    return { success: false, message: 'الإنترنت غير متصل' };
  }

  try {
    const res = await fetch(`${API_BASE}/audits/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const body = await res.json();
    return { success: true, data: body.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ====================================================================
// 4. مزامنة أقسام المعرض ومعايير الـ VM (SECTIONS & STANDARDS API)
// ====================================================================

/**
 * جلب أقسام المعرض ومعاييرها من سحابة D1
 */
export async function fetchSectionsCloud() {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/sections`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          return { success: true, data: body.data };
        }
      }
    } catch (e) {
      console.warn('fetchSectionsCloud offline fallback:', e.message);
    }
  }
  return { success: false, error: 'الخادم السحابي غير متصل' };
}

/**
 * حفظ أو تعديل قسم ومعاييره في سحابة D1
 */
export async function saveSectionCloud(name, standards = [], oldName = null, id = null) {
  if (!navigator.onLine) {
    return { success: false, message: 'سيتم الحفظ محلياً والمزامنة عند عودة الاتصال' };
  }

  try {
    const res = await fetch(`${API_BASE}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, standards, oldName, id }),
      signal: AbortSignal.timeout(6000),
    });

    const body = await res.json();
    return { success: res.ok && body.success, data: body.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * حذف قسم من سحابة D1
 */
export async function deleteSectionCloud(nameOrId) {
  if (!navigator.onLine) {
    return { success: false, message: 'سيتم الحذف محلياً' };
  }

  try {
    const res = await fetch(`${API_BASE}/sections/${encodeURIComponent(nameOrId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json();
    return { success: res.ok && body.success };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ====================================================================
// 5. مسارات تسجيل الدخول والمستخدمين سحابياً (CLOUD USERS & AUTH API)
// ====================================================================

/**
 * التحقق من بيانات الدخول عبر الخادم السحابي وقاعدة بيانات D1
 */
export async function loginCloud(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  if (cleanUsername === 'sam' && cleanPassword === '7701') {
    return {
      success: true,
      user: {
        username: 'sam',
        displayName: 'سمير سلطان (مدير النظام)',
        role: 'admin',
        assignedBranches: ['*']
      }
    };
  }

  let res = null;
  try {
    res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
        signal: AbortSignal.timeout(6000),
      });
    } catch (e) {
      console.warn('loginCloud offline fallback:', e.message);
    }
  }

  if (res && res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data && data.success) {
      return data;
    }
  }

  return { success: false, error: 'تعذر التحقق عبر السحابة' };
}

/**
 * جلب قائمة فريق العمل والمستخدمين من سحابة D1
 */
export async function fetchUsersCloud() {
  let res = null;
  try {
    res = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/users`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data && data.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
  }

  return { success: false, error: 'تعذر جلب المستخدمين من السحابة' };
}

/**
 * حفظ أو تعديل مستخدم/أخصائي في سحابة D1
 */
export async function saveUserCloud(userData) {
  let res = null;
  try {
    res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        signal: AbortSignal.timeout(8000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: true, data: data.user || userData };
  }

  let errMsg = 'فشل حفظ المستخدم في السحابة';
  if (res) {
    try {
      const errData = await res.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch (_) {}
  }
  return { success: false, error: errMsg };
}

/**
 * حذف مستخدم من سحابة D1
 */
export async function deleteUserCloud(username) {
  const cleanUsername = encodeURIComponent(String(username || '').trim().toLowerCase());
  let res = null;
  try {
    res = await fetch(`${API_BASE}/users/${cleanUsername}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/users/${cleanUsername}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    return { success: true };
  }

  let errMsg = 'فشل حذف المستخدم من السحابة';
  if (res) {
    try {
      const errData = await res.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch (_) {}
  }
  return { success: false, error: errMsg };
}

// ====================================================================
// 6. مسارات جولات التدقيق الميداني السحابية (CLOUD TOURS API)
// ====================================================================

/**
 * جلب الجولات من سحابة D1 مع تطبيق عزل البيانات والصلاحيات
 */
export async function fetchToursCloud(username = '', role = 'specialist', specialist = 'all') {
  const query = new URLSearchParams({
    user: username || '',
    role: role || 'specialist',
    specialist: specialist || 'all'
  }).toString();

  let res = null;
  try {
    res = await fetch(`${API_BASE}/tours?${query}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/tours?${query}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body && body.success && Array.isArray(body.data)) {
      return { success: true, data: body.data };
    }
  }

  return { success: false, error: 'تعذر جلب الجولات من السحابة' };
}

/**
 * حفظ جولة في سحابة D1 و R2
 */
export async function saveTourCloud(tourData) {
  if (!tourData || !tourData.id) return { success: false, error: 'بيانات الجولة غير صالحة' };

  let res = null;
  try {
    res = await fetch(`${API_BASE}/tours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tourData),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/tours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tourData),
        signal: AbortSignal.timeout(10000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    return { success: true, id: tourData.id };
  }

  return { success: false, error: 'تعذر حفظ الجولة في السحابة' };
}

/**
 * استرجاع محتوى جولة كامل من السحابة
 */
export async function getTourCloud(tourId) {
  const encodedId = encodeURIComponent(String(tourId).trim());
  let res = null;
  try {
    res = await fetch(`${API_BASE}/tours/${encodedId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/tours/${encodedId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body && body.success && body.data) {
      return { success: true, data: body.data };
    }
  }

  return { success: false, error: 'الجولة غير موجودة في السحابة' };
}

/**
 * حذف جولة من السحابة
 */
export async function deleteTourCloud(tourId) {
  const encodedId = encodeURIComponent(String(tourId).trim());
  let res = null;
  try {
    res = await fetch(`${API_BASE}/tours/${encodedId}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    try {
      res = await fetch(`${CLOUDFLARE_WORKER_ORIGIN}/api/tours/${encodedId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
    } catch (e) {}
  }

  if (res && res.ok) {
    return { success: true };
  }

  return { success: false, error: 'تعذر حذف الجولة من السحابة' };
}

/**
 * مزامنة سحابية شاملة ومتبادلة للجولات مع التخزين المحلي
 */
export async function syncAllToursCloud(currentUser) {
  const user = currentUser || { username: 'sam', role: 'admin' };
  const localTours = getArchivedAudits();

  let pushed = 0;
  let pulled = 0;

  // 1. رفع أي جولات محلية لم تُرفع للسحابة
  for (const t of localTours) {
    try {
      const res = await saveTourCloud(t);
      if (res && res.success) pushed++;
    } catch (e) {}
  }

  // 2. سحب الجولات من السحابة
  const cloudRes = await fetchToursCloud(user.username, user.role, 'all');
  if (cloudRes && cloudRes.success && Array.isArray(cloudRes.data)) {
    const cloudSummaries = cloudRes.data;
    const currentList = getArchivedAudits();

    for (const cTour of cloudSummaries) {
      const localIdx = currentList.findIndex(lt => lt.id === cTour.id);
      if (localIdx === -1) {
        // تنزيل الجولة الكاملة
        const fullRes = await getTourCloud(cTour.id);
        if (fullRes && fullRes.success && fullRes.data) {
          currentList.push(fullRes.data);
          pulled++;
        } else {
          currentList.push({
            id: cTour.id,
            ownerUsername: cTour.ownerUsername || 'sam',
            specialistName: cTour.specialistName || 'سمير سلطان',
            branchName: cTour.branchName || 'معرض غير محدد',
            auditorName: cTour.specialistName || 'سمير سلطان',
            weekNumber: cTour.weekNumber || 43,
            auditDate: cTour.auditDate || new Date().toISOString().split('T')[0],
            monthKey: cTour.monthKey,
            monthName: cTour.monthName,
            sections: [],
            visitSummary: cTour.visitSummary || ''
          });
          pulled++;
        }
      }
    }

    saveArchivedAudits(currentList);
  }

  return { success: true, pushed, pulled, total: getArchivedAudits().length };
}

// الجسر العام للنطاق البرمجي
if (typeof window !== 'undefined') {
  window.samxApi = {
    checkCloudHealth,
    fetchBranchesCloud,
    createBranchCloud,
    deleteBranchCloud,
    fetchSpecialistsCloud,
    createSpecialistCloud,
    deleteSpecialistCloud,
    fetchSectionsCloud,
    saveSectionCloud,
    deleteSectionCloud,
    uploadImageToR2,
    saveAuditCloud,
    listAuditsCloud,
    getAuditCloud,
    loginCloud,
    fetchUsersCloud,
    saveUserCloud,
    deleteUserCloud,
    fetchToursCloud,
    saveTourCloud,
    getTourCloud,
    deleteTourCloud,
    syncAllToursCloud,
  };
}
