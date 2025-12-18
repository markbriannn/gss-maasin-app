'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Shield, Users, Wallet, AlertTriangle, CheckCircle, XCircle, Scale, Clock, CreditCard, Star, MapPin, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Shared terms that apply to all users
const sharedTerms = [
  {
    title: 'Acceptance of Terms',
    icon: CheckCircle,
    content: 'By accessing and using GSS Maasin, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.',
  },
  {
    title: 'Service Description',
    icon: FileText,
    content: 'GSS Maasin is a platform that connects service providers with clients seeking various home services in Maasin City, including electrical, plumbing, carpentry, and cleaning services.',
  },
  {
    title: 'User Accounts',
    icon: Users,
    content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized use.',
  },
  {
    title: 'Privacy & Data',
    icon: Shield,
    content: 'Your privacy is important to us. We collect and use your data in accordance with our Privacy Policy. By using our services, you consent to our data practices.',
  },
];

// Client-specific terms
const clientTerms = [
  {
    title: 'Booking Services',
    icon: Clock,
    content: 'When you book a service, you agree to provide accurate information about your location and service requirements. Bookings are subject to provider availability and acceptance.',
  },
  {
    title: 'Payment Obligations',
    icon: CreditCard,
    content: 'You agree to pay for services as agreed upon booking. Payment can be made via GCash, Maya, or cash. Failure to pay may result in account restrictions.',
  },
  {
    title: 'Cancellation Policy',
    icon: XCircle,
    content: 'You may cancel a booking before the provider starts traveling at no charge. Repeated cancellations or no-shows may result in temporary or permanent account suspension.',
  },
  {
    title: 'Reviews & Ratings',
    icon: Star,
    content: 'You agree to provide honest and fair reviews. Fraudulent, abusive, or discriminatory reviews will be removed and may result in account action.',
  },
  {
    title: 'Safety & Conduct',
    icon: Shield,
    content: 'You agree to treat service providers with respect and provide a safe working environment. Harassment or unsafe conditions will not be tolerated.',
  },
];

// Provider-specific terms
const providerTerms = [
  {
    title: 'Service Quality',
    icon: Star,
    content: 'You agree to provide professional, quality services as described in your profile. Maintain accurate information about your skills, pricing, and availability.',
  },
  {
    title: 'Service Fees',
    icon: Wallet,
    content: 'GSS Maasin charges a 5% service fee on completed jobs. This fee is automatically deducted from your earnings and helps maintain the platform.',
  },
  {
    title: 'Payout Terms',
    icon: CreditCard,
    content: 'Earnings can be withdrawn to your registered GCash or Maya account. Payouts are processed within 1-3 business days after admin approval. Minimum withdrawal is ₱100.',
  },
  {
    title: 'Job Acceptance',
    icon: Clock,
    content: 'You have a limited time to accept or decline job requests. Failure to respond will auto-decline the job. Excessive declines may affect your visibility.',
  },
  {
    title: 'Location Tracking',
    icon: MapPin,
    content: 'When on an active job, your location is shared with the client for safety and transparency. Location tracking stops when the job is completed.',
  },
  {
    title: 'Professional Conduct',
    icon: Shield,
    content: 'You agree to maintain professional conduct, arrive on time, and communicate clearly with clients. Violations may result in suspension or removal from the platform.',
  },
];

// Admin-specific terms
const adminTerms = [
  {
    title: 'Administrative Authority',
    icon: Scale,
    content: 'As an administrator, you have authority to approve providers, process payouts, and manage user accounts. Use this authority responsibly and fairly.',
  },
  {
    title: 'Provider Verification',
    icon: Users,
    content: 'You are responsible for verifying provider documents and qualifications before approval. Ensure all providers meet platform standards.',
  },
  {
    title: 'Payout Processing',
    icon: Wallet,
    content: 'Process payout requests promptly and verify account details before approval. Document any rejected requests with clear reasons.',
  },
  {
    title: 'Dispute Resolution',
    icon: MessageCircle,
    content: 'Handle disputes fairly by reviewing all evidence from both parties. Document decisions and communicate clearly with affected users.',
  },
  {
    title: 'Account Management',
    icon: Shield,
    content: 'Suspend or terminate accounts only for valid policy violations. Provide clear reasons and follow due process for all account actions.',
  },
  {
    title: 'Data Confidentiality',
    icon: FileText,
    content: 'Maintain strict confidentiality of user data and platform information. Do not share sensitive information outside of official duties.',
  },
];

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
  
  // Get role-specific terms
  const roleTerms = role === 'ADMIN' ? adminTerms : role === 'PROVIDER' ? providerTerms : clientTerms;
  
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
                  Last updated: December 2024
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* General Terms */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">General Terms</h2>
            <p className="text-sm text-gray-500">Applicable to all users</p>
          </div>
          <div className="p-4 space-y-4">
            {sharedTerms.map((term, index) => (
              <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 ${currentColors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <term.icon className={`w-5 h-5 ${currentColors.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{term.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{term.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role-Specific Terms */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{roleLabel} Terms</h2>
              <p className="text-sm text-gray-500">Specific to your role</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentColors.badgeBg}`}>
              {roleLabel}
            </span>
          </div>
          <div className="p-4 space-y-4">
            {roleTerms.map((term, index) => (
              <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 ${currentColors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <term.icon className={`w-5 h-5 ${currentColors.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{term.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{term.content}</p>
                </div>
              </div>
            ))}
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
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    item.severity === 'low' ? 'bg-yellow-50 border border-yellow-200' :
                    item.severity === 'medium' ? 'bg-orange-50 border border-orange-200' :
                    item.severity === 'high' ? 'bg-red-50 border border-red-200' :
                    'bg-red-100 border border-red-300'
                  }`}
                >
                  <span className={`font-medium ${
                    item.severity === 'low' ? 'text-yellow-800' :
                    item.severity === 'medium' ? 'text-orange-800' :
                    item.severity === 'high' ? 'text-red-800' :
                    'text-red-900'
                  }`}>{item.offense}</span>
                  <span className={`text-sm ${
                    item.severity === 'low' ? 'text-yellow-700' :
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
          <p className="mt-1">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
