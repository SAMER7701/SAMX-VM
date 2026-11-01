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
 * معالج طلبات الـ API المركزية
 */
async function handleApiRequest(pathname, method, request, env) {
  // فحص جاهزية النظام وقاعدة البيانات
  if (pathname === '/api/health') {
    return jsonResponse({
      status: 'healthy',
      app: 'SAMX-VM',
      version: '1.3.0',
      hasD1: Boolean(env.DB),
      hasR2: Boolean(env.STORAGE_BUCKET),
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================
  // مسارات الفروع (BRANCHES CRUD)
  // ==========================================
  if (pathname === '/api/branches') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, code, city, created_at FROM branches ORDER BY name ASC'
      ).all();
      return jsonResponse({ success: true, data: results || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const name = (body.name || '').trim();
      const id = body.id || `br_${Date.now()}`;
      const code = body.code || '';
      const city = body.city || 'الرياض';

      if (!name) {
        return errorResponse('اسم الفرع مطلوب');
      }

      await env.DB.prepare(
        'INSERT INTO branches (id, name, code, city) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, city=excluded.city'
      ).bind(id, name, code, city).run();

      return jsonResponse({ success: true, data: { id, name, code, city } }, 201);
    }
  }

  if (pathname.startsWith('/api/branches/')) {
    const id = pathname.replace('/api/branches/', '').trim();
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM branches WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true, message: 'تم حذف الفرع بنجاح' });
    }
  }

  // ==========================================
  // مسارات أخصائيي الـ VM (SPECIALISTS CRUD)
  // ==========================================
  if (pathname === '/api/specialists') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, email, phone, created_at FROM specialists ORDER BY name ASC'
      ).all();
      return jsonResponse({ success: true, data: results || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const name = (body.name || '').trim();
      const id = body.id || `sp_${Date.now()}`;
      const email = body.email || '';
      const phone = body.phone || '';

      if (!name) {
        return errorResponse('اسم الأخصائي مطلوب');
      }

      await env.DB.prepare(
        'INSERT INTO specialists (id, name, email, phone) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name'
      ).bind(id, name, email, phone).run();

      return jsonResponse({ success: true, data: { id, name, email, phone } }, 201);
    }
  }

  if (pathname.startsWith('/api/specialists/')) {
    const id = pathname.replace('/api/specialists/', '').trim();
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM specialists WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true, message: 'تم حذف الأخصائي بنجاح' });
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

  return errorResponse('المسار المطلوب غير موجود', 404);
}
