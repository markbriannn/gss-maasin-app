'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Settings,
  Bell,
  MessageSquare,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      router.push('/');
    }
  };

  const settingsOptions = [
    { id: 'notifications', icon: Bell, title: 'Notifications', href: '/notifications' },
    { id: 'messages', icon: MessageSquare, title: 'Messages', href: '/admin/messages' },
    { id: 'help', icon: HelpCircle, title: 'Help & Support', href: '/help' },
    { id: 'about', icon: Info, title: 'About', href: '/about' },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Dark Mode Toggle */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-yellow-400" />
            ) : (
              <Sun className="w-5 h-5 text-[#00B14F]" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Dark Mode</p>
            <p className="text-sm text-gray-500">
              {isDarkMode ? 'Currently using dark theme' : 'Currently using light theme'}
            </p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-[#00B14F]' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? 'left-7' : 'left-1'}`}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 my-4" />

        {/* Settings Options */}
        <div className="space-y-3">
          {settingsOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => router.push(option.href)}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mr-4">
                <option.icon className="w-5 h-5 text-[#00B14F]" />
              </div>
              <span className="flex-1 text-left font-semibold text-gray-900">{option.title}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-8 bg-red-50 rounded-xl p-4 flex items-center hover:bg-red-100 transition-colors"
        >
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="flex-1 text-left font-semibold text-red-600">Logout</span>
        </button>
      </div>
    </AdminLayout>
  );
}
