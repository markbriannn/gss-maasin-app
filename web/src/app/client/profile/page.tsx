'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import { User, Mail, Phone, MapPin, Camera, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        address: '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
      });
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-[#00B14F] to-[#009940] p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-full overflow-hidden">
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#00B14F] text-2xl font-bold">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="text-white">
                <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h2>
                <p className="text-green-100">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-gray-900">Personal Information</h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-[#00B14F] font-medium hover:underline"
                >
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#00B14F] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#009940] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    First Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.firstName || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Last Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.lastName || '-'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <div className="flex items-center gap-2 text-gray-900">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{user?.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{formData.phoneNumber || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
