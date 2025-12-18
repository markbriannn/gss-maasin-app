'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  ArrowLeft, User, Bell, Shield, Moon, HelpCircle, FileText, 
  Info, LogOut, ChevronRight, Mail, Phone, Wallet,
  Receipt, CreditCard
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      router.push('/');
    }
  };

  const getDashboardUrl = () => {
    const role = user?.role?.toUpperCase();
    if (role === 'ADMIN') return '/admin';
    if (role === 'PROVIDER') return '/provider';
    return '/client';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  interface MenuItem {
    icon: typeof User;
    label: string;
    href?: string;
    value?: string | boolean;
    toggle?: boolean;
    onChange?: () => void;
    disabled?: boolean;
    note?: string;
  }

  interface MenuSection {
    title: string;
    items: MenuItem[];
  }

  const role = user?.role?.toUpperCase();
  const isProvider = role === 'PROVIDER';
  const isClient = role === 'CLIENT';

  // Provider-specific options
  const providerOptions: MenuItem[] = [
    { icon: Wallet, label: 'Wallet & Payouts', href: '/provider/wallet' },
    { icon: Receipt, label: 'Transaction History', href: '/provider/transactions' },
    { icon: CreditCard, label: 'Payment Methods', href: '/provider/payment-methods' },
  ];

  // Client-specific options
  const clientOptions: MenuItem[] = [
    { icon: CreditCard, label: 'Payment Methods', href: '/client/payment-methods' },
  ];

  const menuSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', href: '/settings/profile' },
        { icon: Mail, label: 'Email', value: user?.email || 'Not set' },
        { icon: Phone, label: 'Phone', value: user?.phoneNumber || user?.phone || 'Not set' },
      ],
    },
    // Add payment section for providers and clients
    ...(isProvider ? [{
      title: 'Payments & Wallet',
      items: providerOptions,
    }] : isClient ? [{
      title: 'Payments',
      items: clientOptions,
    }] : []),
    {
      title: 'Preferences',
      items: [
        { 
          icon: Bell, 
          label: 'Notifications', 
          href: '/notifications',
        },
        { 
          icon: Moon, 
          label: 'Dark Mode', 
          toggle: true, 
          value: darkMode,
          onChange: () => setDarkMode(!darkMode),
          disabled: true,
          note: 'Coming soon'
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', href: '/help' },
        { icon: FileText, label: 'Terms of Service', href: '/terms' },
        { icon: Shield, label: 'Privacy Policy', href: '/privacy' },
        { icon: Info, label: 'About', href: '/about' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={getDashboardUrl()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex items-center gap-4">
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#00B14F]/10 flex items-center justify-center">
              <User className="w-8 h-8 text-[#00B14F]" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-lg">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-gray-500 text-sm capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              {section.title}
            </h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {section.items.map((item, index) => (
                <div key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-400" />
                      <span className="flex-1 text-gray-900">{item.label}</span>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </Link>
                  ) : item.toggle ? (
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <item.icon className="w-5 h-5 text-gray-400" />
                      <span className="flex-1 text-gray-900">
                        {item.label}
                        {item.note && (
                          <span className="text-xs text-gray-400 ml-2">({item.note})</span>
                        )}
                      </span>
                      <button
                        onClick={item.onChange}
                        disabled={item.disabled}
                        className={`w-12 h-7 rounded-full transition-colors relative ${
                          item.value ? 'bg-[#00B14F]' : 'bg-gray-200'
                        } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <item.icon className="w-5 h-5 text-gray-400" />
                      <span className="flex-1 text-gray-900">{item.label}</span>
                      <span className="text-gray-500 text-sm">{item.value}</span>
                    </div>
                  )}
                  {index < section.items.length - 1 && (
                    <div className="border-b border-gray-100 ml-14" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl shadow-sm px-4 py-3.5 flex items-center gap-4 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>

        {/* Version */}
        <p className="text-center text-gray-400 text-sm mt-8">
          GSS Maasin Web v1.0.0
        </p>
      </div>
    </div>
  );
}
