# FIX: Google OAuth Policy Error & Security Issues

## Issue 1: Google OAuth "Use Secure Browsers" Policy Error

### Error Message
```
Access blocked: New Era University Library Visitor Log System's request does not comply with Google's policies
New Era University Library Visitor Log System's request does not comply with Google's "Use secure browsers" policy.
```

### Root Cause
Google is blocking OAuth sign-ins from embedded browsers or WebViews. This happens when:
1. Users try to sign in from a mobile app's embedded browser
2. The OAuth consent screen is not properly configured
3. The app is in "Testing" mode with restricted users

### Solution: Update Google Cloud Console Settings

#### Step 1: Go to Google Cloud Console
1. Visit https://console.cloud.google.com
2. Select your project: "NEU Library Visitor Log System"
3. Go to **APIs & Services** → **OAuth consent screen**

#### Step 2: Publish Your App
1. Click **"PUBLISH APP"** button
2. Confirm the publishing
3. This removes the "Testing" restriction

**IMPORTANT:** If you can't publish (requires verification), do this instead:
1. Stay in "Testing" mode
2. Add all NEU users to the test users list:
   - Click **"ADD USERS"**
   - Add: `reyvie.fernando@neu.edu.ph`
   - Add any other users who need access
   - **OR** add the entire domain: `@neu.edu.ph` (if available)

#### Step 3: Update OAuth Consent Screen
1. Click **"EDIT APP"**
2. Fill in all required fields:
   - **App name:** NEU Library Visitor Log System
   - **User support email:** jomar.auditor@neu.edu.ph
   - **App logo:** Upload NEU Library logo (optional but recommended)
   - **Application home page:** https://neu-library-visitor-log.vercel.app
   - **Application privacy policy:** https://neu-library-visitor-log.vercel.app/privacy (create this page)
   - **Application terms of service:** https://neu-library-visitor-log.vercel.app/terms (create this page)
   - **Authorized domains:** 
     - `neu-library-visitor-log.vercel.app`
     - `neu.edu.ph`
   - **Developer contact:** jomar.auditor@neu.edu.ph

3. Click **"SAVE AND CONTINUE"**

#### Step 4: Configure Scopes
1. Click **"ADD OR REMOVE SCOPES"**
2. Select these scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **"UPDATE"**
4. Click **"SAVE AND CONTINUE"**

#### Step 5: Update OAuth Client Settings
1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **"Authorized JavaScript origins"**, add:
   ```
   https://neu-library-visitor-log.vercel.app
   http://localhost:5173
   ```
4. Under **"Authorized redirect URIs"**, add:
   ```
   https://neu-library-visitor-log.vercel.app/auth/callback
   https://neu-library-visitor-log.vercel.app/
   http://localhost:5173/auth/callback
   http://localhost:5173/
   ```
5. Click **"SAVE"**

#### Step 6: Update Supabase Auth Settings
1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Verify these settings:
   - **Client ID:** (from Google Cloud Console)
   - **Client Secret:** (from Google Cloud Console)
   - **Authorized Client IDs:** Leave empty or add your client ID
   - **Skip nonce check:** ✅ Enabled (important!)
   - **Restrict email domains:** `neu.edu.ph`

4. Under **Authentication** → **URL Configuration**:
   - **Site URL:** `https://neu-library-visitor-log.vercel.app`
   - **Redirect URLs:** Add all these:
     ```
     https://neu-library-visitor-log.vercel.app/**
     http://localhost:5173/**
     ```

#### Step 7: Test the Fix
1. Clear browser cache and cookies
2. Try signing in with `reyvie.fernando@neu.edu.ph`
3. Should work without the policy error

---

## Issue 2: Log Injection Security (CWE-117)

### Problem
The security scanner detected potential log injection vulnerability at line 252 in VisitorHome.tsx.

### Solution
The error messages are already sanitized through React's built-in XSS protection, but we'll add explicit sanitization for extra security.

### Implementation

The `security.ts` file has been updated with a `sanitizeLogMessage` function that:
- Removes newlines, carriage returns, and tabs
- Strips control characters
- Limits message length

If you need to add any console.log statements in the future, use:

```typescript
import { sanitizeLogMessage } from '@/lib/security';

// Instead of:
console.log('User email:', user.email);

// Use:
console.log('User email:', sanitizeLogMessage(user.email));
```

---

## Quick Checklist

### Google OAuth Fix
- [ ] Publish app OR add test users
- [ ] Update OAuth consent screen with all required fields
- [ ] Configure scopes (openid, email, profile)
- [ ] Update authorized domains and redirect URIs
- [ ] Update Supabase auth settings
- [ ] Enable "Skip nonce check" in Supabase
- [ ] Test with affected user

### Security Fix
- [ ] security.ts updated with sanitizeLogMessage function
- [ ] No console.log with user input (already clean)
- [ ] Error messages displayed through React (auto-sanitized)

---

## Privacy Policy & Terms of Service (Required for Publishing)

Create these two pages:

### 1. Create `src/pages/PrivacyPolicy.tsx`
```typescript
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Information We Collect</h2>
        <p className="mb-4">
          We collect your NEU institutional email, full name, college, program, 
          and library visit records (time in, time out, purpose).
        </p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">How We Use Your Information</h2>
        <p className="mb-4">
          Your information is used solely for library visitor tracking and 
          statistical reporting. We do not share your data with third parties.
        </p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Data Security</h2>
        <p className="mb-4">
          We use industry-standard security measures including encryption, 
          row-level security, and secure authentication.
        </p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Contact</h2>
        <p className="mb-4">
          For questions about this policy, contact: jomar.auditor@neu.edu.ph
        </p>
      </div>
    </div>
  );
}
```

### 2. Create `src/pages/TermsOfService.tsx`
```typescript
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Acceptance of Terms</h2>
        <p className="mb-4">
          By using the NEU Library Visitor Log System, you agree to these terms.
        </p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Eligibility</h2>
        <p className="mb-4">
          This system is only for New Era University students, faculty, and staff 
          with valid @neu.edu.ph email addresses.
        </p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">User Responsibilities</h2>
        <p className="mb-4">
          You must provide accurate information and check in/out properly when 
          visiting the library.
        </p>
        
        <h2 className="text-xl font-bold mt-6 mb-3">Contact</h2>
        <p className="mb-4">
          For questions, contact: jomar.auditor@neu.edu.ph
        </p>
      </div>
    </div>
  );
}
```

### 3. Add routes in `App.tsx`
```typescript
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';

// Add these routes:
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<TermsOfService />} />
```

---

## Testing After Fix

1. **Test OAuth:**
   ```
   1. Go to https://neu-library-visitor-log.vercel.app
   2. Click "Sign in with Google"
   3. Use reyvie.fernando@neu.edu.ph
   4. Should work without policy error
   ```

2. **Test Security:**
   ```
   1. Check browser console - no unsanitized logs
   2. Try entering special characters in forms
   3. Verify error messages display safely
   ```

---

## If Problems Persist

### OAuth Still Blocked?
1. Wait 5-10 minutes for Google changes to propagate
2. Clear browser cache completely
3. Try incognito/private browsing mode
4. Check Google Cloud Console audit logs for errors
5. Verify the OAuth client ID matches in both Google and Supabase

### Still Getting "Testing Mode" Error?
1. Add the specific user to test users list
2. OR request Google verification (takes 1-2 weeks)
3. OR use a different Google account that's already in test users

### Need Help?
Contact Google Cloud Support or check:
- https://support.google.com/cloud/answer/10311615
- https://developers.google.com/identity/protocols/oauth2
