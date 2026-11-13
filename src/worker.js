/**
 * SAMX-VM: Cloudflare Worker API & Storage Backend
 * Architecture: Edge Worker with Cloudflare D1 (SQLite) and Cloudflare R2 (Object Storage)
 * Version: 1.3.0
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Helper: Response JSON
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

// Helper: Response Error
function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // 1. التعامل مع طلبات CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. توجيه مسارات الـ API
    if (pathname.startsWith('/api/')) {
      try {
        return await handleApiRequest(pathname, method, request, env);
      } catch (err) {
        console.error('API Error:', err);
        return errorResponse(`Server Error: ${err.message}`, 500);
      }
    }

    // 3. خدمة الملفات الثابتة (Static Assets - Frontend SPA)
    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    return new Response('SAMX-VM Worker Active', { status: 200 });
  },
};

/**
 * ضمان إنشاء وتحديث جداول قاعدة بيانات Cloudflare D1 تلقائياً
 */
let schemaInitialized = false;
async function ensureDatabaseSchema(db) {
  if (!db || schemaInitialized) return;

  try {
    // 1. جدول الفروع
    await db.prepare(`CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT,
      city TEXT DEFAULT 'الرياض',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (e) {}

  // هجرات ترقية آمنة للأعمدة
  try { await db.prepare("ALTER TABLE branches ADD COLUMN code TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE branches ADD COLUMN city TEXT DEFAULT 'الرياض'").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE branches ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP").run(); } catch (e) {}

  try {
    // 2. جدول أخصائيي الـ VM
    await db.prepare(`CREATE TABLE IF NOT EXISTS specialists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (e) {}

  try { await db.prepare("ALTER TABLE specialists ADD COLUMN email TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE specialists ADD COLUMN phone TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE specialists ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP").run(); } catch (e) {}

  try {
    // 3. جدول أقسام المعرض والمعايير
    await db.prepare(`CREATE TABLE IF NOT EXISTS store_sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      standards_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (e) {}

  try {
    // 4. جدول تقارير التدقيق
    await db.prepare(`CREATE TABLE IF NOT EXISTS audit_reports (
      id TEXT PRIMARY KEY,
      branch_name TEXT NOT NULL,
      auditor_name TEXT NOT NULL,
      audit_date TEXT NOT NULL,
      week_number INTEGER DEFAULT 1,
      total_sections INTEGER DEFAULT 0,
      overall_status TEXT DEFAULT 'pending',
      data_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (e) {}

  try { await db.prepare("ALTER TABLE audit_reports ADD COLUMN auditor_name TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE audit_reports ADD COLUMN branch_name TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE audit_reports ADD COLUMN audit_date TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE audit_reports ADD COLUMN week_number INTEGER DEFAULT 1").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE audit_reports ADD COLUMN total_sections INTEGER DEFAULT 0").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE audit_reports ADD COLUMN overall_status TEXT DEFAULT 'pending'").run(); } catch (e) {}

  try {
    // 5. جدول المستخدمين والأخصائيين
    await db.prepare(`CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'specialist',
      branches_json TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // تأكيد وجود حساب المدير الفائق sam / 7701
    await db.prepare(`INSERT OR IGNORE INTO users (username, password, display_name, role, branches_json)
      VALUES ('sam', '7701', 'سمير سلطان (مدير النظام)', 'admin', '["*"]')`).run();
  } catch (e) {}

  try {
    // 6. جدول جولات التدقيق الميداني السحابية
    await db.prepare(`CREATE TABLE IF NOT EXISTS tours (
      id TEXT PRIMARY KEY,
      owner_username TEXT NOT NULL,
      specialist_name TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      week_num INTEGER DEFAULT 1,
      audit_date TEXT NOT NULL,
      summary_json TEXT,
      r2_payload_key TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (e) {}

  try { await db.prepare("ALTER TABLE tours ADD COLUMN summary_json TEXT").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE tours ADD COLUMN r2_payload_key TEXT").run(); } catch (e) {}

  schemaInitialized = true;
}

/**
 * معالج طلبات الـ API المركزية
 */
async function handleApiRequest(pathname, method, request, env) {
  // فحص وترقية الجداول تلقائياً إن كانت قاعدة البيانات مربوطة
  if (env.DB) {
    try {
      await ensureDatabaseSchema(env.DB);
    } catch (err) {
      console.warn('ensureDatabaseSchema warning:', err);
    }
  }

  // فحص جاهزية النظام وقاعدة البيانات
  if (pathname === '/api/health') {
    return jsonResponse({
      status: 'healthy',
      app: 'SAMX-VM',
      version: '1.7.5',
      hasD1: Boolean(env.DB),
      hasR2: Boolean(env.STORAGE_BUCKET),
      timestamp: new Date().toISOString(),
    });
  }

  // مسار إعادة تهيئة وهجرة المخطط صراحة
  if (pathname === '/api/migrate') {
    schemaInitialized = false;
    await ensureDatabaseSchema(env.DB);
    return jsonResponse({ success: true, message: 'تم فحص وترقية جداول D1 بنجاح' });
  }

  // ==========================================
  // مسارات الفروع (BRANCHES CRUD)
  // ==========================================
  if (pathname === '/api/branches') {
    if (method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, name, code, city, created_at FROM branches ORDER BY name ASC'
        ).all();
        return jsonResponse({ success: true, data: results || [] });
      } catch (err) {
        // Fallback آمن إن لم تكن الأعمدة الإضافية موجودة بعد
        const { results } = await env.DB.prepare(
          'SELECT id, name, created_at FROM branches ORDER BY name ASC'
        ).all();
        return jsonResponse({
          success: true,
          data: (results || []).map(r => ({
            id: r.id,
            name: r.name,
            code: r.code || '',
            city: r.city || 'الرياض',
            created_at: r.created_at
          }))
        });
      }
    }

    if (method === 'POST') {
      const body = await request.json();
      const name = (body.name || '').trim();
      const rawId = body.id;
      let id;
      if (typeof rawId === 'number' && !isNaN(rawId)) {
        id = rawId;
      } else if (typeof rawId === 'string' && /^\d+$/.test(rawId.trim())) {
        id = parseInt(rawId.trim(), 10);
      } else {
        id = Date.now();
      }
      const code = body.code || '';
      const city = body.city || 'الرياض';

      if (!name) {
        return errorResponse('اسم الفرع مطلوب');
      }

      try {
        await env.DB.prepare(
          'INSERT INTO branches (id, name, code, city) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, city=excluded.city'
        ).bind(id, name, code, city).run();
      } catch (err) {
        try {
          await env.DB.prepare(
            'UPDATE branches SET code = ?, city = ? WHERE name = ?'
          ).bind(code, city, name).run();
        } catch (err2) {
          // Fallback آمن لأعمدة id, name فقط
          await env.DB.prepare(
            'INSERT INTO branches (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name'
          ).bind(id, name).run();
        }
      }

      return jsonResponse({ success: true, data: { id, name, code, city } }, 201);
    }
  }

  if (pathname.startsWith('/api/branches/')) {
    const rawTarget = decodeURIComponent(pathname.replace('/api/branches/', '').trim());
    if (method === 'DELETE') {
      const numTarget = parseInt(rawTarget, 10);
      if (!isNaN(numTarget)) {
        await env.DB.prepare('DELETE FROM branches WHERE id = ? OR name = ?').bind(numTarget, rawTarget).run();
      } else {
        await env.DB.prepare('DELETE FROM branches WHERE name = ? OR id = ?').bind(rawTarget, rawTarget).run();
      }
      return jsonResponse({ success: true, message: 'تم حذف الفرع بنجاح' });
    }
  }

  // ==========================================
  // مسارات أخصائيي الـ VM (SPECIALISTS CRUD)
  // ==========================================
  if (pathname === '/api/specialists') {
    if (method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, name, email, phone, created_at FROM specialists ORDER BY name ASC'
        ).all();
        return jsonResponse({ success: true, data: results || [] });
      } catch (err) {
        const { results } = await env.DB.prepare(
          'SELECT id, name, created_at FROM specialists ORDER BY name ASC'
        ).all();
        return jsonResponse({
          success: true,
          data: (results || []).map(r => ({
            id: r.id,
            name: r.name,
            email: r.email || '',
            phone: r.phone || '',
            created_at: r.created_at
          }))
        });
      }
    }

    if (method === 'POST') {
      const body = await request.json();
      const name = (body.name || '').trim();
      const rawId = body.id;
      let id;
      if (typeof rawId === 'number' && !isNaN(rawId)) {
        id = rawId;
      } else if (typeof rawId === 'string' && /^\d+$/.test(rawId.trim())) {
        id = parseInt(rawId.trim(), 10);
      } else {
        id = Date.now();
      }
      const email = body.email || '';
      const phone = body.phone || '';

      if (!name) {
        return errorResponse('اسم الأخصائي مطلوب');
      }

      try {
        await env.DB.prepare(
          'INSERT INTO specialists (id, name, email, phone) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name'
        ).bind(id, name, email, phone).run();
      } catch (err) {
        try {
          await env.DB.prepare(
            'UPDATE specialists SET email = ?, phone = ? WHERE name = ?'
          ).bind(email, phone, name).run();
        } catch (err2) {
          await env.DB.prepare(
            'INSERT INTO specialists (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name'
          ).bind(id, name).run();
        }
      }

      return jsonResponse({ success: true, data: { id, name, email, phone } }, 201);
    }
  }

  if (pathname.startsWith('/api/specialists/')) {
    const rawTarget = decodeURIComponent(pathname.replace('/api/specialists/', '').trim());
    if (method === 'DELETE') {
      const numTarget = parseInt(rawTarget, 10);
      if (!isNaN(numTarget)) {
        await env.DB.prepare('DELETE FROM specialists WHERE id = ? OR name = ?').bind(numTarget, rawTarget).run();
      } else {
        await env.DB.prepare('DELETE FROM specialists WHERE name = ? OR id = ?').bind(rawTarget, rawTarget).run();
      }
      return jsonResponse({ success: true, message: 'تم حذف الأخصائي بنجاح' });
    }
  }

  // ==========================================
  // مسارات أقسام المعرض ومعايير الـ VM (SECTIONS & STANDARDS CRUD)
  // ==========================================
  if (pathname === '/api/sections') {
    try {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS store_sections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          standards_json TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ).run();
    } catch (e) {
      console.warn('Table create store_sections warning:', e);
    }

    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, standards_json, created_at, updated_at FROM store_sections ORDER BY name ASC'
      ).all();
      return jsonResponse({ success: true, data: results || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const name = (body.name || '').trim();
      const oldName = (body.oldName || '').trim();
      const id = body.id || `sec_${Date.now()}`;
      const standardsJson = JSON.stringify(body.standards || []);

      if (!name) {
        return errorResponse('اسم القسم مطلوب');
      }

      if (oldName && oldName !== name) {
        await env.DB.prepare('DELETE FROM store_sections WHERE name = ?').bind(oldName).run();
      }

      await env.DB.prepare(
        `INSERT INTO store_sections (id, name, standards_json, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(name) DO UPDATE SET 
           standards_json = excluded.standards_json, 
           updated_at = CURRENT_TIMESTAMP`
      ).bind(id, name, standardsJson).run();

      return jsonResponse({ success: true, data: { id, name, standards: body.standards || [] } }, 201);
    }
  }

  if (pathname.startsWith('/api/sections/')) {
    const rawTarget = decodeURIComponent(pathname.replace('/api/sections/', '').trim());
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM store_sections WHERE id = ? OR name = ?').bind(rawTarget, rawTarget).run();
      return jsonResponse({ success: true, message: 'تم حذف القسم بنجاح' });
    }
  }

  // ==========================================
  // مسارات تقارير المعاينة (AUDIT REPORTS)
  // ==========================================
  if (pathname === '/api/audits') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT id, branch_name, auditor_name, audit_date, week_number, total_sections, overall_status, updated_at 
         FROM audit_reports 
         ORDER BY audit_date DESC, updated_at DESC LIMIT 100`
      ).all();
      return jsonResponse({ success: true, data: results || [] });
    }

    if (method === 'POST') {
      const audit = await request.json();
      if (!audit || !audit.id) {
        return errorResponse('بيانات التقرير أو المعرف غير صالحة');
      }

      const id = audit.id;
      const branchName = audit.branchName || 'غير محدد';
      const auditorName = audit.auditorName || 'غير محدد';
      const auditDate = audit.auditDate || new Date().toISOString().split('T')[0];
      const weekNumber = Number(audit.weekNumber) || 1;
      const totalSections = Array.isArray(audit.sections) ? audit.sections.length : 0;
      const overallStatus = audit.overallStatus || 'completed';
      const dataJson = JSON.stringify(audit);
      const now = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO audit_reports (id, branch_name, auditor_name, audit_date, week_number, total_sections, overall_status, data_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
           branch_name=excluded.branch_name,
           auditor_name=excluded.auditor_name,
           audit_date=excluded.audit_date,
           week_number=excluded.week_number,
           total_sections=excluded.total_sections,
           overall_status=excluded.overall_status,
           data_json=excluded.data_json,
           updated_at=excluded.updated_at`
      ).bind(id, branchName, auditorName, auditDate, weekNumber, totalSections, overallStatus, dataJson, now).run();

      return jsonResponse({ success: true, message: 'تم حفظ التقرير سحابياً بنجاح', id });
    }
  }

  if (pathname.startsWith('/api/audits/')) {
    const id = pathname.replace('/api/audits/', '').trim();
    if (method === 'GET') {
      const auditRecord = await env.DB.prepare(
        'SELECT * FROM audit_reports WHERE id = ?'
      ).bind(id).first();

      if (!auditRecord) {
        return errorResponse('التقرير غير موجود', 404);
      }

      let parsedData = null;
      try {
        parsedData = JSON.parse(auditRecord.data_json);
      } catch (e) {
        parsedData = auditRecord;
      }

      return jsonResponse({ success: true, data: parsedData });
    }

    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM audit_reports WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true, message: 'تم حذف التقرير بنجاح' });
    }
  }

  // ==========================================
  // مسارات تخزين الصور عبر Cloudflare R2
  // ==========================================
  if (pathname === '/api/upload-image' && method === 'POST') {
    if (!env.STORAGE_BUCKET) {
      return errorResponse('Cloudflare R2 Bucket not configured (STORAGE_BUCKET missing)', 500);
    }

    const contentTypeHeader = request.headers.get('content-type') || '';
    let imageBuffer = null;
    let mimeType = 'image/jpeg';
    let fileExt = 'jpg';

    // الحالة 1: رفع عبر JSON (Base64 DataURL)
    if (contentTypeHeader.includes('application/json')) {
      const body = await request.json();
      const base64Data = body.image || '';
      if (!base64Data) {
        return errorResponse('حقل الصورة base64 مفقود');
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        fileExt = mimeType.split('/')[1] || 'jpg';
        const binaryString = atob(matches[2]);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        imageBuffer = bytes.buffer;
      } else {
        return errorResponse('صيغة Base64 Data URL غير صحيحة');
      }
    } 
    // الحالة 2: رفع عبر FormData / Multipart
    else if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return errorResponse('ملف الصورة غير موجود في النموذج');
      }
      mimeType = file.type || 'image/jpeg';
      fileExt = mimeType.split('/')[1] || 'jpg';
      imageBuffer = await file.arrayBuffer();
    } else {
      return errorResponse('نوع المحتوى غير مدعوم (استخدم JSON Base64 أو FormData)');
    }

    // توليد مفتاح فريد للصورة في سلة التخزين R2
    const key = `audits/${new Date().toISOString().slice(0, 10)}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

    await env.STORAGE_BUCKET.put(key, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    // رابط استرجاع الصورة من الـ Worker
    const imageUrl = `/api/images/${key}`;

    return jsonResponse({
      success: true,
      key,
      url: imageUrl,
      size: imageBuffer.byteLength,
      mimeType,
    }, 201);
  }

  // مسار جلب وعرض الصور المخزنة في R2
  if (pathname.startsWith('/api/images/')) {
    if (!env.STORAGE_BUCKET) {
      return errorResponse('Cloudflare R2 Bucket is not configured', 500);
    }

    const key = pathname.replace('/api/images/', '').trim();
    if (!key) {
      return errorResponse('مفتاح الصورة مطلوب', 400);
    }

    const object = await env.STORAGE_BUCKET.get(key);
    if (!object) {
      return new Response('الصورة غير موجودة', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      headers,
    });
  }

  // ==========================================
  // مسارات المصادقة السحابية (AUTH API)
  // ==========================================
  if (pathname === '/api/login' && method === 'POST') {
    const body = await request.json();
    const username = (body.username || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!username || !password) {
      return errorResponse('اسم المستخدم وكلمة المرور مطلوبان', 400);
    }

    // مدير النظام الفائق sam / 7701 مضمون دائماً
    if (username === 'sam' && password === '7701') {
      return jsonResponse({
        success: true,
        user: {
          username: 'sam',
          displayName: 'سمير سلطان (مدير النظام)',
          role: 'admin',
          assignedBranches: ['*']
        }
      });
    }

    if (env.DB) {
      try {
        const user = await env.DB.prepare(
          'SELECT username, password, display_name, role, branches_json FROM users WHERE LOWER(username) = ?'
        ).bind(username).first();

        if (user && user.password === password) {
          let assignedBranches = ['*'];
          try {
            assignedBranches = JSON.parse(user.branches_json || '["*"]');
          } catch (e) {}

          return jsonResponse({
            success: true,
            user: {
              username: user.username,
              displayName: user.display_name,
              role: user.role,
              assignedBranches
            }
          });
        }
      } catch (err) {
        console.error('D1 login query error:', err);
      }
    }

    return errorResponse('بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور', 401);
  }

  // ==========================================
  // مسارات إدارة فريق العمل والمستخدمين (USERS CRUD)
  // ==========================================
  if (pathname === '/api/users') {
    if (method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT username, password, display_name, role, branches_json, updated_at FROM users ORDER BY role ASC, display_name ASC'
        ).all();

        const formatted = (results || []).map(u => {
          let branches = [];
          try { branches = JSON.parse(u.branches_json || '[]'); } catch (e) {}
          return {
            username: u.username,
            password: u.password,
            displayName: u.display_name,
            role: u.role,
            assignedBranches: branches,
            updatedAt: u.updated_at
          };
        });

        return jsonResponse({ success: true, data: formatted });
      } catch (err) {
        return errorResponse(`فشل جلب المستخدمين: ${err.message}`, 500);
      }
    }

    if (method === 'POST') {
      const body = await request.json();
      const rawUsername = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const displayName = (body.displayName || body.name || '').trim();
      let role = body.role || 'specialist';
      const assignedBranches = Array.isArray(body.assignedBranches) ? body.assignedBranches : ['*'];

      if (!rawUsername || !password || !displayName) {
        return errorResponse('اسم المستخدم وكلمة المرور والاسم الثلاثي حقول إجبارية', 400);
      }

      // حماية حساب sam
      if (rawUsername === 'sam') {
        role = 'admin';
      }

      const branchesJson = JSON.stringify(assignedBranches);

      try {
        await env.DB.prepare(
          `INSERT INTO users (username, password, display_name, role, branches_json, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(username) DO UPDATE SET 
             password = excluded.password,
             display_name = excluded.display_name,
             role = excluded.role,
             branches_json = excluded.branches_json,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(rawUsername, password, displayName, role, branchesJson).run();

        // مزامنة الأخصائي في جدول specialists إذا كان أخصائياً
        if (role === 'specialist') {
          try {
            await env.DB.prepare(
              `INSERT INTO specialists (id, name, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET name=excluded.name`
            ).bind(`sp_${rawUsername}`, displayName).run();
          } catch (e) {}
        }

        return jsonResponse({
          success: true,
          user: {
            username: rawUsername,
            displayName,
            role,
            assignedBranches
          }
        }, 201);
      } catch (err) {
        return errorResponse(`فشل حفظ المستخدم: ${err.message}`, 500);
      }
    }
  }

  if (pathname.startsWith('/api/users/')) {
    const targetUsername = decodeURIComponent(pathname.replace('/api/users/', '').trim()).toLowerCase();
    if (method === 'DELETE') {
      if (targetUsername === 'sam') {
        return errorResponse('لا يمكن حذف حساب مدير النظام الفائق (sam)', 403);
      }

      try {
        await env.DB.prepare('DELETE FROM users WHERE LOWER(username) = ?').bind(targetUsername).run();
        return jsonResponse({ success: true, message: 'تم حذف المستخدم بنجاح' });
      } catch (err) {
        return errorResponse(`فشل حذف المستخدم: ${err.message}`, 500);
      }
    }
  }

  // ==========================================
  // مسارات جولات التدقيق الميداني السحابية (TOURS CRUD)
  // ==========================================
  if (pathname === '/api/tours') {
    const urlObj = new URL(request.url);
    const userParam = (urlObj.searchParams.get('user') || '').toLowerCase();
    const roleParam = (urlObj.searchParams.get('role') || 'specialist').toLowerCase();
    const specialistParam = urlObj.searchParams.get('specialist') || 'all';

    if (method === 'GET') {
      try {
        let query = 'SELECT id, owner_username, specialist_name, branch_name, week_num, audit_date, summary_json, r2_payload_key, updated_at FROM tours';
        const params = [];

        if (roleParam !== 'admin') {
          // عزل بيانات الأخصائي: يرى جولاته فقط
          query += ' WHERE LOWER(owner_username) = ?';
          params.push(userParam);
        } else if (specialistParam && specialistParam !== 'all') {
          // فلترة المدير حسب الأخصائي المحدد
          query += ' WHERE specialist_name = ? OR LOWER(owner_username) = ?';
          params.push(specialistParam, specialistParam.toLowerCase());
        }

        query += ' ORDER BY audit_date DESC, updated_at DESC LIMIT 200';

        let stmt = env.DB.prepare(query);
        if (params.length > 0) {
          stmt = stmt.bind(...params);
        }
        const { results } = await stmt.all();

        const toursList = (results || []).map(r => {
          let summary = {};
          try { summary = JSON.parse(r.summary_json || '{}'); } catch (e) {}
          return {
            id: r.id,
            ownerUsername: r.owner_username,
            specialistName: r.specialist_name,
            auditorName: r.specialist_name,
            branchName: r.branch_name,
            weekNumber: r.week_num,
            auditDate: r.audit_date,
            updatedAt: r.updated_at,
            monthKey: summary.monthKey,
            monthName: summary.monthName,
            sectionsCount: summary.sectionsCount,
            visitSummary: summary.visitSummary,
            r2Key: r.r2_payload_key
          };
        });

        return jsonResponse({ success: true, data: toursList });
      } catch (err) {
        return errorResponse(`فشل جلب الجولات: ${err.message}`, 500);
      }
    }

    if (method === 'POST') {
      const tour = await request.json();
      if (!tour || !tour.id) {
        return errorResponse('بيانات الجولة أو المعرف غير صالحة', 400);
      }

      const id = tour.id;
      const ownerUsername = (tour.ownerUsername || 'sam').toLowerCase();
      const specialistName = tour.specialistName || tour.auditorName || 'سمير سلطان';
      const branchName = tour.branchName || 'معرض غير محدد';
      const weekNum = Number(tour.weekNumber) || 43;
      const auditDate = tour.auditDate || new Date().toISOString().split('T')[0];
      const r2Key = `tours/${ownerUsername}/${id}.json`;

      const summaryJson = JSON.stringify({
        monthKey: tour.monthKey,
        monthName: tour.monthName,
        sectionsCount: Array.isArray(tour.sections) ? tour.sections.length : 0,
        visitSummary: tour.visitSummary || ''
      });

      // حفظ الحمولة الكاملة في Cloudflare R2
      if (env.STORAGE_BUCKET) {
        try {
          await env.STORAGE_BUCKET.put(r2Key, JSON.stringify(tour), {
            httpMetadata: { contentType: 'application/json; charset=utf-8' }
          });
        } catch (r2Err) {
          console.warn('R2 tour payload write warning:', r2Err.message);
        }
      }

      // حفظ البيانات في D1 tours
      try {
        await env.DB.prepare(
          `INSERT INTO tours (id, owner_username, specialist_name, branch_name, week_num, audit_date, summary_json, r2_payload_key, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET 
             owner_username = excluded.owner_username,
             specialist_name = excluded.specialist_name,
             branch_name = excluded.branch_name,
             week_num = excluded.week_num,
             audit_date = excluded.audit_date,
             summary_json = excluded.summary_json,
             r2_payload_key = excluded.r2_payload_key,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(id, ownerUsername, specialistName, branchName, weekNum, auditDate, summaryJson, r2Key).run();

        // حفظ في audit_reports أيضاً للتوافق الكامل
        try {
          await env.DB.prepare(
            `INSERT INTO audit_reports (id, branch_name, auditor_name, audit_date, week_number, total_sections, data_json, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`
          ).bind(id, branchName, specialistName, auditDate, weekNum, Array.isArray(tour.sections) ? tour.sections.length : 0, JSON.stringify(tour)).run();
        } catch (e) {}

        return jsonResponse({ success: true, id, message: 'تم حفظ الجولة سحابياً بنجاح' }, 201);
      } catch (err) {
        return errorResponse(`فشل حفظ الجولة: ${err.message}`, 500);
      }
    }
  }

  if (pathname.startsWith('/api/tours/')) {
    const tourId = decodeURIComponent(pathname.replace('/api/tours/', '').trim());

    if (method === 'GET') {
      // محاولة الجلب أولاً من R2
      if (env.STORAGE_BUCKET) {
        try {
          const rec = await env.DB.prepare('SELECT r2_payload_key FROM tours WHERE id = ?').bind(tourId).first();
          const r2Key = rec?.r2_payload_key || `tours/sam/${tourId}.json`;
          const r2Obj = await env.STORAGE_BUCKET.get(r2Key);
          if (r2Obj) {
            const fullJson = await r2Obj.json();
            return jsonResponse({ success: true, data: fullJson });
          }
        } catch (e) {}
      }

      // Fallback إلى جدول audit_reports
      try {
        const auditRecord = await env.DB.prepare('SELECT data_json FROM audit_reports WHERE id = ?').bind(tourId).first();
        if (auditRecord && auditRecord.data_json) {
          return jsonResponse({ success: true, data: JSON.parse(auditRecord.data_json) });
        }
      } catch (e) {}

      return errorResponse('الجولة غير موجودة', 404);
    }

    if (method === 'DELETE') {
      try {
        const rec = await env.DB.prepare('SELECT r2_payload_key FROM tours WHERE id = ?').bind(tourId).first();
        if (rec && rec.r2_payload_key && env.STORAGE_BUCKET) {
          try { await env.STORAGE_BUCKET.delete(rec.r2_payload_key); } catch (e) {}
        }

        await env.DB.prepare('DELETE FROM tours WHERE id = ?').bind(tourId).run();
        await env.DB.prepare('DELETE FROM audit_reports WHERE id = ?').bind(tourId).run();

        return jsonResponse({ success: true, message: 'تم حذف الجولة بنجاح' });
      } catch (err) {
        return errorResponse(`فشل حذف الجولة: ${err.message}`, 500);
      }
    }
  }

  return errorResponse('المسار المطلوب غير موجود', 404);
}
