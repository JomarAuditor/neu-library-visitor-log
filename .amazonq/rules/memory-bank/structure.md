# NEU Library Visitor Log — Structure

## Project Architecture

### Frontend Architecture
```
React 18 + TypeScript + Vite
├── Component-Based Architecture
├── Custom Hooks for State Management
├── Context API for Authentication
├── TanStack Query for Server State
└── Tailwind CSS for Styling
```

### Backend Architecture
```
Supabase (PostgreSQL + Auth + Realtime)
├── Row Level Security (RLS)
├── Real-time Subscriptions
├── Google OAuth Integration
├── Automated pg_cron Jobs
└── RESTful API via PostgREST
```

## Directory Structure

### Root Level
```
neu-lib-visitor-system/
├── public/                 # Static assets
├── src/                    # Source code
├── supabase/              # Database schemas and seeds
├── .amazonq/              # AI assistant rules
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Custom NEU styling
├── vite.config.ts         # Build configuration
└── vercel.json           # Deployment configuration
```

### Source Code Organization
```
src/
├── components/            # Reusable UI components
│   ├── admin/            # Admin-specific components
│   ├── auth/             # Authentication components
│   ├── layout/           # Layout components
│   └── visitor/          # Visitor-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── pages/                # Route components
│   ├── admin/           # Admin pages
│   └── visitor/         # Visitor pages
├── types/               # TypeScript definitions
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

### Component Architecture

#### Admin Components
- `AdminLayout.tsx` - Route protection and layout
- `AdminSidebar.tsx` - Navigation and user profile
- `StatsCard.tsx` - Metric display cards
- `CollegeChart.tsx` - Pie chart for college distribution
- `CourseChart.tsx` - Bar chart for course distribution
- `SearchBar.tsx` - Enhanced search with result counts

#### Authentication Components
- `AuthModal.tsx` - Enterprise-grade security feedback
- `useAuth.tsx` - Authentication context and logic
- `useAuthGuard.ts` - Route-specific security guards

#### Visitor Components
- `QRCodeDisplay.tsx` - QR code generation and display
- `QRScanner.tsx` - Camera-based QR code scanning
- `VisitorHome.tsx` - Main kiosk interface

### Database Schema Structure

#### Core Tables
```sql
profiles        # Admin accounts (1:1 with auth.users)
colleges        # NEU colleges (16 total)
programs        # Academic programs (50+ total)
visitors        # All library users
visit_logs      # Individual visit records
```

#### Relationships
```
auth.users → profiles (1:1)
colleges → programs (1:N)
visitors → colleges (N:1, optional)
visitors → programs (N:1, optional for students)
visitors → visit_logs (1:N)
```

### Security Architecture

#### Multi-Layer Authentication
1. **Domain Validation** - Only @neu.edu.ph emails
2. **Admin Whitelist** - Predefined admin accounts
3. **Role-Based Access** - Admin/Staff role verification
4. **Route Protection** - Component-level guards
5. **Rate Limiting** - Prevent brute force attempts

#### Data Sanitization
- HTML entity encoding for XSS prevention
- Input validation and sanitization
- Secure logging with sensitive data redaction
- SQL injection prevention via Supabase RLS

### State Management

#### Authentication State
- User session management
- Profile data caching
- Block reason persistence
- Modal state management

#### Application State
- TanStack Query for server state
- React Context for global state
- Local state for UI interactions
- Real-time subscriptions for live data

### Routing Structure

#### Public Routes
```
/                 # Visitor kiosk
/register         # Visitor registration
/success          # Post-action confirmation
```

#### Protected Admin Routes
```
/admin/login      # Admin authentication
/admin/dashboard  # Statistics and analytics
/admin/logs       # Visitor log management
/admin/users      # User management
```

### Build and Deployment

#### Development
- Vite for fast development server
- TypeScript for type safety
- ESLint for code quality
- Hot module replacement

#### Production
- Vercel for frontend hosting
- Supabase for backend services
- CDN for static asset delivery
- Environment-based configuration