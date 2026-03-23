# NEU Library Visitor Log

**Developed by:** Jomar Auditor  
**Live Application:** https://neu-library-visitor-log.vercel.app  
**GitHub Repository:** https://github.com/JomarAuditor/neu-library-visitor-log

---

## 📚 Complete Project Documentation

This repository contains comprehensive documentation about the NEU Library Visitor Log project:

### 🎯 **Product Documentation**
- **[Product Overview](.amazonq/rules/memory-bank/product.md)** - Features, user roles, and capabilities
- **[Project Structure](.amazonq/rules/memory-bank/structure.md)** - Architecture and component organization
- **[Technology Stack](.amazonq/rules/memory-bank/tech.md)** - Dependencies, build tools, and deployment
- **[Development Guidelines](.amazonq/rules/memory-bank/guidelines.md)** - Coding standards and best practices
- **[Security Implementation](SECURITY.md)** - Enterprise-grade authentication and XSS protection

### 🔧 **Technical Resources**
- **Database Schema** - Complete ERD and table relationships (see [Database Schema](#database-schema))
- **API Documentation** - Supabase integration patterns and security implementation
- **Security Architecture** - Multi-layer authentication and data protection
- **Deployment Guide** - Step-by-step production deployment instructions

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Folder Structure](#folder-structure)
6. [Database Schema](#database-schema)
7. [Security](#security)
8. [Environment Variables](#environment-variables)
9. [Local Development](#local-development)
10. [Deployment](#deployment)
11. [User Roles & Access](#user-roles--access)

---

## Project Overview

The **NEU Library Visitor Log** is a modern web-based kiosk and management application for New Era University's library. It replaces the traditional paper-based logbook with a digital check-in/out solution using QR codes, email, or Google OAuth.

Library staff and administrators can view real-time visitor statistics, filter by purpose, college, or visitor type, and export data to CSV.

**Key Benefits:**
- ✅ Paperless and eco-friendly
- ✅ Real-time visitor tracking
- ✅ Automated 6PM timeout
- ✅ Enterprise-grade security
- ✅ Professional analytics and reporting

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | Component-based UI library |
| **TypeScript** | 5.3.3 | Type-safe JavaScript |
| **Vite** | 5.0.11 | Fast build tool and dev server |
| **Tailwind CSS** | 3.4.1 | Utility-first CSS framework |
| **React Router** | 6.21.3 | Client-side routing |
| **TanStack Query** | 5.17.19 | Server state management |
| **Recharts** | 2.10.3 | Data visualization |
| **Lucide React** | 0.309.0 | Icon library |
| **date-fns** | 3.3.1 | Date manipulation |

### Backend & Services
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database with real-time features |
| **PostgREST** | Auto-generated REST API |
| **Supabase Auth** | Authentication with Google OAuth 2.0 |
| **pg_cron** | Automated database jobs (6PM timeout) |
| **Row Level Security** | Database-level access control |

### Development Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Code quality and consistency |
| **PostCSS** | CSS processing |
| **Autoprefixer** | CSS vendor prefixes |

### Deployment
| Platform | Purpose |
|----------|---------|
| **Vercel** | Frontend hosting with CDN |
| **Supabase Cloud** | Backend services |

---

## Features

### 🎫 Visitor Portal
- **Multiple Sign-In Methods:**
  - QR code scan via device camera
  - Email login (student number required for students)
  - Google OAuth (@neu.edu.ph accounts only)
- **Purpose Selection:** Reading, Research, Studying, Computer Use
- **Automatic Check-In/Out:** Smart detection of visitor status
- **Time Tracking:** Automatic duration calculation
- **Auto 6PM Timeout:** Automated via pg_cron
- **Registration:** Self-service registration for all visitor types
- **QR Code Download:** Personal QR code as PNG

### 📊 Admin Dashboard
- **Real-Time Statistics:**
  - Today's visitors
  - This week's visitors
  - Custom date range
  - Currently inside counter (live updates every 30s)
- **Advanced Filtering:**
  - Filter by purpose (Reading, Research, Studying, Computer Use)
  - Filter by college (all 16 NEU colleges)
  - Filter by visitor type (Student, Faculty, Staff)
- **Data Visualization:**
  - Visitors by College (pie chart)
  - Visitors by Course (bar chart with abbreviations)
- **CSV Export:** Export filtered data with UTF-8 BOM for Excel

### 👥 User Management
- View all registered visitors
- Change visitor type (Student / Faculty / Staff)
- Block / Unblock library access
- Promote visitor to admin
- Revoke admin access (Super Admin only)
- View all current admin accounts
- Real-time updates

### 📝 Visitor Logs
- Paginated log table (50 per page)
- Global search (name, email, college, course, status)
- Filter by type and status
- CSV export of filtered results
- Real-time log updates

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VISITOR KIOSK                      │
│         (React SPA — Vercel CDN)                    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ QR Scan  │  │  Email   │  │  Google OAuth    │  │
│  │  Login   │  │  Login   │  │  (@neu.edu.ph)   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       └─────────────┴─────────────────┘             │
│                       │                             │
└───────────────────────┼─────────────────────────────┘
                        │ HTTPS / REST
┌───────────────────────▼─────────────────────────────┐
│                   SUPABASE                           │
│                                                      │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │  Supabase    │   │    PostgreSQL Database    │  │
│  │    Auth      │   │                           │  │
│  │  (Google     │   │  profiles                 │  │
│  │   OAuth)     │   │  colleges                 │  │
│  └──────────────┘   │  programs                 │  │
│                      │  visitors                 │  │
│  ┌──────────────┐   │  visit_logs               │  │
│  │  Row Level   │   │                           │  │
│  │  Security    │   └───────────────────────────┘  │
│  └──────────────┘                                   │
│                                                      │
│  ┌──────────────┐                                   │
│  │   pg_cron    │  Auto-timeout at 6PM PHT          │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
neu-lib-visitor-system/
│
├── .amazonq/
│   └── rules/
│       └── memory-bank/          # AI-assisted documentation
│           ├── product.md
│           ├── structure.md
│           ├── tech.md
│           └── guidelines.md
│
├── public/
│   ├── NEU-Library-logo.png     # Primary logo
│   ├── neu-logo.svg              # Fallback SVG logo
│   └── Neu-Lib_Building.jpg     # Background image
│
├── supabase/
│   ├── schema.sql                # Full DB schema (run first)
│   ├── seed.sql                  # Colleges & programs data
│   └── autotimeout.sql           # pg_cron setup for 6PM timeout
│
├── src/
│   ├── components/
│   │   ├── admin/                # Admin-specific components
│   │   │   ├── CollegeChart.tsx
│   │   │   ├── CourseChart.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── StatsCard.tsx
│   │   ├── auth/                 # Authentication components
│   │   │   └── AuthModal.tsx
│   │   ├── layout/               # Layout components
│   │   │   ├── AdminLayout.tsx
│   │   │   └── AdminSidebar.tsx
│   │   └── visitor/              # Visitor-specific components
│   │       ├── QRCodeDisplay.tsx
│   │       └── QRScanner.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.tsx           # Authentication context
│   │   ├── useAuthGuard.ts       # Route protection
│   │   ├── useSearch.ts          # Global search
│   │   └── useStats.ts           # Data fetching
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── security.ts           # XSS protection & sanitization
│   │   ├── supabase.ts           # Supabase client
│   │   └── utils.ts              # Helper functions
│   │
│   ├── pages/
│   │   ├── admin/                # Admin pages
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── VisitorLogs.tsx
│   │   │   └── UserManagement.tsx
│   │   └── visitor/              # Visitor pages
│   │       ├── VisitorHome.tsx
│   │       ├── RegisterPage.tsx
│   │       └── SuccessPage.tsx
│   │
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   │
│   ├── App.tsx                   # Route configuration
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
│
├── .env.local                    # Environment variables (not in git)
├── package.json                  # Dependencies
├── tailwind.config.js            # Tailwind configuration
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment config
├── README.md                     # This file
└── SECURITY.md                   # Security documentation
```

---

## Database Schema

The database is normalized to **Third Normal Form (3NF)** for optimal data integrity.

### Entity Relationship Diagram

![Database ERD](erd.png)
![alt text](image-1.png)

**Database Structure:**

```
auth.users (Supabase managed)
    │
    └──► profiles (1:1)
              id, email, full_name, role

colleges (1:N) ──► programs
    id                  id
    name                college_id (FK)
    abbreviation        name
                        abbreviation

visitors
    id
    email           ◄── unique, @neu.edu.ph only
    full_name
    visitor_type    ◄── 'student' | 'faculty'
    program_id      ◄── FK to programs (students only)
    college_id      ◄── FK to colleges (optional for faculty)
    department      ◄── faculty optional
    is_blocked

visitors (1:N) ──► visit_logs
                        id
                        visitor_id  (FK)
                        purpose     ◄── Reading | Research | Studying | Computer Use
                        time_in
                        time_out    ◄── null = still inside
                        duration_minutes
                        visit_date
```

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | Admin accounts only | `id` = auth.users.id, `role` |
| `colleges` | NEU college list (16) | `name`, `abbreviation` |
| `programs` | Academic programs (50+) | `college_id`, `name`, `abbreviation` |
| `visitors` | All library users | `email`, `visitor_type`, `program_id?` |
| `visit_logs` | One row per library visit | `visitor_id`, `time_in`, `time_out`, `purpose` |

---

## Security

### 🔒 Multi-Layer Authentication

1. **Hard-Coded Email Validation**
   - Only `@neu.edu.ph` emails accepted
   - Validation before any data exposure
   - Professional popup notification

2. **Hard-Coded Admin Whitelist**
   - Immutable list of authorized admins
   - TypeScript `readonly` for security
   - Cannot be modified at runtime

3. **Route-Level Authorization**
   - 5 security layers before admin access
   - No data flicker (validation before render)
   - Professional "Only authorized admin" popup

4. **XSS Protection**
   - All user input sanitized
   - HTML entity encoding
   - CWE-79/80 vulnerabilities fixed

5. **Additional Security**
   - Rate limiting on authentication
   - Secure logging with data redaction
   - Row Level Security (RLS) in database
   - HTTPS enforced

**See [SECURITY.md](SECURITY.md) for complete security documentation.**

---

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from: Supabase Dashboard → Project Settings → API

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local file with your Supabase credentials

# 3. Run the database setup in Supabase SQL Editor:
#    First: supabase/schema.sql
#    Then:  supabase/seed.sql
#    Finally: supabase/autotimeout.sql

# 4. Start development server
npm run dev

# 5. Open http://localhost:5173
```

---

## Deployment

### Vercel Setup (first time only)
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel auto-detects Vite — no build config needed
4. `vercel.json` handles SPA rewrite rule

### Supabase Setup (first time only)
1. Run `schema.sql` in SQL Editor
2. Run `seed.sql` in SQL Editor
3. Run `autotimeout.sql` in SQL Editor
4. Authentication → Providers → Google → Enable with Client ID and Secret
5. Authentication → URL Configuration → Add redirect URLs:
   ```
   https://neu-library-visitor-log.vercel.app/admin/login
   https://neu-library-visitor-log.vercel.app/
   http://localhost:5173/admin/login
   http://localhost:5173/
   ```
6. Enable pg_cron extension: Database → Extensions → pg_cron → Enable

### Deploy Updates
```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

Vercel auto-deploys on push to main branch.

---

## User Roles & Access

| Role | How to Get It | What They Can Do |
|------|--------------|------------------|
| **Admin** | Auto-provisioned for whitelisted emails on first Google login | Full dashboard, stats, filters, user management, CSV export |
| **Student** | Register at `/register` with student number + college | QR/email/Google check-in at kiosk |
| **Faculty** | Register at `/register` or auto-register via Google | Google check-in (no employee ID needed) |

### Admin Whitelist (auto-provisioned)
```
jomar.auditor@neu.edu.ph (Super Admin)
jcesperanza@neu.edu.ph
rene.espina@neu.edu.ph
```

---

## Developer

**Jomar Auditor**  
New Era University — College of Informatics and Computing Studies  
Academic Project — Library Visitor Log — 2025

---

## License

This project is developed for New Era University as an academic project.

© 2025 Jomar Auditor. All rights reserved.