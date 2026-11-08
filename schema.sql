-- ====================================================================
-- SAMX-VM: Cloudflare D1 Database Schema
-- Database: samx-vm-db (SQLite on Cloudflare Global Network)
-- ====================================================================

-- 1. جدول الفروع (Branches)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  city TEXT DEFAULT 'الرياض',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول أخصائيي العرض المرئي (VM Specialists)
CREATE TABLE IF NOT EXISTS specialists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. جدول تقارير التدقيق الميداني (Audit Reports)
CREATE TABLE IF NOT EXISTS audit_reports (
  id TEXT PRIMARY KEY,
  branch_name TEXT NOT NULL,
  auditor_name TEXT NOT NULL,
  audit_date TEXT NOT NULL,
  week_number INTEGER DEFAULT 1,
  total_sections INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'pending',
  data_json TEXT NOT NULL, -- Full audit JSON document with sections, checklist, and actions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول أقسام المعرض ومعايير العرض المرئي (Store Sections & VM Standards)
CREATE TABLE IF NOT EXISTS store_sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  standards_json TEXT, -- JSON array of standard checklist strings
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. جدول المستخدمين والأخصائيين (Users & Authentication)
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'specialist',
  branches_json TEXT DEFAULT '[]', -- JSON array of assigned branch names
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Super Admin sam / 7701
INSERT OR IGNORE INTO users (username, password, display_name, role, branches_json)
VALUES ('sam', '7701', 'سمير سلطان (مدير النظام)', 'admin', '["*"]');

-- 6. جدول جولات التدقيق الميداني السحابية (Cloud Tours)
CREATE TABLE IF NOT EXISTS tours (
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
);

-- 7. الفهارس لتسريع الاستعلام والبحث
CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_reports(branch_name);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_reports(audit_date);
CREATE INDEX IF NOT EXISTS idx_audit_auditor ON audit_reports(auditor_name);
CREATE INDEX IF NOT EXISTS idx_sections_name ON store_sections(name);
CREATE INDEX IF NOT EXISTS idx_tours_owner ON tours(owner_username);
CREATE INDEX IF NOT EXISTS idx_tours_branch ON tours(branch_name);
CREATE INDEX IF NOT EXISTS idx_tours_date ON tours(audit_date);
