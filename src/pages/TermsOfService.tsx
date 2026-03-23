export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-neu-blue mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing and using the NEU Library Visitor Log System ("the System"), you agree to be bound 
            by these Terms of Service. If you do not agree to these terms, please do not use the System.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">2. Eligibility</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            The System is exclusively for:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>New Era University students with valid enrollment</li>
            <li>New Era University faculty members</li>
            <li>New Era University staff members</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-4">
            You must have a valid <strong>@neu.edu.ph</strong> institutional email address to use this system.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">3. User Responsibilities</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            As a user of the System, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Provide accurate and truthful information during registration</li>
            <li>Check in when entering the library and check out when leaving</li>
            <li>Use your own account only (no sharing credentials)</li>
            <li>Report any technical issues or errors to the library administration</li>
            <li>Comply with all New Era University library policies and regulations</li>
            <li>Not attempt to manipulate, hack, or circumvent the System</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">4. Prohibited Activities</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            You may not:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Use another person's account or credentials</li>
            <li>Provide false information or impersonate others</li>
            <li>Attempt to access unauthorized areas of the System</li>
            <li>Interfere with the System's operation or security</li>
            <li>Use the System for any illegal or unauthorized purpose</li>
            <li>Reverse engineer, decompile, or disassemble the System</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">5. Account Suspension</h2>
          <p className="text-gray-600 leading-relaxed">
            The library administration reserves the right to suspend or terminate your access to the System 
            if you violate these terms, engage in prohibited activities, or for any reason deemed necessary 
            for the security and proper operation of the library.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">6. Data Collection and Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            Your use of the System is also governed by our{' '}
            <a href="/privacy" className="text-neu-blue hover:text-neu-mid font-semibold">Privacy Policy</a>.
            By using the System, you consent to the collection and use of your information as described in the Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">7. System Availability</h2>
          <p className="text-gray-600 leading-relaxed">
            We strive to maintain the System's availability 24/7, but we do not guarantee uninterrupted access. 
            The System may be temporarily unavailable due to maintenance, updates, or technical issues. 
            We are not liable for any inconvenience caused by system downtime.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">8. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            The System, including its design, code, and content, is the property of New Era University 
            and the developer. All rights reserved. You may not copy, modify, or distribute any part of 
            the System without explicit permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">9. Disclaimer of Warranties</h2>
          <p className="text-gray-600 leading-relaxed">
            The System is provided "as is" without warranties of any kind, either express or implied. 
            We do not warrant that the System will be error-free, secure, or meet your specific requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">10. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            To the fullest extent permitted by law, New Era University and the System developer shall not 
            be liable for any indirect, incidental, special, or consequential damages arising from your use 
            of the System.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">11. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to modify these Terms of Service at any time. Changes will be posted on 
            this page with an updated revision date. Your continued use of the System after changes are 
            posted constitutes acceptance of the modified terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">12. Governing Law</h2>
          <p className="text-gray-600 leading-relaxed">
            These Terms of Service are governed by the laws of the Republic of the Philippines. 
            Any disputes shall be resolved in the appropriate courts of the Philippines.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">13. Contact Information</h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            For questions about these Terms of Service:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-gray-700"><strong>Developer:</strong> Jomar Auditor</p>
            <p className="text-gray-700"><strong>Email:</strong> jomar.auditor@neu.edu.ph</p>
            <p className="text-gray-700"><strong>Institution:</strong> New Era University Library</p>
            <p className="text-gray-700"><strong>Address:</strong> 9 Central Ave, New Era, Quezon City, Metro Manila</p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-4">
            By clicking "Sign in with Google" on the visitor log page, you acknowledge that you have read, 
            understood, and agree to these Terms of Service.
          </p>
          <a href="/" className="text-neu-blue hover:text-neu-mid font-semibold">
            ← Back to Visitor Log
          </a>
        </div>
      </div>
    </div>
  );
}
