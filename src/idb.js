/**
 * SAMX-VM Native IndexedDB Storage Engine (SAMX_StorageDB)
 * Database: samx_vm_idb (v1)
 * Object Stores:
 *   1. 'active_state'   - KeyPath: 'key' (Stores currentTour with all high-resolution images)
 *   2. 'archived_tours' - KeyPath: 'id'  (Stores saved/archived tours)
 *
 * Provides hundreds of megabytes / gigabytes of storage, eliminating the 5MB localStorage limit.
 */

export const DB_NAME = 'samx_vm_idb';
export const DB_VERSION = 1;
export const STORE_ACTIVE = 'active_state';
export const STORE_ARCHIVED = 'archived_tours';

let dbInstance = null;
let dbOpenPromise = null;

/**
 * فتح اتصال قاعدة بيانات IndexedDB وضمان إنشاء الجداول (Object Stores)
 */
export function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[SAMX IDB] IndexedDB is not supported in this environment.');
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. جدول الجولة النشطة الحالية (active_state)
        if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
          db.createObjectStore(STORE_ACTIVE, { keyPath: 'key' });
        }

        // 2. جدول أرشيف الجولات الميدانية (archived_tours)
        if (!db.objectStoreNames.contains(STORE_ARCHIVED)) {
          const archiveStore = db.createObjectStore(STORE_ARCHIVED, { keyPath: 'id' });
          try {
            archiveStore.createIndex('ownerUsername', 'ownerUsername', { unique: false });
            archiveStore.createIndex('branchName', 'branchName', { unique: false });
            archiveStore.createIndex('weekNumber', 'weekNumber', { unique: false });
          } catch (_) {}
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        dbInstance.onversionchange = () => {
          dbInstance.close();
          dbInstance = null;
          dbOpenPromise = null;
        };
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('[SAMX IDB] Failed to open database:', event.target.error);
        dbOpenPromise = null;
        resolve(null); // Fallback graceful
      };

      request.onblocked = () => {
        console.warn('[SAMX IDB] Database open blocked by another tab');
      };
    } catch (e) {
      console.error('[SAMX IDB] Exception opening database:', e);
      dbOpenPromise = null;
      resolve(null);
    }
  });

  return dbOpenPromise;
}

// ====================================================================
// 1. إدارة مسودة العمل والجولة النشطة (ACTIVE TOUR IN IDB)
// ====================================================================

/**
 * حفظ الجولة النشطة بكامل صورها عالية الوضوح في IndexedDB
 */
export async function saveActiveTourIDB(tourData) {
  if (!tourData) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ACTIVE, 'readwrite');
      const store = tx.objectStore(STORE_ACTIVE);
      const record = {
        key: 'currentTour',
        tour: JSON.parse(JSON.stringify(tourData)),
        updatedAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.warn('[SAMX IDB] Error putting active tour:', e.target.error);
        resolve(false);
      };
    } catch (err) {
      console.warn('[SAMX IDB] Transaction error saving active tour:', err);
      resolve(false);
    }
  });
}

/**
 * استرجاع الجولة النشطة بكامل صورها من IndexedDB
 */
export async function loadActiveTourIDB() {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ACTIVE, 'readonly');
      const store = tx.objectStore(STORE_ACTIVE);
      const req = store.get('currentTour');
      req.onsuccess = () => {
        if (req.result && req.result.tour) {
          resolve(req.result.tour);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch (err) {
      console.warn('[SAMX IDB] Error loading active tour:', err);
      resolve(null);
    }
  });
}

/**
 * مسح الجولة النشطة من IndexedDB
 */
export async function clearActiveTourIDB() {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ACTIVE, 'readwrite');
      const store = tx.objectStore(STORE_ACTIVE);
      const req = store.delete('currentTour');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// ====================================================================
// 2. إدارة أرشيف الجولات (ARCHIVED TOURS IN IDB)
// ====================================================================

/**
 * حفظ أو تحديث جولة مؤرشفة مفردة في IndexedDB
 */
export async function saveArchivedTourIDB(tour) {
  if (!tour || !tour.id) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ARCHIVED, 'readwrite');
      const store = tx.objectStore(STORE_ARCHIVED);
      const cleanTour = JSON.parse(JSON.stringify(tour));
      const req = store.put(cleanTour);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.warn('[SAMX IDB] Error putting archived tour:', e.target.error);
        resolve(false);
      };
    } catch (err) {
      console.warn('[SAMX IDB] Transaction error saving archived tour:', err);
      resolve(false);
    }
  });
}

/**
 * حفظ قائمة كاملة من الجولات المؤرشفة دفعة واحدة في IndexedDB
 */
export async function saveAllArchivedToursIDB(toursList) {
  if (!Array.isArray(toursList)) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ARCHIVED, 'readwrite');
      const store = tx.objectStore(STORE_ARCHIVED);

      // تنظيف وإعادة كتابة لضمان مطابقة الترتيب والحذف
      store.clear();

      toursList.forEach((tour) => {
        if (tour && tour.id) {
          store.put(JSON.parse(JSON.stringify(tour)));
        }
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => {
        console.warn('[SAMX IDB] Batch save error:', e.target.error);
        resolve(false);
      };
    } catch (err) {
      console.warn('[SAMX IDB] Transaction error in saveAllArchivedToursIDB:', err);
      resolve(false);
    }
  });
}

/**
 * استرجاع جميع الجولات المؤرشفة من IndexedDB
 */
export async function getAllArchivedToursIDB() {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ARCHIVED, 'readonly');
      const store = tx.objectStore(STORE_ARCHIVED);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        resolve(Array.isArray(results) ? results : []);
      };
      req.onerror = () => resolve([]);
    } catch (err) {
      console.warn('[SAMX IDB] Error getting all archived tours:', err);
      resolve([]);
    }
  });
}

/**
 * جلب جولة واحدة بالمعرف
 */
export async function getArchivedTourByIdIDB(id) {
  if (!id) return null;
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ARCHIVED, 'readonly');
      const store = tx.objectStore(STORE_ARCHIVED);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * حذف جولة من الأرشيف بواسطة المعرف
 */
export async function deleteArchivedTourIDB(id) {
  if (!id) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ARCHIVED, 'readwrite');
      const store = tx.objectStore(STORE_ARCHIVED);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * تفريغ جدول الأرشيف بالكامل
 */
export async function clearArchivedToursIDB() {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ARCHIVED, 'readwrite');
      const store = tx.objectStore(STORE_ARCHIVED);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// ====================================================================
// 3. الهجرة الآمنة والتنظيف الفوري لمساحة التخزين المحلي (LOCALSTORAGE CLEANUP)
// ====================================================================

/**
 * فحص وهجرة أي جولات وصور مخزنة في localStorage ونقلها لـ IndexedDB فوراً،
 * ثم مسح المفاتيح الثقيلة من localStorage لمنع حدوث QuotaExceededError تماماً.
 */
export async function migrateLocalStorageToIndexedDB() {
  if (typeof localStorage === 'undefined') return { migrated: false };

  let migratedActive = false;
  let migratedArchivedCount = 0;

  try {
    // 1. هجرة الجولة النشطة من localStorage إذا وجدت
    const activeRaw = localStorage.getItem('samx_vm_active_audit') || localStorage.getItem('currentTour');
    if (activeRaw) {
      try {
        const parsedActive = JSON.parse(activeRaw);
        if (parsedActive && typeof parsedActive === 'object') {
          // حفظها في IndexedDB
          await saveActiveTourIDB(parsedActive);
          migratedActive = true;
        }
      } catch (parseErr) {
        console.warn('[SAMX IDB Migration] Could not parse active tour from localStorage', parseErr);
      }

      // إزالة المفاتيح الثقيلة من localStorage فوراً
      try {
        localStorage.removeItem('samx_vm_active_audit');
        localStorage.removeItem('currentTour');
      } catch (_) {}
    }

    // 2. هجرة الأرشيف من localStorage إذا وجد
    const archiveRaw = localStorage.getItem('samx_audit_history_v1') || localStorage.getItem('savedTours');
    if (archiveRaw) {
      try {
        const parsedArchive = JSON.parse(archiveRaw);
        if (Array.isArray(parsedArchive) && parsedArchive.length > 0) {
          // دمج أو حفظ في IndexedDB
          const existingIDBTours = await getAllArchivedToursIDB();
          const existingIds = new Set(existingIDBTours.map(t => t.id));

          for (const item of parsedArchive) {
            if (item && item.id) {
              if (!existingIds.has(item.id)) {
                await saveArchivedTourIDB(item);
                migratedArchivedCount++;
              }
            }
          }
        }
      } catch (archErr) {
        console.warn('[SAMX IDB Migration] Could not parse archived tours from localStorage', archErr);
      }

      // إزالة المفاتيح الثقيلة من localStorage فوراً
      try {
        localStorage.removeItem('samx_audit_history_v1');
        localStorage.removeItem('savedTours');
      } catch (_) {}
    }

    if (migratedActive || migratedArchivedCount > 0) {
      console.log(`[SAMX IDB Migration] Successfully migrated to IndexedDB: Active=${migratedActive}, Archived=${migratedArchivedCount}. LocalStorage freed!`);
    }

    return { migrated: true, migratedActive, migratedArchivedCount };
  } catch (err) {
    console.error('[SAMX IDB Migration] Error during migration:', err);
    return { migrated: false, error: err.message };
  }
}

/**
 * قياس واستعراض مساحة التخزين المتوفرة للمتصفح
 */
export async function getStorageQuotaInfo() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = (estimate.usage / (1024 * 1024)).toFixed(1);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(0);
      const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
      return {
        usageBytes: estimate.usage,
        quotaBytes: estimate.quota,
        usageMB,
        quotaMB,
        usagePercent,
        formatted: `${usageMB} ميجابايت من أصل ${quotaMB} ميجابايت (${usagePercent}%)`
      };
    } catch (_) {}
  }
  return null;
}
