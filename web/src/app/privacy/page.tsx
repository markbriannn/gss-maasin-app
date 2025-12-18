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
          
          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
          <p className="text-gray-600 mb-4">
            We collect information you provide directly, including name, email, phone number, address, and profile photos.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">
            We use your information to provide and improve our services, process transactions, and communicate with you.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. Information Sharing</h2>
          <p className="text-gray-600 mb-4">
            We share necessary information between clients and providers to facilitate service delivery. We do not sell your personal information.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Data Security</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate security measures to protect your personal information from unauthorized access or disclosure.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. Location Data</h2>
          <p className="text-gray-600 mb-4">
            We collect location data to connect you with nearby providers and enable real-time tracking during service delivery.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. Your Rights</h2>
          <p className="text-gray-600 mb-4">
            You can access, update, or delete your personal information through your account settings or by contacting us.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. Contact</h2>
          <p className="text-gray-600 mb-4">
            For privacy-related questions, contact us at support@gssmaasin.com.
          </p>
        </div>
      </div>
    </div>
  );
}
