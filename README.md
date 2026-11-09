# Campus Maintenance and Complaint Tracking System
> **Alternative Title:** Online Smart Campus Complaint & Maintenance System  
> **Backend Architecture:** Supabase (Cloud PostgreSQL + Realtime WebSockets) + HTML5/CSS3/JavaScript Frontend

A fully working web-based facility management application developed strictly according to the specifications and wireframes detailed in the project documentation.

---

## ⚡ Live Supabase Cloud Backend Integration

The system is configured and connected directly to your Supabase project:
- **Project URL:** `https://tgdektiaeqzkhntxtbmf.supabase.co`
- **Database Engine:** PostgreSQL
- **Tables Connected:**
  - `users`: Credentials for Students, Staff, and Admins
  - `complaints`: Live maintenance requests and statuses
  - `staff`: Maintenance personnel directory
  - `feedback`: Student ratings and reviews
- **Realtime WebSockets Sync:** Enabled across all connected clients!

---

## 🚀 How to Set Up the Supabase Backend (in 3 Minutes)

### Step 1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in (free).
2. Click **New Project** & give it a name (e.g. `smart-campus-db`).

### Step 2: Run the Database Schema
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Open [`database/supabase_schema.sql`](file:///c:/Users/pragathi/OneDrive/Desktop/college%20website/database/supabase_schema.sql) in this repository.
3. Copy all the SQL code, paste it into the Supabase SQL Editor, and click **RUN**.
   - *This creates all 4 tables with Row Level Security (RLS) policies and inserts initial sample data!*

### Step 3: Connect the Frontend to Supabase
1. In your Supabase Dashboard, go to **Project Settings** &rarr; **API**.
2. Copy:
   - **Project URL** (e.g. `https://xyzabcdefg.supabase.co`)
   - **Project API Keys &rarr; anon public key**
3. Open `index.html` in your browser.
4. Click the **"Supabase Backend Setup"** button in the hero section (or the badge at the top right).
5. Paste your **URL** and **Anon Key**, then click **"Connect to Supabase"**.
6. The badge will turn green (**"🟢 Supabase Live Connected"**)!

> **Note:** If you haven't connected Supabase yet, the system gracefully operates in **Local Storage mode** with full functionality and sample data so you can always demonstrate it immediately offline.

---

## 📸 Mapping to Project Documentation & Notes

| Note Page | Content & Wireframe | Implemented in Project |
| :--- | :--- | :--- |
| **Page 1** | Technology Stack, Flowchart, Database Table Names (`users`, `complaints`, `staff`, `feedback`) | Flowchart hero banner, active DB state, and `database/supabase_schema.sql` |
| **Page 2** | Introduction, Purpose, Complaint Categories, Complaint Lifecycle (Pending &rarr; In Progress &rarr; Resolved) | Home page introductory section, category cards, and lifecycle status workflow |
| **Page 3** | Hardware & Software Configuration Specifications | Displayed under "System Technical Specifications" cards |
| **Page 4** | Home Page structure, Login Page Wireframe (`Username`, `Password`, `Role [Student v]`, `Login`, `Forgot password?`) | Modal & navigation login with 1-click test credentials |
| **Page 5** | **Submit Complaint Form Wireframe** (`Student Name`, `Student ID`, `Location`, `Complaint Category`, `Complaint Date`, `[Submit]`, `[Reset]`) | Interactive form under **Submit Complaint** view with auto ID generation and cloud database sync |
| **Page 5** | **Resolve Complaint Wireframe** (`Staff`, `Complaint ID`, `Student Name`, `Location`, `Complaint`, `Assigned Staff`, `Status`, `Resolution Remarks`, `[Resolve Complaint]`, `[Cancel]`) | Modal dialog with real-time status transitions, remarks storage, and cloud persistence |

---

## 🔑 Role-Based Access & Dynamic Workflows

All static fake complaints have been removed. Every action writes to and reads from Supabase dynamically.

### 🎓 1. Student Workflow
- **Login:** Enter your **Roll No** (e.g. `2024CS01` or `STU-2024-089`) and Password (`123`), Role: `Student`.
- **Registration:** New students can click **"Student / Staff Register"** in the login popup to register with their actual college Roll No!
- **Dashboard:** Displays **ONLY complaints submitted by that specific student**.
- **Submit Complaint:** Student Name and Roll No are auto-filled and locked from the student's profile.
- **Feedback:** Once staff resolves their complaint, students can rate the service (1-5 stars).

---

### 🛡️ 2. Admin Workflow
- **Login:** Username `admin` | Password `123` | Role: `Admin`.
- **Dashboard:** Displays **ALL complaints across the entire campus**.
- **Allocate Staff:** Admin clicks **"Allocate Staff"** on any pending problem, chooses an on-duty technician from the dropdown, and submits.
- The status instantly changes to `In Progress` in Supabase, and the task immediately lands in that specific technician's worklist!

---

### 🛠️ 3. Staff Workflow
- **Login:** Enter Staff ID (e.g. `STF-501` for Rajesh Kumar) and Password (`123`), Role: `Staff`.
- **Dashboard:** Displays **ONLY the maintenance tasks allocated to THIS technician by the Admin**.
- **"Done" Button:** When repair work is finished, the staff member clicks the green **"Done"** button, enters their work remarks, and clicks "Mark as Resolved".
- The complaint is immediately marked as **Resolved** across all dashboards in real time!

---

## 🔑 Demo Login Accounts

| Role | Roll No / ID | Username | Password | Full Name |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `2024CS01` or `STU-2024-089` | `student` | `123` | Rahul Sharma |
| **Student** | `STU-2024-114` | `priya` | `123` | Priya Patel |
| **Staff (Electrician)** | `STF-501` | `staff` | `123` | Rajesh Kumar |
| **Staff (Plumber)** | `STF-502` | `suresh` | `123` | Suresh Verma |
| **Admin** | `ADM-001` | `admin` | `123` | Campus Estate Administrator |
