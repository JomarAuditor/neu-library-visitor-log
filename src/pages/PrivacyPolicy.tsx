export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-neu-blue mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">1. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            The NEU Library Visitor Log System collects the following information:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>NEU institutional email address (@neu.edu.ph)</li>
            <li>Full name</li>
            <li>College and program/course (for students)</li>
            <li>Department (for faculty, optional)</li>
            <li>Library visit records (date, time in, time out, purpose, duration)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Your information is used exclusively for:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Recording and tracking library visits</li>
            <li>Generating statistical reports for library administration</li>
            <li>Managing library access and security</li>
            <li>Improving library services based on usage patterns</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-4">
            <strong>We do not:</strong> Share your data with third parties, use it for marketing purposes, 
            or sell your information to anyone.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">3. Data Security</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>HTTPS encryption for all data transmission</li>
            <li>Row-level security (RLS) in our database</li>
            <li>Secure authentication via Google OAuth 2.0</li>
            <li>Input sanitization to prevent XSS and injection attacks</li>
            <li>Regular security audits and updates</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">4. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            Visit logs are retained for academic record-keeping purposes. Your account information 
            remains active as long as you are affiliated with New Era University. You may request 
            data deletion by contacting the library administrator.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">5. Your Rights</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Access your personal data and visit history</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your data (subject to institutional policies)</li>
            <li>Opt-out of the system (contact library administration)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">6. Cookies and Tracking</h2>
          <p className="text-gray-600 leading-relaxed">
            We use essential cookies for authentication and session management only. 
            We do not use tracking cookies or third-party analytics.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">7. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this privacy policy from time to time. Changes will be posted on this page 
            with an updated revision date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">8. Contact Information</h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            For questions or concerns about this privacy policy or your data:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-gray-700"><strong>Developer:</strong> Jomar Auditor</p>
            <p className="text-gray-700"><strong>Email:</strong> jomar.auditor@neu.edu.ph</p>
            <p className="text-gray-700"><strong>Institution:</strong> New Era University Library</p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <a href="/" className="text-neu-blue hover:text-neu-mid font-semibold">
            ← Back to Visitor Log
          </a>
        </div>
      </div>
    </div>
  );
}
