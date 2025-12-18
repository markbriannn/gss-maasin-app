'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, MessageCircle, Phone, Mail, ChevronRight, Shield, Briefcase, Users, Wallet, Star, MapPin, Clock, CreditCard, FileText, Settings, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Role-specific FAQs
const clientFaqs = [
  {
    question: 'How do I book a service?',
    answer: 'Browse available providers by category, select one that matches your needs, choose your preferred date and time, and confirm your booking. You can pay via GCash, Maya, or cash.',
    icon: Briefcase,
  },
  {
    question: 'How do I track my service provider?',
    answer: 'Once your booking is confirmed and the provider starts traveling, you can track their real-time location on the map. You\'ll receive notifications at each stage.',
    icon: MapPin,
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept GCash, Maya, and cash payments. For online payments, you can choose to pay before or after the service is completed.',
    icon: CreditCard,
  },
  {
    question: 'How do I cancel a booking?',
    answer: 'You can cancel a booking from the booking details page before the provider starts traveling. Please provide a reason to help us improve our service.',
    icon: AlertCircle,
  },
  {
    question: 'How do I leave a review?',
    answer: 'After your service is completed, you\'ll be prompted to rate and review your provider. Your feedback helps other clients make informed decisions.',
    icon: Star,
  },
  {
    question: 'How do I save favorite providers?',
    answer: 'Tap the heart icon on any provider\'s profile to add them to your favorites. Access your favorites from your profile menu for quick rebooking.',
    icon: Users,
  },
];

const providerFaqs = [
  {
    question: 'How do I accept job requests?',
    answer: 'When a client books your service, you\'ll receive a notification. Go to your Jobs tab to view and accept or decline the request within the time limit.',
    icon: Briefcase,
  },
  {
    question: 'How do I update my availability?',
    answer: 'Toggle your availability status from your dashboard. When unavailable, you won\'t receive new job requests but can still complete ongoing jobs.',
    icon: Clock,
  },
  {
    question: 'How do I withdraw my earnings?',
    answer: 'Go to your Wallet, set up your payout method (GCash or Maya), and request a withdrawal. Payouts are processed within 1-3 business days after admin approval.',
    icon: Wallet,
  },
  {
    question: 'What is the service fee?',
    answer: 'GSS Maasin charges a 5% service fee on completed jobs. This fee is automatically deducted from your earnings and helps maintain the platform.',
    icon: CreditCard,
  },
  {
    question: 'How do I improve my rating?',
    answer: 'Provide quality service, arrive on time, communicate clearly with clients, and maintain professionalism. Higher ratings lead to more bookings.',
    icon: Star,
  },
  {
    question: 'How do I update my service pricing?',
    answer: 'Go to your Profile settings to update your hourly rate or fixed price. You can also add service descriptions and showcase your work.',
    icon: Settings,
  },
];

const adminFaqs = [
  {
    question: 'How do I approve new providers?',
    answer: 'Go to the Providers section, filter by "Pending" status, review their documents and information, then approve or reject their application.',
    icon: Users,
  },
  {
    question: 'How do I process payout requests?',
    answer: 'Navigate to Earnings, view pending payout requests, verify the provider\'s account details, and approve or reject the request.',
    icon: Wallet,
  },
  {
    question: 'How do I monitor active jobs?',
    answer: 'Use the Live Map to see all active jobs and provider locations in real-time. Click on any marker for detailed information.',
    icon: MapPin,
  },
  {
    question: 'How do I handle disputes?',
    answer: 'Review the job details, chat history, and both parties\' accounts. You can issue refunds, suspend accounts, or mediate through the messaging system.',
    icon: AlertCircle,
  },
  {
    question: 'How do I view platform analytics?',
    answer: 'The Analytics dashboard shows key metrics including total jobs, revenue, user growth, and performance trends over time.',
    icon: FileText,
  },
  {
    question: 'How do I suspend a user account?',
    answer: 'Go to the user\'s profile (Provider or Client), click the suspend button, select a reason, and confirm. The user will be notified and blocked from logging in.',
    icon: Shield,
  },
];

// Role-specific quick actions
const clientQuickActions = [
  { label: 'Book a Service', href: '/client/book', icon: Briefcase },
  { label: 'My Bookings', href: '/client/bookings', icon: FileText },
  { label: 'Find Providers', href: '/client/providers', icon: Users },
];

const providerQuickActions = [
  { label: 'My Jobs', href: '/provider/jobs', icon: Briefcase },
  { label: 'My Wallet', href: '/provider/wallet', icon: Wallet },
  { label: 'My Earnings', href: '/provider/earnings', icon: CreditCard },
];

const adminQuickActions = [
  { label: 'Manage Providers', href: '/admin/providers', icon: Users },
  { label: 'View Analytics', href: '/admin/analytics', icon: FileText },
  { label: 'Process Payouts', href: '/admin/earnings', icon: Wallet },
];

export default function HelpPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const role = user?.role?.toUpperCase() || 'CLIENT';
  
  // Get role-specific content
  const faqs = role === 'ADMIN' ? adminFaqs : role === 'PROVIDER' ? providerFaqs : clientFaqs;
  const quickActions = role === 'ADMIN' ? adminQuickActions : role === 'PROVIDER' ? providerQuickActions : clientQuickActions;
  
  // Role-specific colors
  const colors = {
    ADMIN: {
      gradient: 'from-violet-600 via-purple-600 to-indigo-700',
      light: 'violet',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      buttonBg: 'bg-violet-600 hover:bg-violet-700',
      accentBg: 'bg-gradient-to-r from-violet-500 to-purple-600',
    },
    PROVIDER: {
      gradient: 'from-blue-600 via-indigo-600 to-purple-700',
      light: 'blue',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      accentBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    },
    CLIENT: {
      gradient: 'from-emerald-600 via-green-600 to-teal-700',
      light: 'emerald',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      accentBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
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
              <h1 className="text-2xl font-bold">Help Center</h1>
              <p className="text-white/80 text-sm">{roleLabel} Support</p>
            </div>
          </div>
          
          {/* Hero Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">How can we help you?</h2>
                <p className="text-white/80 text-sm mt-1">
                  Find answers to common questions or contact our support team
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Contact Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Contact Support</h2>
            <p className="text-sm text-gray-500">Get in touch with our team</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <a
                href="mailto:support@gssmaasin.com"
                className={`flex flex-col items-center p-4 ${currentColors.iconBg} rounded-xl hover:scale-105 transition-all duration-200`}
              >
                <div className={`w-12 h-12 ${currentColors.accentBg} rounded-full flex items-center justify-center mb-3 shadow-lg`}>
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <span className="font-medium text-gray-900">Email</span>
                <span className="text-xs text-gray-500 mt-1">support@gssmaasin.com</span>
              </a>
              <a
                href="tel:+639123456789"
                className={`flex flex-col items-center p-4 ${currentColors.iconBg} rounded-xl hover:scale-105 transition-all duration-200`}
              >
                <div className={`w-12 h-12 ${currentColors.accentBg} rounded-full flex items-center justify-center mb-3 shadow-lg`}>
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <span className="font-medium text-gray-900">Call</span>
                <span className="text-xs text-gray-500 mt-1">+63 912 345 6789</span>
              </a>
              <Link
                href="/chat/new?recipientId=admin"
                className={`flex flex-col items-center p-4 ${currentColors.iconBg} rounded-xl hover:scale-105 transition-all duration-200`}
              >
                <div className={`w-12 h-12 ${currentColors.accentBg} rounded-full flex items-center justify-center mb-3 shadow-lg`}>
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="font-medium text-gray-900">Chat</span>
                <span className="text-xs text-gray-500 mt-1">Live Support</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500">Common tasks for {roleLabel.toLowerCase()}s</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-10 h-10 ${currentColors.iconBg} rounded-lg flex items-center justify-center`}>
                    <action.icon className={`w-5 h-5 ${currentColors.iconColor}`} />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500">Common questions for {roleLabel.toLowerCase()}s</p>
          </div>
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 ${currentColors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <faq.icon className={`w-5 h-5 ${currentColors.iconColor}`} />
                  </div>
                  <span className="font-medium text-gray-900 flex-1 text-left">{faq.question}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pl-18 ml-14 text-gray-600 text-sm border-l-2 border-gray-100">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Additional Resources</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/terms"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 ${currentColors.iconColor}`} />
                <span className="font-medium text-gray-900">Terms of Service</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              href="/privacy"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${currentColors.iconColor}`} />
                <span className="font-medium text-gray-900">Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              href="/about"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className={`w-5 h-5 ${currentColors.iconColor}`} />
                <span className="font-medium text-gray-900">About GSS Maasin</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
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
