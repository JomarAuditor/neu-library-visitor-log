# NEU Library Visitor Log — Technology

## Core Technologies

### Frontend Stack
- **React 18.2.0** - Component-based UI library
- **TypeScript 5.3.3** - Type-safe JavaScript
- **Vite 5.0.11** - Fast build tool and dev server
- **Tailwind CSS 3.4.1** - Utility-first CSS framework

### Backend Services
- **Supabase** - PostgreSQL database with real-time features
- **PostgREST** - Auto-generated REST API
- **Supabase Auth** - Authentication with Google OAuth
- **pg_cron** - Automated database jobs

### State Management
- **TanStack Query 5.17.19** - Server state management
- **React Context** - Global client state
- **Supabase Realtime** - Live data subscriptions

## Dependencies

### Production Dependencies
```json
{
  "@supabase/supabase-js": "^2.39.3",
  "@tanstack/react-query": "^5.17.19",
  "clsx": "^2.1.0",
  "date-fns": "^3.3.1",
  "html5-qrcode": "^2.3.8",
  "lucide-react": "^0.309.0",
  "qrcode": "^1.5.3",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.21.3",
  "recharts": "^2.10.3",
  "tailwind-merge": "^2.2.1"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.19.37",
  "@types/qrcode": "^1.5.5",
  "@types/react": "^18.2.48",
  "@types/react-dom": "^18.2.18",
  "@vitejs/plugin-react": "^4.2.1",
  "autoprefixer": "^10.4.17",
  "postcss": "^8.4.33",
  "tailwindcss": "^3.4.1",
  "typescript": "^5.3.3",
  "vite": "^5.0.11"
}
```

## Build Configuration

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'neu-blue': '#003087',
        'neu-mid': '#0046BD',
        'neu-navy': '#001A5E',
        'neu-light': '#E8EFF8',
        'neu-gray': '#F5F7FB',
        'neu-border': '#E2E8F0',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

## Development Commands

### Local Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database Management
```sql
-- Run in Supabase SQL Editor
\i supabase/schema.sql    -- Create tables and RLS
\i supabase/seed.sql      -- Insert college/program data
```

## Environment Variables

### Required Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Browser Support

### Minimum Requirements
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### Features Used
- ES2020 syntax
- CSS Grid and Flexbox
- Web APIs: Camera, Canvas, LocalStorage
- Modern JavaScript: async/await, modules

## Performance Optimizations

### Code Splitting
- Route-based code splitting
- Dynamic imports for heavy components
- Lazy loading for admin routes

### Caching Strategy
- TanStack Query caching
- Supabase client-side caching
- Browser caching for static assets

### Bundle Optimization
- Tree shaking for unused code
- Minification and compression
- Asset optimization

## Security Features

### Authentication
- Google OAuth 2.0
- JWT token management
- Session persistence
- Rate limiting

### Data Protection
- Input sanitization
- XSS prevention
- SQL injection protection
- HTTPS enforcement

## Deployment

### Vercel Configuration
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Build Process
1. TypeScript compilation
2. Vite bundling and optimization
3. Asset processing and compression
4. Deployment to Vercel CDN

## Monitoring and Analytics

### Error Tracking
- Console logging with sanitization
- Error boundaries for React components
- Supabase error monitoring

### Performance Monitoring
- Vite build analysis
- Bundle size tracking
- Runtime performance metrics