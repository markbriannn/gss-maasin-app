'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Shield, Users, Wallet, AlertTriangle, CheckCircle, XCircle, Scale, Clock, CreditCard, Star, MapPin, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Violation consequences
const violations = [
  { offense: 'First violation', consequence: 'Warning notification', severity: 'low' },
  { offense: 'Second violation', consequence: 'Temporary suspension (7 days)', severity: 'medium' },
  { offense: 'Third violation', consequence: 'Extended suspension (30 days)', severity: 'high' },
  { offense: 'Severe violation', consequence: 'Permanent account termination', severity: 'critical' },
];

export default function TermsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const role = user?.role?.toUpperCase() || 'CLIENT';

  // Role-specific colors
  const colors = {
    ADMIN: {
      gradient: 'from-violet-600 via-purple-600 to-indigo-700',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      accentBg: 'bg-gradient-to-r from-violet-500 to-purple-600',
      badgeBg: 'bg-violet-100 text-violet-700',
    },
    PROVIDER: {
      gradient: 'from-blue-600 via-indigo-600 to-purple-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      accentBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-100 text-blue-700',
    },
    CLIENT: {
      gradient: 'from-emerald-600 via-green-600 to-teal-700',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      accentBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-100 text-emerald-700',
    },
  };

  const currentColors = colors[role as keyof typeof colors] || colors.CLIENT;
  const roleLabel = role === 'ADMIN' ? 'Administrator' : role === 'PROVIDER' ? 'Service Provider' : 'Client';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Premium Gradient Header */}
      <div className={`bg-gradient-to-r ${currentColors.gradient} text-white`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Terms of Service</h1>
              <p className="text-white/80 text-sm">{roleLabel} Agreement</p>
            </div>
          </div>

          {/* Hero Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Scale className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Legal Agreement</h2>
                <p className="text-white/80 text-sm mt-1">
                  Last updated: February 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Terms Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Terms & Conditions</h2>
              <p className="text-sm text-gray-500">Applicable to {roleLabel}s</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentColors.badgeBg}`}>
              {roleLabel}
            </span>
          </div>
          <div className="p-6 space-y-6 text-sm text-gray-600 leading-relaxed">
            <p>
              Welcome to GSS Maasin Service App. By using this platform as a {role === 'PROVIDER' ? 'Service Provider' : role === 'ADMIN' ? 'Administrator' : 'Client'}, you agree to the following terms:
            </p>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Account Registration</h3>
              <p>• You must provide accurate and complete information during registration.<br />• You are responsible for maintaining the security of your account.<br />• You must be at least 18 years old to register.</p>
            </div>

            {role === 'PROVIDER' ? (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Provider Requirements</h3>
                  <p>• Submit valid government ID and required documents for verification.<br />• Your account requires admin approval before activation.<br />• Maintain professional conduct and quality service at all times.<br />• Keep your availability status updated accurately.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Service Delivery</h3>
                  <p>• Arrive on time for scheduled appointments.<br />• Bring all necessary tools and equipment for the job.<br />• Complete work as described in the booking agreement.<br />• Communicate promptly with clients about any issues.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. Earnings & Payouts</h3>
                  <p>• A 5% service fee is deducted from your earnings.<br />• Minimum payout amount is ₱100.<br />• Payouts are processed to your registered GCash/Maya account.<br />• You are responsible for your own tax obligations.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">5. Quality Standards</h3>
                  <p>• Maintain a minimum rating to remain active on the platform.<br />• Respond to job requests within a reasonable time.<br />• Handle customer complaints professionally.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">6. Privacy & Data Protection</h3>
                  <p>• We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.<br />• Your personal information (name, contact details, location) is encrypted and securely stored.<br />• Your verification documents (ID, clearances) are accessible only to administrators and never shared with clients.<br />• Location data is collected only during active service delivery for safety and coordination.<br />• Payment information is processed by PayMongo (PCI-DSS compliant) - we never store your card details.<br />• You have the right to access, correct, or delete your personal data at any time.<br />• We do not sell your personal information to third parties.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">7. Prohibited Activities</h3>
                  <p>• Fraudulent activities or misrepresentation.<br />• Harassment or abusive behavior towards other users.<br />• Circumventing the platform for direct transactions.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">8. Account Termination</h3>
                  <p>• We reserve the right to suspend or terminate accounts that violate these terms.<br />• Users may request account deletion at any time.</p>
                </div>
              </>
            ) : role === 'ADMIN' ? (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Administrative Authority</h3>
                  <p>• As an administrator, you have authority to approve providers, process payouts, and manage user accounts.<br />• Use this authority responsibly and fairly.<br />• Document decisions and follow due process for all account actions.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Provider Verification</h3>
                  <p>• You are responsible for verifying provider documents and qualifications before approval.<br />• Ensure all providers meet platform standards.<br />• Process verification requests in a timely manner.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. Payout Processing</h3>
                  <p>• Process payout requests promptly and verify account details before approval.<br />• Document any rejected requests with clear reasons.<br />• Ensure accurate accounting of all transactions.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">5. Privacy & Data Protection</h3>
                  <p>• We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.<br />• Maintain strict confidentiality of user data and platform information.<br />• Do not share sensitive information outside of official duties.<br />• You have the right to access, correct, or delete your personal data at any time.<br />• We do not sell your personal information to third parties.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">6. Prohibited Activities</h3>
                  <p>• Fraudulent activities or misrepresentation.<br />• Harassment or abusive behavior towards other users.<br />• Circumventing the platform for direct transactions.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">7. Account Termination</h3>
                  <p>• We reserve the right to suspend or terminate accounts that violate these terms.<br />• Users may request account deletion at any time.</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Client Responsibilities</h3>
                  <p>• You agree to pay for services rendered as agreed with providers.<br />• Provide accurate job descriptions and requirements.<br />• Treat service providers with respect and professionalism.<br />• Be available at the scheduled service time and location.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Booking & Payments</h3>
                  <p>• A 5% service fee is added to all bookings.<br />• Payments can be made via GCash, Maya, or Cash.<br />• Cancellations must be made at least 2 hours before scheduled time.<br />• Refunds are subject to our refund policy and admin approval.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. Reviews & Ratings</h3>
                  <p>• You may leave honest reviews for completed services.<br />• Reviews must be truthful and not contain offensive content.<br />• Fake or malicious reviews may result in account suspension.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">5. Privacy & Data Protection</h3>
                  <p>• We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.<br />• Your personal information (name, contact details, location) is encrypted and securely stored.<br />• Location data is collected only during active service delivery for safety and coordination.<br />• Payment information is processed by PayMongo (PCI-DSS compliant) - we never store your card details.<br />• You have the right to access, correct, or delete your personal data at any time.<br />• We do not sell your personal information to third parties.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">6. Prohibited Activities</h3>
                  <p>• Fraudulent activities or misrepresentation.<br />• Harassment or abusive behavior towards other users.<br />• Circumventing the platform for direct transactions.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">7. Account Termination</h3>
                  <p>• We reserve the right to suspend or terminate accounts that violate these terms.<br />• Users may request account deletion at any time.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Violation Consequences */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Violation Consequences</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">What happens when terms are violated</p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {violations.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl ${item.severity === 'low' ? 'bg-yellow-50 border border-yellow-200' :
                      item.severity === 'medium' ? 'bg-orange-50 border border-orange-200' :
                        item.severity === 'high' ? 'bg-red-50 border border-red-200' :
                          'bg-red-100 border border-red-300'
                    }`}
                >
                  <span className={`font-medium ${item.severity === 'low' ? 'text-yellow-800' :
                      item.severity === 'medium' ? 'text-orange-800' :
                        item.severity === 'high' ? 'text-red-800' :
                          'text-red-900'
                    }`}>{item.offense}</span>
                  <span className={`text-sm ${item.severity === 'low' ? 'text-yellow-700' :
                      item.severity === 'medium' ? 'text-orange-700' :
                        item.severity === 'high' ? 'text-red-700' :
                          'text-red-800'
                    }`}>{item.consequence}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className={`${currentColors.accentBg} rounded-2xl p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Questions about these terms?</h3>
              <p className="text-white/80 text-sm mt-1">Contact us at support@gssmaasin.com</p>
            </div>
          </div>
        </div>

        {/* Agreement Footer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <CheckCircle className={`w-12 h-12 ${currentColors.iconColor} mx-auto mb-3`} />
          <h3 className="font-semibold text-gray-900">By using GSS Maasin</h3>
          <p className="text-sm text-gray-600 mt-2">
            You acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>

        {/* App Info */}
        <div className="text-center py-6 text-gray-500 text-sm">
          <p className="font-medium">GSS Maasin Web v1.0.0</p>
          <p className="mt-1">© 2025 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
