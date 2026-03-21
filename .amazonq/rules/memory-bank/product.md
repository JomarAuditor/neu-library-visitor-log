# NEU Library Visitor Log — Product

## Purpose
Digital kiosk and management application for New Era University's library. Replaces paper-based logbooks with QR code, email, and Google OAuth check-in/out. Deployed at https://neu-library-visitor-log.vercel.app.

## Target Users
- **Visitors** (Students, Faculty, Staff) — check in/out at the kiosk
- **Admins** — view stats, filter logs, manage users, export CSV

## Key Features

### Visitor Kiosk (`/`)
- QR code scan via device camera (back camera preferred on mobile)
- Email login (student number required for students)
- Google OAuth login — NEU accounts only (`@neu.edu.ph`)
- Purpose selection: Reading, Research, Studying, Computer Use
- Time In / Time Out with automatic duration calculation
- Auto 6PM timeout via pg_cron (runs at 10:00 UTC = 18:00 PHT)
- Registration for all visitor types at `/register`
- QR code download as PNG

### Admin Dashboard (`/admin/dashboard`)
- Visitor stats: Today / This Week / Custom Date Range
- Filter by: Purpose, College, Visitor Type
- Currently Inside live counter (refreshes every 30s + Supabase Realtime)
- Visitors by College — pie chart (Recharts)
- Visitors by Course — bar chart with abbreviations (top 10)
- Export filtered data to CSV (UTF-8 BOM for Excel compatibility)

### User Management (`/admin/users`)
- View all registered visitors
- Change visitor type, block/unblock access
- Promote to admin / revoke admin access
- View all current admin accounts

### Visitor Logs (`/admin/logs`)
- Paginated log table (25 per page)
- Search by name or email
- CSV export of filtered results

## User Roles
| Role | Access |
|------|--------|
| Admin | Full dashboard, stats, user management, CSV export |
| Student | Kiosk check-in/out (requires student number + college) |
| Faculty | Kiosk check-in/out (email or Google, no employee ID) |
| Staff | Kiosk check-in/out (email or Google, no employee ID) |

## Admin Whitelist (auto-provisioned on first Google login)
- `jomar.auditor@neu.edu.ph` (super admin)
- `jcesperanza@neu.edu.ph`
- `rene.espina@neu.edu.ph`

## Security Constraints
- Only `@neu.edu.ph` emails accepted — enforced in `useAuth.tsx` at `onAuthStateChange`
- Blocked visitors are signed out immediately after OAuth callback
- Admin role stored in `profiles` table; `AdminLayout` guards all `/admin/*` routes
- All tables use Supabase Row Level Security (RLS)
