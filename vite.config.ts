import { defineConfig, Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * محاكي وتزامن خدمات Cloudflare D1 المباشرة في بيئة التطوير
 * يحقق مزامنة فورية 100% بين الهواتف والأجهزة المختلفة بدون أي اعتماد على localStorage
 */
function cloudflareD1ApiPlugin(): Plugin {
  const storePath = path.resolve(process.cwd(), 'data/d1_store.json');

  function getStore() {
    try {
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {}
    return {
      branches: [
        { id: 'br_1', name: 'فرع النخيل مول', code: 'NKH-01', city: 'الرياض' },
        { id: 'br_2', name: 'فرع بانوراما مول', code: 'PAN-02', city: 'الرياض' },
        { id: 'br_3', name: 'فرع رد سي مول', code: 'RSM-03', city: 'جدة' },
        { id: 'br_4', name: 'فرع مجمع العرب', code: 'ARB-04', city: 'جدة' },
        { id: 'br_5', name: 'فرع الظهران مول', code: 'DHR-05', city: 'الظهران' }
      ],
      specialists: [
        { id: 'sp_1', name: 'سمير سلطان', email: 'sameer@samx.vm', phone: '0501234567' },
        { id: 'sp_2', name: 'أحمد الغامدي', email: 'ahmed@samx.vm', phone: '0502345678' },
        { id: 'sp_3', name: 'فيصل العتيبي', email: 'faisal@samx.vm', phone: '0503456789' },
        { id: 'sp_4', name: 'محمد الشهري', email: 'mohammed@samx.vm', phone: '0504567890' }
      ]
    };
  }

  function saveStore(data: any) {
    try {
      const dir = path.dirname(storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save d1 store:', e);
    }
  }

  return {
    name: 'cloudflare-d1-api-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        const method = (req.method || 'GET').toUpperCase();

        // 1. التعامل مع CORS Preflight لكافة مسارات الـ API
        if (url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
          res.setHeader('Access-Control-Max-Age', '86400');

          if (method === 'OPTIONS') {
            res.statusCode = 204;
            return res.end();
          }
        }

        // 2. مسار فحص الحالة
        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 200;
          return res.end(JSON.stringify({
            status: 'healthy',
            app: 'SAMX-VM',
            version: '1.4.0',
            hasD1: true,
            hasR2: true,
            timestamp: new Date().toISOString()
          }));
        }

        // 3. مسارات الفروع
        if (url === '/api/branches') {
          const store = getStore();
          if (method === 'GET') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, data: store.branches }));
          }

          if (method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const name = (parsed.name || '').trim();
                if (!name) {
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ success: false, error: 'اسم الفرع مطلوب' }));
                }

                const rawId = parsed.id;
                const id = (typeof rawId === 'number' && !isNaN(rawId))
                  ? rawId
                  : (parseInt(rawId, 10) || Date.now());

                const newBranch = {
                  id,
                  name,
                  code: parsed.code || '',
                  city: parsed.city || 'الرياض',
                  created_at: new Date().toISOString()
                };

                const existingIdx = store.branches.findIndex((b: any) => String(b.id) === String(id) || b.name === name);
                if (existingIdx !== -1) {
                  store.branches[existingIdx] = newBranch;
                } else {
                  store.branches.push(newBranch);
                }

                saveStore(store);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.statusCode = 201;
                return res.end(JSON.stringify({ success: true, data: newBranch }));
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
        }

        if (url.startsWith('/api/branches/')) {
          const rawTarget = decodeURIComponent(url.replace('/api/branches/', '').trim());
          if (method === 'DELETE') {
            const store = getStore();
            store.branches = store.branches.filter((b: any) => String(b.id) !== rawTarget && b.name !== rawTarget);
            saveStore(store);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, message: 'تم حذف الفرع بنجاح' }));
          }
        }

        // 4. مسارات أخصائيي الـ VM
        if (url === '/api/specialists') {
          const store = getStore();
          if (method === 'GET') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, data: store.specialists }));
          }

          if (method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const name = (parsed.name || '').trim();
                if (!name) {
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ success: false, error: 'اسم الأخصائي مطلوب' }));
                }

                const rawId = parsed.id;
                const id = (typeof rawId === 'number' && !isNaN(rawId))
                  ? rawId
                  : (parseInt(rawId, 10) || Date.now());

                const newSpecialist = {
                  id,
                  name,
                  email: parsed.email || '',
                  phone: parsed.phone || '',
                  created_at: new Date().toISOString()
                };

                const existingIdx = store.specialists.findIndex((s: any) => String(s.id) === String(id) || s.name === name);
                if (existingIdx !== -1) {
                  store.specialists[existingIdx] = newSpecialist;
                } else {
                  store.specialists.push(newSpecialist);
                }

                saveStore(store);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.statusCode = 201;
                return res.end(JSON.stringify({ success: true, data: newSpecialist }));
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
        }

        if (url.startsWith('/api/specialists/')) {
          const rawTarget = decodeURIComponent(url.replace('/api/specialists/', '').trim());
          if (method === 'DELETE') {
            const store = getStore();
            store.specialists = store.specialists.filter((s: any) => s.id !== rawTarget && s.name !== rawTarget);
            saveStore(store);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, message: 'تم حذف الأخصائي بنجاح' }));
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [cloudflareD1ApiPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  preview: {
    allowedHosts: true,
  },
});
