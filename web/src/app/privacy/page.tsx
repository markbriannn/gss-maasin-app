'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Privacy Policy</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 prose prose-sm max-w-none">
          <p className="text-gray-500 text-sm mb-6">Last updated: December 2024</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Philippine Data Privacy Act Compliance:</strong> This Privacy Policy complies with Republic Act No. 10173 (Data Privacy Act of 2012) and its implementing rules and regulations.
            </p>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
          
          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">1.1 Personal Information</h3>
          <p className="text-gray-600 mb-2">We collect the following personal information:</p>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Account Information:</strong> Name, email address, phone number, date of birth, profile photo</li>
            <li><strong>Location Data:</strong> Address (street, barangay, city, province), GPS coordinates during active service delivery</li>
            <li><strong>For Providers Only:</strong> Government-issued ID, Barangay Clearance, Police Clearance, selfie with ID, service category, years of experience, pricing information</li>
            <li><strong>Transaction Data:</strong> Booking details, payment information (processed by PayMongo), service history, ratings and reviews</li>
            <li><strong>Communication Data:</strong> In-app messages, support inquiries, notifications</li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">1.2 Automatically Collected Information</h3>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li>Device information (model, operating system, unique device identifiers)</li>
            <li>App usage data and analytics</li>
            <li>IP address and connection information</li>
            <li>Location data when app is in use (with your permission)</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-600 mb-2">We process your personal data for the following purposes:</p>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Service Delivery:</strong> Connect clients with service providers, facilitate bookings, enable real-time tracking</li>
            <li><strong>Account Management:</strong> Create and maintain your account, verify identity, process provider applications</li>
            <li><strong>Payment Processing:</strong> Process transactions, manage earnings and payouts (via PayMongo)</li>
            <li><strong>Communication:</strong> Send booking confirmations, service updates, notifications, and support responses</li>
            <li><strong>Safety & Security:</strong> Verify provider credentials, prevent fraud, resolve disputes, enforce Terms of Service</li>
            <li><strong>Service Improvement:</strong> Analyze usage patterns, improve features, develop new services</li>
            <li><strong>Legal Compliance:</strong> Comply with legal obligations, respond to lawful requests from authorities</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. Information Sharing and Disclosure</h2>
          
          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">3.1 With Other Users</h3>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Clients see:</strong> Provider's name, profile photo, service category, ratings, reviews, approximate location (barangay level)</li>
            <li><strong>Providers see:</strong> Client's name, profile photo, service address, contact information (after job acceptance)</li>
            <li><strong>During Active Jobs:</strong> Real-time location sharing between client and provider</li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">3.2 With Third-Party Service Providers</h3>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Firebase (Google):</strong> Authentication, database, cloud storage, push notifications</li>
            <li><strong>PayMongo:</strong> Payment processing (PCI-DSS compliant)</li>
            <li><strong>Cloudinary:</strong> Image storage and optimization</li>
            <li><strong>Semaphore:</strong> SMS notifications</li>
            <li><strong>Brevo (Sendinblue):</strong> Email notifications</li>
            <li><strong>Google Maps:</strong> Location services and mapping</li>
          </ul>
          <p className="text-gray-600 mb-4 text-sm italic">
            These service providers are contractually obligated to protect your data and use it only for the purposes we specify.
          </p>

          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">3.3 Legal Requirements</h3>
          <p className="text-gray-600 mb-4">
            We may disclose your information if required by law, court order, or government request, or to protect our rights, property, or safety.
          </p>

          <p className="text-gray-600 mb-4">
            <strong>We do NOT sell your personal information to third parties.</strong>
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Data Security</h2>
          <p className="text-gray-600 mb-2">We implement industry-standard security measures:</p>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Encryption:</strong> All data transmitted uses HTTPS/TLS encryption. Data at rest is encrypted by Firebase.</li>
            <li><strong>Authentication:</strong> Passwords are hashed using bcrypt (never stored in plain text)</li>
            <li><strong>Access Control:</strong> Role-based permissions limit data access. Provider documents only accessible to administrators.</li>
            <li><strong>Secure Storage:</strong> Sensitive documents stored in Cloudinary with access controls</li>
            <li><strong>Payment Security:</strong> Payment data handled by PCI-DSS Level 1 compliant PayMongo (we never store card details)</li>
            <li><strong>Regular Monitoring:</strong> System monitoring for unauthorized access attempts</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. Provider Document Verification</h2>
          <p className="text-gray-600 mb-2">
            <strong>For Service Providers:</strong> Your verification documents (Government ID, Barangay Clearance, Police Clearance, Selfie with ID) are:
          </p>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li>Stored securely in encrypted cloud storage (Cloudinary)</li>
            <li>Accessible only to system administrators for verification purposes</li>
            <li>Never shared with clients or other providers</li>
            <li>Retained for the duration of your account plus 1 year for legal compliance</li>
            <li>Deleted upon account deletion request (subject to legal retention requirements)</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. Location Data</h2>
          <p className="text-gray-600 mb-2">We collect and use location data as follows:</p>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Registration:</strong> Your address (barangay, city) to match you with nearby services</li>
            <li><strong>During Active Jobs:</strong> Real-time GPS location shared between client and provider for safety and coordination</li>
            <li><strong>Provider Visibility:</strong> Approximate location used to show nearby providers to clients</li>
            <li><strong>Control:</strong> You can disable location services in device settings (may limit app functionality)</li>
          </ul>
          <p className="text-gray-600 mb-4 text-sm italic">
            Location tracking stops automatically when a job is completed or cancelled.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. Data Retention</h2>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
            <li><strong>Transaction Records:</strong> Retained for 5 years for tax and legal compliance</li>
            <li><strong>Provider Documents:</strong> Retained for 1 year after account closure</li>
            <li><strong>Messages:</strong> Retained for 2 years or until account deletion</li>
            <li><strong>Deleted Accounts:</strong> Personal data deleted within 30 days (except where legal retention required)</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">8. Your Rights (Data Privacy Act 2012)</h2>
          <p className="text-gray-600 mb-2">Under Philippine law, you have the right to:</p>
          <ul className="text-gray-600 mb-4 list-disc pl-5">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Erasure:</strong> Request deletion of your data (subject to legal requirements)</li>
            <li><strong>Object:</strong> Object to processing of your data for certain purposes</li>
            <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing (may limit service access)</li>
          </ul>
          <p className="text-gray-600 mb-4">
            To exercise these rights, contact us at <strong>support@gssmaasin.com</strong> or through in-app support.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">9. Children's Privacy</h2>
          <p className="text-gray-600 mb-4">
            Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a minor, please contact us immediately.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">10. Changes to This Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification. Continued use of our services after changes constitutes acceptance of the updated policy.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">11. Contact Information</h2>
          <p className="text-gray-600 mb-2">
            For privacy-related questions, concerns, or to exercise your data rights:
          </p>
          <ul className="text-gray-600 mb-4 list-none">
            <li><strong>Email:</strong> support@gssmaasin.com</li>
            <li><strong>In-App:</strong> Settings → Help & Support</li>
            <li><strong>Address:</strong> Maasin City, Southern Leyte, Philippines</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">12. Complaints</h2>
          <p className="text-gray-600 mb-4">
            If you believe your data privacy rights have been violated, you may file a complaint with the National Privacy Commission (NPC) of the Philippines:
          </p>
          <ul className="text-gray-600 mb-4 list-none">
            <li><strong>Website:</strong> www.privacy.gov.ph</li>
            <li><strong>Email:</strong> info@privacy.gov.ph</li>
            <li><strong>Hotline:</strong> (02) 8234-2228</li>
          </ul>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-green-900">
              <strong>Your Privacy Matters:</strong> We are committed to protecting your personal information and complying with Philippine data privacy laws. If you have any questions or concerns, please don't hesitate to contact us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
