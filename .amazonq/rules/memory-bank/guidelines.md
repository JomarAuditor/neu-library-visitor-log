# NEU Library Visitor Log — Development Guidelines

## Code Quality Standards

### TypeScript Standards
- **Strict Mode Enabled** - All TypeScript strict checks are enforced
- **Interface Definitions** - Use interfaces for all data structures and props
- **Type Safety** - No `any` types; use proper type annotations
- **Environment Types** - Custom type definitions for Vite environment variables
- **Module Declarations** - Proper module declarations for assets and CSS

### File Organization Patterns
- **Path Aliases** - Use `@/` prefix for all internal imports (`@/hooks/useAuth`)
- **File Extensions** - `.tsx` for React components, `.ts` for utilities
- **Naming Conventions** - PascalCase for components, camelCase for functions
- **Directory Structure** - Group by feature/domain (admin/, visitor/, auth/)

### Import/Export Patterns
```typescript
// Preferred import style
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Default exports for main components
export default function ComponentName() { }

// Named exports for utilities and hooks
export function utilityFunction() { }
export const CONSTANT_VALUE = 'value';
```

## Component Architecture

### React Component Standards
- **Functional Components Only** - No class components
- **TypeScript Props** - All props must have interface definitions
- **React.StrictMode** - Development mode uses strict mode for better debugging
- **Hook Usage** - Custom hooks for reusable logic
- **Error Boundaries** - Proper error handling in components

### Component Structure Pattern
```typescript
// Component file structure
interface ComponentProps {
  // Props interface first
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks at the top
  const [state, setState] = useState();
  const { data } = useCustomHook();
  
  // Event handlers
  const handleEvent = () => { };
  
  // Render logic
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
}
```

### Authentication Patterns
- **Context-Based Auth** - Global authentication state via React Context
- **Route Protection** - Component-level guards for admin routes
- **Security Validation** - Multi-layer email domain and role validation
- **Session Management** - Persistent sessions with automatic cleanup

## Styling Guidelines

### Tailwind CSS Standards
- **Utility-First** - Use Tailwind utilities over custom CSS
- **Custom Colors** - NEU brand colors defined in config
- **Responsive Design** - Mobile-first responsive patterns
- **Component Classes** - Use `clsx` and `tailwind-merge` for conditional classes
- **Animation Classes** - Custom animations defined in Tailwind config

### NEU Brand Colors
```css
neu-blue: #003087    /* Primary brand color */
neu-mid: #0046BD     /* Secondary brand color */
neu-navy: #001A5E    /* Dark accent */
neu-light: #E8EFF8   /* Light background */
neu-gray: #F5F7FB    /* Neutral background */
neu-border: #E2E8F0  /* Border color */
```

### CSS Class Patterns
```typescript
// Conditional classes with clsx
const buttonClass = clsx(
  'base-classes',
  {
    'active-classes': isActive,
    'disabled-classes': isDisabled,
  }
);

// Tailwind merge for overrides
const mergedClass = cn('default-classes', customClasses);
```

## Data Management

### Supabase Integration Patterns
- **Client Initialization** - Single Supabase client instance
- **Type Safety** - Generated types from database schema
- **Real-time Subscriptions** - Live data updates for dashboard
- **Row Level Security** - Database-level access control
- **Error Handling** - Consistent error handling across queries

### TanStack Query Patterns
```typescript
// Query hook pattern
export function useDataHook(params: QueryParams) {
  return useQuery({
    queryKey: ['data-key', params],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table')
        .select('columns')
        .eq('filter', params.value);
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 30_000,
    retry: 2,
  });
}
```

### State Management Patterns
- **Server State** - TanStack Query for all server data
- **Client State** - React useState for local component state
- **Global State** - React Context for authentication and app-wide state
- **Form State** - Local state with validation helpers

## Security Implementation

### Input Sanitization
- **HTML Encoding** - All user input sanitized before display
- **Email Validation** - Strict NEU domain validation
- **XSS Prevention** - HTML entity encoding for all dynamic content
- **Rate Limiting** - Authentication attempt limiting

### Authentication Security
```typescript
// Security validation pattern
const isValidNEUEmail = (email: string): boolean => {
  const sanitized = sanitizeEmail(email);
  return sanitized !== null && sanitized.endsWith('@neu.edu.ph');
};

// Rate limiting pattern
if (!authRateLimiter.isAllowed(identifier)) {
  throw new Error('Too many attempts');
}
```

### Error Handling Patterns
- **Secure Logging** - Sensitive data redaction in logs
- **User-Friendly Messages** - Generic error messages for users
- **Error Boundaries** - React error boundaries for component failures
- **Graceful Degradation** - Fallback UI for failed states

## Performance Optimization

### Code Splitting
- **Route-Based Splitting** - Lazy loading for admin routes
- **Component Lazy Loading** - Dynamic imports for heavy components
- **Bundle Analysis** - Regular bundle size monitoring

### Caching Strategies
- **Query Caching** - TanStack Query with appropriate stale times
- **Asset Caching** - Browser caching for static assets
- **Database Caching** - Supabase client-side caching

### Build Optimization
```typescript
// Vite configuration pattern
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
```

## Testing and Quality Assurance

### Code Quality Tools
- **TypeScript Compiler** - Strict type checking
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting (if configured)
- **Vite Build Analysis** - Bundle size and performance monitoring

### Development Practices
- **Environment Variables** - Proper env var management with types
- **Error Logging** - Comprehensive error tracking
- **Performance Monitoring** - Build time and bundle size tracking
- **Security Audits** - Regular dependency and code security reviews

## Deployment Standards

### Build Process
1. TypeScript compilation with strict checks
2. Vite bundling with optimization
3. Asset processing and compression
4. Environment variable validation

### Production Configuration
- **Vercel Deployment** - SPA routing configuration
- **Environment Security** - Secure environment variable management
- **CDN Optimization** - Static asset delivery optimization
- **Error Monitoring** - Production error tracking

### Development Workflow
```bash
# Standard development commands
npm run dev      # Development server with HMR
npm run build    # Production build
npm run preview  # Preview production build locally
```

## Documentation Standards

### Code Documentation
- **Interface Documentation** - Clear prop and type descriptions
- **Function Comments** - JSDoc comments for complex functions
- **README Updates** - Keep documentation current with changes
- **Type Definitions** - Comprehensive type definitions for all data structures

### Naming Conventions
- **Components** - PascalCase (e.g., `AdminLayout`, `VisitorHome`)
- **Hooks** - camelCase with `use` prefix (e.g., `useAuth`, `useStats`)
- **Utilities** - camelCase (e.g., `sanitizeEmail`, `formatDate`)
- **Constants** - UPPER_SNAKE_CASE (e.g., `ADMIN_EMAILS`, `PURPOSES`)
- **Types** - PascalCase (e.g., `VisitorType`, `AuthGuardConfig`)