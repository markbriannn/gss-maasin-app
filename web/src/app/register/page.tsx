'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench, User, Briefcase, ArrowLeft, FileText, X, ArrowDown, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'PROVIDER' | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsContentRef = useRef<HTMLDivElement>(null);

  const handleRoleSelect = (role: 'CLIENT' | 'PROVIDER') => {
    setSelectedRole(role);
    setAcceptedTerms(false);
    setHasScrolledToBottom(false);
    setShowTermsModal(true);
  };

  const handleAcceptTerms = () => {
    if (!acceptedTerms) return;
    setShowTermsModal(false);
    if (selectedRole === 'CLIENT') {
      router.push('/register/client');
    } else if (selectedRole === 'PROVIDER') {
      router.push('/register/provider');
    }
  };

  const handleCloseModal = () => {
    setShowTermsModal(false);
    setAcceptedTerms(false);
    setHasScrolledToBottom(false);
  };

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
            <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">H.E.L.P Maasin</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Join H.E.L.P Maasin
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Choose how you want to use the platform
          </p>

          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect('CLIENT')}
              className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-[#00B14F] text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">I need services</h3>
                  <p className="text-gray-500 mt-1">
                    Book trusted service providers for your home or business
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('PROVIDER')}
              className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-[#00B14F] text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">I provide services</h3>
                  <p className="text-gray-500 mt-1">
                    Join as a service provider and grow your business
                  </p>
                </div>
              </div>
            </button>
          </div>

          <p className="text-center text-gray-600 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00B14F] font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00B14F]" />
                <h2 className="text-lg font-bold text-gray-900">Terms & Conditions</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div
              ref={termsContentRef}
              className="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-600 leading-relaxed space-y-4"
              onScroll={handleTermsScroll}
            >
              <p>
                Welcome to H.E.L.P Maasin Service App. By registering as a{' '}
                {selectedRole === 'CLIENT' ? 'Client' : 'Service Provider'}, you agree to the following terms:
              </p>

              <div>
                <p className="font-semibold text-gray-900 mb-1">1. Account Registration</p>
                <p>• You must provide accurate and complete information during registration.<br />• You are responsible for maintaining the security of your account.<br />• You must be at least 18 years old to register.</p>
              </div>

              {selectedRole === 'CLIENT' ? (
                <>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">2. Client Responsibilities</p>
                    <p>• You agree to pay for services rendered as agreed with providers.<br />• Provide accurate job descriptions and requirements.<br />• Treat service providers with respect and professionalism.<br />• Be available at the scheduled service time and location.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">3. Booking & Payments</p>
                    <p>• A 5% service fee is added to all bookings.<br />• Payments can be made via GCash, Maya, or Cash.<br />• Cancellations must be made at least 2 hours before scheduled time.<br />• Refunds are subject to our refund policy and admin approval.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">4. Reviews & Ratings</p>
                    <p>• You may leave honest reviews for completed services.<br />• Reviews must be truthful and not contain offensive content.<br />• Fake or malicious reviews may result in account suspension.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">5. Privacy & Data Protection</p>
                    <p>• We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.<br />• Your personal information (name, contact details, location) is encrypted and securely stored.<br />• Location data is collected only during active service delivery for safety and coordination.<br />• Payment information is processed by PayMongo (PCI-DSS compliant) - we never store your card details.<br />• You have the right to access, correct, or delete your personal data at any time.<br />• We do not sell your personal information to third parties.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">6. Prohibited Activities</p>
                    <p>• Fraudulent activities or misrepresentation.<br />• Harassment or abusive behavior towards other users.<br />• Circumventing the platform for direct transactions.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">7. Account Termination</p>
                    <p>• We reserve the right to suspend or terminate accounts that violate these terms.<br />• Users may request account deletion at any time.</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">2. Provider Requirements</p>
                    <p>• Submit valid government ID and required documents for verification.<br />• Your account requires admin approval before activation.<br />• Maintain professional conduct and quality service at all times.<br />• Keep your availability status updated accurately.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">3. Service Delivery</p>
                    <p>• Arrive on time for scheduled appointments.<br />• Bring all necessary tools and equipment for the job.<br />• Complete work as described in the booking agreement.<br />• Communicate promptly with clients about any issues.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">4. Earnings & Payouts</p>
                    <p>• A 5% service fee is deducted from your earnings.<br />• Minimum payout amount is ₱1.<br />• Payouts are processed to your registered GCash/Maya account.<br />• You are responsible for your own tax obligations.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">5. Quality Standards</p>
                    <p>• Maintain a minimum rating to remain active on the platform.<br />• Respond to job requests within a reasonable time.<br />• Handle customer complaints professionally.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">6. Privacy & Data Protection</p>
                    <p>• We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.<br />• Your personal information (name, contact details, location) is encrypted and securely stored.<br />• Your verification documents (ID, clearances) are accessible only to administrators and never shared with clients.<br />• Location data is collected only during active service delivery for safety and coordination.<br />• Payment information is processed by PayMongo (PCI-DSS compliant) - we never store your card details.<br />• You have the right to access, correct, or delete your personal data at any time.<br />• We do not sell your personal information to third parties.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">7. Prohibited Activities</p>
                    <p>• Fraudulent activities or misrepresentation.<br />• Harassment or abusive behavior towards other users.<br />• Circumventing the platform for direct transactions.</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-1">8. Account Termination</p>
                    <p>• We reserve the right to suspend or terminate accounts that violate these terms.<br />• Users may request account deletion at any time.</p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 space-y-3">
              {!hasScrolledToBottom && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <ArrowDown className="w-4 h-4 flex-shrink-0" />
                  <span>Please scroll down to read all terms before agreeing</span>
                </div>
              )}

              <label
                className={`flex items-center gap-3 cursor-pointer transition-opacity ${hasScrolledToBottom ? 'opacity-100' : 'opacity-40 pointer-events-none'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => hasScrolledToBottom && setAcceptedTerms(e.target.checked)}
                  disabled={!hasScrolledToBottom}
                  className="w-5 h-5 text-[#00B14F] border-gray-300 rounded focus:ring-[#00B14F] cursor-pointer disabled:cursor-not-allowed"
                />
                <span className={`text-sm ${hasScrolledToBottom ? 'text-gray-700' : 'text-gray-400'}`}>
                  I have read and agree to the Terms and Conditions
                </span>
              </label>

              <button
                onClick={handleAcceptTerms}
                disabled={!acceptedTerms}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:bg-gray-300 disabled:cursor-not-allowed bg-[#00B14F] hover:bg-[#009940] active:scale-[0.98]"
              >
                Continue as {selectedRole === 'CLIENT' ? 'Client' : 'Provider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
