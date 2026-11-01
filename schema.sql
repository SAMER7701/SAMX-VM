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

-- 4. الفهارس لتسريع الاستعلام والبحث
CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_reports(branch_name);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_reports(audit_date);
CREATE INDEX IF NOT EXISTS idx_audit_auditor ON audit_reports(auditor_name);
