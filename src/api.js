/**
 * SAMX-VM Cloudflare API Client & Sync Layer
 * Architecture: Hybrid Cloud-First with Resilient Offline Fallback
 * Version: 1.3.0
 */

import {
  APP_STORAGE_KEY,
  STORAGE_KEY_BRANCHES,
  STORAGE_KEY_SPECIALISTS,
  getBranches,
  getSpecialists,
  saveBranchesToStorage,
  saveSpecialistsToStorage,
} from './store.js';

// الأساس الافتراضي لمسار الـ API (يعمل محلياً أو على نطاق الـ Worker الموزع)
const API_BASE = '/api';

/**
 * فحص حالة الاتصال بالخادم السحابي
 */
export async function checkCloudHealth() {
  if (!navigator.onLine) {
    return { online: false, reason: 'offline_navigator' };
  }
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

// ====================================================================
// 1. مزامنة وإدارة الفروع (BRANCHES API)
// ====================================================================

/**
 * جلب الفروع من D1 مع التراجع السلس إلى التخزين المحلي في حال عدم الاتصال
 */
export async function fetchBranchesCloud() {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/branches`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          // تحديث الكاش المحلي تلقائياً لمزامنة البيانات
          saveBranchesToStorage(body.data);
          return { success: true, source: 'cloud_d1', data: body.data };
        }
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Falling back to local branches cache:', err.message);
    }
  }

  // التراجع للتخزين المحلي (Offline Fallback)
  return { success: true, source: 'local_storage', data: getBranches() };
}

/**
 * إضافة فرع جديد وحفظه سحابياً ومحلياً
 */
export async function createBranchCloud(name, id = null) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { success: false, message: 'اسم الفرع مطلوب' };

  const entityId = id || `br_${Date.now()}`;
  const newBranch = { id: entityId, name: cleanName };

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const body = await res.json();
        return { success: true, source: 'cloud_d1', data: body.data || newBranch };
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Could not save branch to D1, queued locally:', err.message);
    }
  }

  return { success: true, source: 'local_storage', data: newBranch };
}

/**
 * حذف فرع من D1 والتخزين المحلي
 */
export async function deleteBranchCloud(id) {
  if (navigator.onLine && id) {
    try {
      const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return { success: true, source: 'cloud_d1' };
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Failed to delete branch from D1:', err.message);
    }
  }
  return { success: true, source: 'local_storage' };
}

// ====================================================================
// 2. مزامنة وإدارة أخصائيي الـ VM (SPECIALISTS API)
// ====================================================================

/**
 * جلب الأخصائيين من D1 مع التراجع السلس
 */
export async function fetchSpecialistsCloud() {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/specialists`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          saveSpecialistsToStorage(body.data);
          return { success: true, source: 'cloud_d1', data: body.data };
        }
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Falling back to local specialists cache:', err.message);
    }
  }

  return { success: true, source: 'local_storage', data: getSpecialists() };
}

/**
 * إضافة أخصائي جديد وحفظه سحابياً ومحلياً
 */
export async function createSpecialistCloud(name, id = null) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { success: false, message: 'اسم الأخصائي مطلوب' };

  const entityId = id || `sp_${Date.now()}`;
  const newSpecialist = { id: entityId, name: cleanName };

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/specialists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSpecialist),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const body = await res.json();
        return { success: true, source: 'cloud_d1', data: body.data || newSpecialist };
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Could not save specialist to D1, queued locally:', err.message);
    }
  }

  return { success: true, source: 'local_storage', data: newSpecialist };
}

/**
 * حذف أخصائي من D1 والتخزين المحلي
 */
export async function deleteSpecialistCloud(id) {
  if (navigator.onLine && id) {
    try {
      const res = await fetch(`${API_BASE}/specialists/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return { success: true, source: 'cloud_d1' };
      }
    } catch (err) {
      console.warn('[SAMX-VM API] Failed to delete specialist from D1:', err.message);
    }
  }
  return { success: true, source: 'local_storage' };
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
