'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Settings, Save, Bell, DollarSign, Shield, Globe } from 'lucide-react';

interface SystemSettings {
  systemFeePercentage: number;
  minBookingAmount: number;
  maxBookingAmount: number;
  enableNotifications: boolean;
  enablePayFirst: boolean;
  enablePayLater: boolean;
  maintenanceMode: boolean;
  supportEmail: string;
  supportPhone: string;
}

export default function AdminSettingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({
    systemFeePercentage: 10,
    minBookingAmount: 100,
    maxBookingAmount: 50000,
    enableNotifications: true,
    enablePayFirst: true,
    enablePayLater: true,
    maintenanceMode: false,
    supportEmail: 'support@gssmaasin.com',
    supportPhone: '+63 912 345 6789',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
      if (settingsDoc.exists()) {
        setSettings({ ...settings, ...settingsDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'system'), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingData) {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Configure system settings</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#00B14F] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#009940] disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Payment Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Fee (%)
                </label>
                <input
                  type="number"
                  value={settings.systemFeePercentage}
                  onChange={(e) => setSettings({ ...settings, systemFeePercentage: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Booking Amount (₱)
                </label>
                <input
                  type="number"
                  value={settings.minBookingAmount}
                  onChange={(e) => setSettings({ ...settings, minBookingAmount: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Booking Amount (₱)
                </label>
                <input
                  type="number"
                  value={settings.maxBookingAmount}
                  onChange={(e) => setSettings({ ...settings, maxBookingAmount: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enablePayFirst}
                  onChange={(e) => setSettings({ ...settings, enablePayFirst: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#00B14F] focus:ring-[#00B14F]"
                />
                <span className="text-gray-700">Enable Pay First option</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enablePayLater}
                  onChange={(e) => setSettings({ ...settings, enablePayLater: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#00B14F] focus:ring-[#00B14F]"
                />
                <span className="text-gray-700">Enable Pay Later option</span>
              </label>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-[#00B14F] focus:ring-[#00B14F]"
              />
              <span className="text-gray-700">Enable push notifications</span>
            </label>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">System</h2>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
              />
              <div>
                <span className="text-gray-700">Maintenance Mode</span>
                <p className="text-sm text-gray-500">When enabled, users will see a maintenance page</p>
              </div>
            </label>
          </div>

          {/* Support Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Support Contact</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Phone
                </label>
                <input
                  type="tel"
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
