'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  ArrowLeft, CreditCard, Plus, Trash2, Star, CheckCircle, X, Wallet, Smartphone, Banknote, Shield
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'gcash' | 'maya' | 'card' | 'cash';
  name: string;
  accountNumber?: string;
  isDefault: boolean;
}

const PAYMENT_TYPES = [
  { id: 'gcash', name: 'GCash', icon: '💚', color: '#00B14F', bgColor: 'bg-green-50', textColor: 'text-green-600' },
  { id: 'maya', name: 'Maya', icon: '💜', color: '#7B3FE4', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  { id: 'card', name: 'Credit/Debit Card', icon: '💳', color: '#3B82F6', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  { id: 'cash', name: 'Cash', icon: '💵', color: '#10B981', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
];

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: 'gcash' as PaymentMethod['type'], name: '', accountNumber: '' });

  useEffect(() => {
    if (user?.uid) fetchPaymentMethods();
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      if (userDoc.exists()) setPaymentMethods(userDoc.data().paymentMethods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!newMethod.name) return;
    const method: PaymentMethod = {
      id: Date.now().toString(),
      type: newMethod.type,
      name: newMethod.name,
      accountNumber: newMethod.accountNumber,
      isDefault: paymentMethods.length === 0,
    };
    const updatedMethods = [...paymentMethods, method];
    try {
      await updateDoc(doc(db, 'users', user!.uid), { paymentMethods: updatedMethods });
      setPaymentMethods(updatedMethods);
      setShowAddModal(false);
      setNewMethod({ type: 'gcash', name: '', accountNumber: '' });
    } catch (error) {
      console.error('Error adding payment method:', error);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    const updatedMethods = paymentMethods.map((m) => ({ ...m, isDefault: m.id === methodId }));
    try {
      await updateDoc(doc(db, 'users', user!.uid), { paymentMethods: updatedMethods });
      setPaymentMethods(updatedMethods);
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleDelete = async (methodId: string) => {
    const updatedMethods = paymentMethods.filter((m) => m.id !== methodId);
    try {
      await updateDoc(doc(db, 'users', user!.uid), { paymentMethods: updatedMethods });
      setPaymentMethods(updatedMethods);
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  const getTypeConfig = (type: string) => PAYMENT_TYPES.find((t) => t.id === type) || PAYMENT_TYPES[0];

  if (loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
                  <p className="text-emerald-100 text-sm">Manage your payment options</p>
                </div>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-white/80" />
                  <span className="text-2xl font-bold text-white">{paymentMethods.length}</span>
                </div>
                <p className="text-xs text-white/70">Saved Methods</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-white/80" />
                  <span className="text-2xl font-bold text-white">100%</span>
                </div>
                <p className="text-xs text-white/70">Secure</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 -mt-4">
          {/* Add Method Button */}
          <button onClick={() => setShowAddModal(true)}
            className="w-full bg-white rounded-2xl shadow-lg p-4 mb-4 flex items-center justify-center gap-3 hover:shadow-xl transition-all border-2 border-dashed border-emerald-200 hover:border-emerald-400 group">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <Plus className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Add Payment Method</p>
              <p className="text-sm text-gray-500">GCash, Maya, Card, or Cash</p>
            </div>
          </button>

          {/* Payment Methods List */}
          {paymentMethods.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-12 h-12 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No payment methods</h3>
              <p className="text-gray-500 mb-6">Add a payment method to make bookings faster and easier</p>
              <button onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                <Plus className="w-5 h-5" />
                Add Your First Method
              </button>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {paymentMethods.map((method) => {
                const typeConfig = getTypeConfig(method.type);
                return (
                  <div key={method.id}
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden border ${method.isDefault ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-gray-100'}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className={`w-14 h-14 ${typeConfig.bgColor} rounded-2xl flex items-center justify-center`}>
                        <span className="text-2xl">{typeConfig.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{method.name}</p>
                          {method.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                              <Star className="w-3 h-3 fill-current" /> Default
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${typeConfig.textColor}`}>{typeConfig.name}</p>
                        {method.accountNumber && (
                          <p className="text-sm text-gray-400 mt-0.5">•••• {method.accountNumber.slice(-4)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <button onClick={() => handleSetDefault(method.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Set as default">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(method.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Security Note */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Your payment info is secure</p>
              <p className="text-xs text-blue-700 mt-0.5">We use industry-standard encryption to protect your data</p>
            </div>
          </div>
        </div>

        {/* Add Method Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Add Payment Method</h2>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Payment Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_TYPES.map((type) => (
                      <button key={type.id} onClick={() => setNewMethod({ ...newMethod, type: type.id as PaymentMethod['type'] })}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                          newMethod.type === type.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <span className="text-xl">{type.icon}</span>
                        <span className={`text-sm font-medium ${newMethod.type === type.id ? 'text-emerald-700' : 'text-gray-700'}`}>{type.name.split('/')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Label / Name</label>
                  <input type="text" value={newMethod.name} onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                    placeholder="e.g., My GCash, Personal Card"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                </div>

                {/* Account Number Input */}
                {newMethod.type !== 'cash' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {newMethod.type === 'card' ? 'Card Number (last 4 digits)' : 'Phone Number'}
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                      <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                      </div>
                      <input type="text" value={newMethod.accountNumber} onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                        placeholder={newMethod.type === 'card' ? '1234' : '09XX XXX XXXX'}
                        className="flex-1 px-4 py-3 outline-none" />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleAddMethod} disabled={!newMethod.name}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Add Method
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
