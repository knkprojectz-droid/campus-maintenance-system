-- =====================================================================
-- SUPABASE POSTGRESQL SCHEMA SCRIPT
-- Project: Campus Maintenance and Complaint Tracking System
-- Tables: 1. users, 2. staff, 3. complaints, 4. feedback
-- =====================================================================

-- Enable UUID extension (built-in in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES (IF RE-RUNNING)
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CREATE USERS TABLE
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Student', 'Staff', 'Admin')),
    name TEXT NOT NULL,
    email TEXT,
    student_or_staff_id TEXT UNIQUE,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE STAFF TABLE
CREATE TABLE staff (
    id TEXT PRIMARY KEY, -- e.g., 'STF-501'
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    phone TEXT NOT NULL,
    active_tasks INT DEFAULT 0,
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Busy', 'On Leave')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE COMPLAINTS TABLE
CREATE TABLE complaints (
    id TEXT PRIMARY KEY, -- e.g., 'CMP-1001'
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Electrical', 'Plumbing', 'Cleaning', 'Furniture', 
        'Internet Connectivity', 'Classrooms', 'Laboratories'
    )),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    assigned_staff TEXT DEFAULT 'Unassigned',
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE FEEDBACK TABLE
CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    complaint_id TEXT REFERENCES complaints(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- For a college project demo, enable RLS with public read/write access
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all complaints" ON complaints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all feedback" ON feedback FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for the complaints table so all users see updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- =====================================================================
-- STATIC ADMINISTRATOR ACCOUNT
-- (Students and Staff sign up dynamically through the web application)
-- =====================================================================

-- Seed Static Admin Account
INSERT INTO users (username, password, role, name, email, student_or_staff_id, department) VALUES
('admin', '123', 'Admin', 'Campus Estate Administrator', 'admin@campus.edu', 'ADM-001', 'Campus Estate Office');

-- Note: All staff, complaints, and feedback are 100% dynamic!
-- Staff members appear when they Sign Up as Staff (Technician).
-- Complaints appear when Students submit them.

