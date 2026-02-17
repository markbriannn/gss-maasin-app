'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
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
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

        {/* Dark Mode Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4 flex items-center transition-colors duration-300">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}>
            {isDark ? (
              <Moon className="w-5 h-5 text-yellow-400" />
            ) : (
              <Sun className="w-5 h-5 text-[#00B14F]" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Dark Mode</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-[#00B14F]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDark ? 'left-7' : 'left-1'}`}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />

        {/* Settings Options */}
        <div className="space-y-3">
          {settingsOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => router.push(option.href)}
              className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}>
                <option.icon className="w-5 h-5 text-[#00B14F]" />
              </div>
              <span className="flex-1 text-left font-semibold text-gray-900 dark:text-white">{option.title}</span>
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-8 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 flex items-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="flex-1 text-left font-semibold text-red-600">Logout</span>
        </button>
      </div>
    </AdminLayout>
  );
}

