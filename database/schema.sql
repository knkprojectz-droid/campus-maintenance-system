-- =====================================================================
-- DATABASE SCRIPT: Campus Maintenance and Complaint Tracking System
-- (Online Smart Campus Complaint & Maintenance System)
-- Target Database: Microsoft SQL Server / Azure SQL
-- =====================================================================

CREATE DATABASE CampusMaintenanceDB;
GO

USE CampusMaintenanceDB;
GO

-- 1. USERS TABLE
-- Stores credentials and user profile information for Students, Staff, and Admins
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('Student', 'Staff', 'Admin')),
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100),
    StudentOrStaffId NVARCHAR(30) UNIQUE,
    Department NVARCHAR(80),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 2. STAFF TABLE
-- Stores maintenance technicians and their technical category specialization
CREATE TABLE Staff (
    StaffID INT IDENTITY(1,1) PRIMARY KEY,
    StaffCode NVARCHAR(30) NOT NULL UNIQUE,
    FullName NVARCHAR(100) NOT NULL,
    Department NVARCHAR(80) NOT NULL, -- Electrical, Plumbing, Cleaning, Furniture, Internet Connectivity, Laboratories
    PhoneNumber NVARCHAR(20) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Available' CHECK (Status IN ('Available', 'Busy', 'On Leave')),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 3. COMPLAINTS TABLE
-- Core table storing maintenance complaints registered by students
CREATE TABLE Complaints (
    ComplaintID INT IDENTITY(1001,1) PRIMARY KEY,
    ComplaintCode AS ('CMP-' + CAST(ComplaintID AS NVARCHAR(20))) PERSISTED,
    StudentID NVARCHAR(30) NOT NULL,
    StudentName NVARCHAR(100) NOT NULL,
    Location NVARCHAR(150) NOT NULL,
    Category NVARCHAR(50) NOT NULL CHECK (Category IN (
        'Electrical', 'Plumbing', 'Cleaning', 'Furniture', 
        'Internet Connectivity', 'Classrooms', 'Laboratories'
    )),
    ComplaintDate DATE NOT NULL,
    Description NVARCHAR(MAX),
    AssignedStaffID INT NULL FOREIGN KEY REFERENCES Staff(StaffID),
    Status NVARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'In Progress', 'Resolved')),
    ResolutionRemarks NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    ResolvedAt DATETIME NULL
);
GO

-- 4. FEEDBACK TABLE
-- Stores student rating and review on resolved complaints
CREATE TABLE Feedback (
    FeedbackID INT IDENTITY(1,1) PRIMARY KEY,
    ComplaintID INT NOT NULL FOREIGN KEY REFERENCES Complaints(ComplaintID),
    StudentName NVARCHAR(100) NOT NULL,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comments NVARCHAR(MAX) NOT NULL,
    FeedbackDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =====================================================================
-- SAMPLE SEED DATA
-- =====================================================================

-- Seed Users
INSERT INTO Users (Username, Password, Role, FullName, Email, StudentOrStaffId, Department) VALUES
('student', '123', 'Student', 'Rahul Sharma', 'rahul@campus.edu', 'STU-2024-089', 'Computer Science'),
('priya', '123', 'Student', 'Priya Patel', 'priya@campus.edu', 'STU-2024-114', 'Electronics'),
('staff', '123', 'Staff', 'Rajesh Kumar', 'rajesh.staff@campus.edu', 'STF-501', 'Electrical'),
('suresh', '123', 'Staff', 'Suresh Verma', 'suresh.staff@campus.edu', 'STF-502', 'Plumbing'),
('admin', '123', 'Admin', 'Dr. Anand Raman', 'estate.head@campus.edu', 'ADM-001', 'Campus Estate Office');

-- Seed Staff
INSERT INTO Staff (StaffCode, FullName, Department, PhoneNumber, Status) VALUES
('STF-501', 'Rajesh Kumar', 'Electrical', '+91 98765 43210', 'Available'),
('STF-502', 'Suresh Verma', 'Plumbing', '+91 98765 43211', 'Available'),
('STF-503', 'Sunil Rao', 'Cleaning & Housekeeping', '+91 98765 43212', 'Busy'),
('STF-504', 'Manish Gupta', 'Internet Connectivity & IT', '+91 98765 43213', 'Available'),
('STF-505', 'Ramesh Carpenter', 'Furniture', '+91 98765 43214', 'Available'),
('STF-506', 'Dr. K. N. Murthy', 'Laboratories', '+91 98765 43215', 'Available');

-- Seed Complaints
INSERT INTO Complaints (StudentID, StudentName, Location, Category, ComplaintDate, Description, AssignedStaffID, Status, ResolutionRemarks) VALUES
('STU-2024-089', 'Rahul Sharma', 'Block A, Room 204', 'Electrical', '2026-11-01', 'Ceiling fan is making loud grinding noise and regulator knob is broken.', 1, 'In Progress', 'Regulator replaced; motor bearing servicing scheduled for today.'),
('STU-2024-114', 'Priya Patel', 'Central Library, 2nd Floor Washroom', 'Plumbing', '2026-11-02', 'Continuous water leakage from tap in washroom basin.', 2, 'Resolved', 'Replaced faulty rubber washer and valve. Leakage stopped completely.'),
('STU-2024-210', 'Amit Verma', 'Computer Lab 3, Systems 12-16', 'Internet Connectivity', '2026-11-04', 'Ethernet switch port down; students cannot access intranet portals.', 4, 'Pending', 'Awaiting patch cable inventory replacement.');

-- Seed Feedback
INSERT INTO Feedback (ComplaintID, StudentName, Rating, Comments, FeedbackDate) VALUES
(1002, 'Priya Patel', 5, 'Very quick resolution! Tap was fixed within 4 hours of submission. Thank you.', '2026-11-03');
GO

