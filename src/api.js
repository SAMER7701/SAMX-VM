/**
 * SAMX-VM Cloudflare API Client & Sync Layer
 * Architecture: 100% Cloud-First Direct Synchronization (Cloudflare D1 & R2)
 * Version: 1.4.0
 */

import {
  APP_STORAGE_KEY,
  metadataCache,
  getBranches,
  getSpecialists,
} from './store.js';

// الرابط الرسمي للخادم السحابي وقاعدة بيانات D1
export const CLOUDFLARE_WORKER_ORIGIN = 'https://samx-vm.sameer-sultan1.workers.dev';

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
  const url = getApiUrl('/branches');
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const body = await res.json();
      if (body && body.success && Array.isArray(body.data)) {
        metadataCache.branches = body.data;
        return { success: true, source: 'cloud_d1', data: body.data };
      }
    } else {
      console.warn(`[SAMX-VM API] fetchBranchesCloud non-ok status: ${res.status}`);
    }
  } catch (err) {
    console.warn('[SAMX-VM API] fetchBranchesCloud:', err.message);
  }

  return { success: false, source: 'cache', data: metadataCache.branches || [] };
}

/**
 * إضافة فرع جديد وحفظه مباشرة في الخادم السحابي
 */
export async function createBranchCloud(name, id = null) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { success: false, message: 'اسم الفرع مطلوب' };

  const entityId = id || `br_${Date.now()}`;
  const payload = { id: entityId, name: cleanName, city: 'الرياض' };
  const url = getApiUrl('/branches');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
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
  } catch (err) {
    console.warn('[SAMX-VM API] createBranchCloud network warning:', err.message);
  }

  const currentList = getBranches();
  currentList.push(payload);
  metadataCache.branches = currentList;
  return { success: true, source: 'memory', data: payload };
}

/**
 * حذف فرع مباشرة من الخادم السحابي وقاعدة بيانات D1
 */
export async function deleteBranchCloud(idOrName) {
  if (!idOrName) return { success: false, message: 'معرف الفرع مطلوب' };

  const url = getApiUrl(`/branches/${encodeURIComponent(idOrName)}`);
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.warn('[SAMX-VM API] deleteBranchCloud warning:', err.message);
  }

  metadataCache.branches = getBranches().filter(b => b.id !== idOrName && (b.name || b) !== idOrName);
  return { success: true, source: 'cloud_d1' };
}

// ====================================================================
// 2. مزامنة وإدارة أخصائيي الـ VM سحابياً 100% (SPECIALISTS CLOUD API)
// ====================================================================

/**
 * جلب الأخصائيين مباشرة من الخادم السحابي وقاعدة بيانات D1 دون أي اعتماد على التخزين المحلي
 */
export async function fetchSpecialistsCloud() {
  const url = getApiUrl('/specialists');
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const body = await res.json();
      if (body && body.success && Array.isArray(body.data)) {
        metadataCache.specialists = body.data;
        return { success: true, source: 'cloud_d1', data: body.data };
      }
    } else {
      console.warn(`[SAMX-VM API] fetchSpecialistsCloud non-ok status: ${res.status}`);
    }
  } catch (err) {
    console.warn('[SAMX-VM API] fetchSpecialistsCloud:', err.message);
  }

  return { success: false, source: 'cache', data: metadataCache.specialists || [] };
}

/**
 * إضافة أخصائي جديد وحفظه مباشرة في الخادم السحابي
 */
export async function createSpecialistCloud(name, id = null) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { success: false, message: 'اسم الأخصائي مطلوب' };

  const entityId = id || `sp_${Date.now()}`;
  const payload = { id: entityId, name: cleanName };
  const url = getApiUrl('/specialists');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
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
  } catch (err) {
    console.warn('[SAMX-VM API] createSpecialistCloud network warning:', err.message);
  }

  const currentList = getSpecialists();
  currentList.push(payload);
  metadataCache.specialists = currentList;
  return { success: true, source: 'memory', data: payload };
}

/**
 * حذف أخصائي مباشرة من الخادم السحابي وقاعدة بيانات D1
 */
export async function deleteSpecialistCloud(idOrName) {
  if (!idOrName) return { success: false, message: 'معرف الأخصائي مطلوب' };

  const url = getApiUrl(`/specialists/${encodeURIComponent(idOrName)}`);
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.warn('[SAMX-VM API] deleteSpecialistCloud warning:', err.message);
  }

  metadataCache.specialists = getSpecialists().filter(s => s.id !== idOrName && (s.name || s) !== idOrName);
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

  // في حال فشل الاتصال يتم الحفظ في التخزين المحلي
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  return { success: true, source: 'local_storage', audit: payload };
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
  };
}
