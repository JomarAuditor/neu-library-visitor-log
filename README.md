# NEU Library Visitor Log System

**New Era University – Library Management System**

---

# 1. Project Description

The **NEU Library Visitor Log System** is a web-based application designed to record and monitor student visits to the New Era University Library.

The system replaces the traditional paper visitor logbook with a **digital QR-based check-in system**. Students can register once and generate their own QR code. They use this QR code to **scan when entering and leaving the library**.

The first scan records **Time In**, and the second scan records **Time Out**. The system calculates the **duration of the visit automatically**.

Library administrators can access a dashboard that displays **real-time visitor statistics**, including how many students are currently inside the library.

The system is built using modern web technologies including **React, TypeScript, and Supabase**, allowing real-time updates, data visualization, and easy management of visitor records.

---

# 2. System Features

## Visitor Features

Students can interact with the system through a simple and mobile-friendly interface.

**Student capabilities:**

* Register using institutional email and student number
* Generate a personal QR code
* Scan QR code to enter the library
* Scan again when leaving the library
* Select purpose of visit
* View confirmation screens for Time In and Time Out
* Receive automatic visit duration calculation

The system also allows students to log in using:

* QR code scanning
* Email and student number input

---

## Administrator Features

Administrators can monitor library activity through a secure dashboard.

**Admin capabilities:**

* View visitor statistics (Today, Week, Month, Year)
* See how many students are currently inside the library
* View visitor logs with full visit details
* Export visitor records to CSV format
* Manage student accounts
* Block or unblock student access
* View charts showing visitor distribution by college and course
* Monitor the system in real time

---

# 3. Time In / Time Out System

The system uses a simple logic to determine whether a student is entering or leaving the library.

### Time In

When a student scans their QR code for the first time:

* The system inserts a new record into the **visitor_logs** table
* `time_in` is recorded using the current timestamp
* `time_out` remains **NULL**

This means the student is **currently inside the library**.

---

### Time Out

When the student scans again:

* The system searches for an existing record where `time_out` is NULL
* If found, the system updates the record
* `time_out` is recorded
* The visit duration is calculated

The student then sees a **Goodbye screen showing their total visit time**.

---

### Currently Inside Counter

Students currently inside the library are determined using this condition:

```
time_out IS NULL
```

These records are used to display the **live "Currently Inside" counter on the admin dashboard**.

---

# 4. Technology Stack

The system is built using the following technologies:

**Frontend**

* React
* TypeScript
* Vite
* Tailwind CSS
* Recharts (for charts)

**Backend**

* Supabase (PostgreSQL database)
* Supabase Authentication
* Supabase Realtime

**Other Tools**

* QR Code generation
* QR code camera scanning
* CSV file export

---

# 5. Project Structure

The project uses a feature-based folder structure to keep components organized.

```
neu-library-system/

public/
  neu-logo.svg

src/

components/
  layout/
    AdminLayout.tsx
    AdminSidebar.tsx

  visitor/
    QRScanner.tsx
    QRCodeDisplay.tsx

  admin/
    StatsCard.tsx
    CollegeChart.tsx
    CourseChart.tsx

hooks/
  useAuth.tsx
  useStats.ts

lib/
  supabase.ts
  utils.ts

pages/

  visitor/
    VisitorHome.tsx
    StudentRegister.tsx
    WelcomePage.tsx

  admin/
    AdminLogin.tsx
    Dashboard.tsx
    VisitorLogs.tsx
    UserManagement.tsx

supabase/
  schema.sql
  seed.sql

.env.example
package.json
README.md
```

---

# 6. Database Structure

The system uses a **PostgreSQL database provided by Supabase**.

Main tables:

### profiles

Stores administrator information.

Columns may include:

* id
* email
* role
* created_at

---

### students

Stores registered student data.

Columns include:

* id
* full_name
* email
* student_number
* college
* course
* qr_code
* blocked

---

### visitor_logs

Stores all library visits.

Columns include:

* id
* student_id
* purpose
* login_method
* time_in
* time_out
* created_at

Each row represents one visit session.

---

# 7. Student Visitor Flow

## Step 1 — Student Registration

Students must register once before using the system.

Steps:

1. Open `/register`
2. Enter:

   * Full Name
   * NEU Email
   * Student Number
   * College
   * Course
3. Click **Generate QR Code**
4. Download or save the QR code

---

## Step 2 — Time In (Entering the Library)

1. Go to `/`
2. Scan QR code or enter email + student number
3. Select purpose of visit
4. Click **Confirm Time In**

The system records:

```
time_in = current time
time_out = NULL
```

A welcome screen appears.

---

## Step 3 — Time Out (Leaving the Library)

When the student leaves:

1. Scan QR code again
2. The system detects an open session
3. The student clicks **Confirm Time Out**

The system records:

```
time_out = current time
```

The system calculates the **visit duration**.

---

# 8. Admin Dashboard

The admin dashboard provides real-time monitoring of library activity.

Features include:

* Total visitors today
* Visitors this week
* Visitors this month
* Visitors this year
* Students currently inside the library

Charts included:

* **Visitors by College (Pie Chart)**
* **Visitors by Course (Bar Chart)**

All data updates automatically through **Supabase Realtime**.

---

# 9. Visitor Logs

The visitor logs page allows administrators to view all recorded visits.

Columns displayed include:

* Student Name
* Email
* Student Number
* College
* Course
* Purpose of Visit
* Login Method
* Date
* Time In
* Time Out
* Visit Duration

Administrators can also **export this data to CSV** for reporting purposes.

---

# 10. User Management

Administrators can manage student access through the **User Management page**.

Functions include:

* Viewing all registered students
* Blocking students from entering the library
* Unblocking student access

If a student is blocked, they cannot check in using the system.

---

# 11. CSV Reports

The system allows administrators to export visitor data.

CSV reports include:

* Student Name
* Email
* Student Number
* College
* Course
* Visit Purpose
* Login Method
* Date
* Time In
* Time Out
* Visit Duration

These reports can be used for **library analytics and official reporting**.

---

# 12. Security

The system uses Supabase security features including:

* Authentication for admin accounts
* Row Level Security (RLS) policies
* Controlled database access using API keys

Public users cannot access admin pages without authentication.

---

# 13. Deployment

The system can be deployed using modern hosting platforms such as **Vercel**.

Deployment steps typically include:

1. Building the project
2. Uploading to the hosting platform
3. Adding environment variables
4. Deploying the application

---

# 14. Purpose of the System

The main goal of this project is to:

* Digitize the library visitor logbook
* Improve monitoring of library usage
* Provide real-time visitor analytics
* Reduce manual record keeping
* Improve data accuracy for library reports

---

# 15. Developer

**Jomar A. Auditor**
Bachelor of Science in Information Technology (BSIT)
New Era University

---

# 16. License

This project was developed for academic and institutional use at **New Era University Library**.
