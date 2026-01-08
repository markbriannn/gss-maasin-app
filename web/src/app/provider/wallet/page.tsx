'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { 
  Wallet, DollarSign, CheckCircle, Clock, Plus, Pencil, X,
  TrendingUp, RefreshCw, Sparkles, CreditCard, Send, History, Shield
} from 'lucide-react';

const SYSTEM_FEE_PERCENTAGE = 0.05;
const MINIMUM_PAYOUT_AMOUNT = 100;

interface PayoutAccount {
  method: 'gcash' | 'maya';
  accountNumber: string;
  accountName: string;
}

interface PayoutHistory {
  id: string;
  amount: number;
  method: string;
  status: string;
  requestedAt: Date;
  processedAt?: Date;
}

export default function WalletPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState({ total: 0, available: 0, pending: 0, withdrawn: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'gcash' | 'maya'>('gcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.uid) {
      fetchPayoutAccount();
      fetchPayoutHistory();
      const unsubscribe = setupEarningsListener();
      return () => unsubscribe && unsubscribe();
    }
  }, [user]);

  const fetchPayoutAccount = async () => {
    try {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.payoutAccount || data.payoutMethod) {
          const account = data.payoutAccount || data.payoutMethod;
          setPayoutAccount({ method: account.method || account.type || 'gcash', accountNumber: account.accountNumber, accountName: account.accountName });
        }
      }
    } catch (error) { console.error('Error fetching payout account:', error); }
  };

  const fetchPayoutHistory = async () => {
    try {
      if (!user?.uid) return;
      
      // Query both collections: 'payoutRequests' (web) and 'payouts' (mobile/backend)
      const payoutRequestsQuery = query(collection(db, 'payoutRequests'), where('providerId', '==', user.uid));
      const payoutsQuery = query(collection(db, 'payouts'), where('providerId', '==', user.uid));
      
      const unsubscribe1 = onSnapshot(payoutRequestsQuery, (snapshot1) => {
        onSnapshot(payoutsQuery, (snapshot2) => {
          const history: PayoutHistory[] = [];
          const seenIds = new Set<string>();
          
          // Add from payoutRequests collection
          snapshot1.forEach((doc) => {
            const data = doc.data();
            seenIds.add(doc.id);
            history.push({ id: doc.id, amount: data.amount || 0, method: data.accountMethod || data.method, status: data.status, requestedAt: data.requestedAt?.toDate() || new Date(), processedAt: data.processedAt?.toDate() });
          });
          
          // Add from payouts collection (avoid duplicates)
          snapshot2.forEach((doc) => {
            if (!seenIds.has(doc.id)) {
              const data = doc.data();
              history.push({ id: doc.id, amount: data.amount || 0, method: data.accountMethod || data.method, status: data.status, requestedAt: data.requestedAt?.toDate() || new Date(), processedAt: data.processedAt?.toDate() || data.completedAt?.toDate() });
            }
          });
          
          history.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
          setPayoutHistory(history);
        });
      });
      return unsubscribe1;
    } catch (error) { console.error('Error fetching payout history:', error); }
  };

  const setupEarningsListener = () => {
    if (!user?.uid) return;
    const bookingsQuery = query(collection(db, 'bookings'), where('providerId', '==', user.uid));
    const unsubscribe = onSnapshot(bookingsQuery, async (snapshot) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      let totalEarnings = 0, thisMonthEarnings = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;
        if (isCompleted || isPayFirstConfirmed) {
          let amount = data.finalAmount;
          if (!amount) {
            const baseAmount = data.providerPrice || data.totalAmount || data.price || 0;
            const approvedCharges = (data.additionalCharges || []).filter((c: { status: string }) => c.status === 'approved').reduce((sum: number, c: { total?: number; amount?: number }) => sum + (c.total || c.amount || 0), 0);
            amount = baseAmount + approvedCharges;
          }
          const systemFee = data.systemFee || (amount * SYSTEM_FEE_PERCENTAGE);
          const providerEarnings = data.providerEarnings || (amount - systemFee);
          totalEarnings += providerEarnings;
          const earnedDate = isPayFirstConfirmed ? data.clientConfirmedAt?.toDate() || new Date() : data.completedAt?.toDate() || new Date();
          if (earnedDate >= monthStart) thisMonthEarnings += providerEarnings;
        }
      });

      let withdrawn = 0, pending = 0;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) { const userData = userDoc.data(); withdrawn = userData.totalWithdrawn || 0; pending = userData.pendingPayout || 0; }
      setEarnings({ total: totalEarnings, available: Math.max(totalEarnings - withdrawn - pending, 0), pending, withdrawn, thisMonth: thisMonthEarnings });
      setLoading(false);
      setRefreshing(false);
    });
    return unsubscribe;
  };

  const handleRefresh = () => { setRefreshing(true); };

  const handleSavePayoutAccount = async () => {
    if (!accountNumber || accountNumber.length < 10) { alert('Please enter a valid account number'); return; }
    if (!accountName || accountName.length < 2) { alert('Please enter the account holder name'); return; }
    setSavingAccount(true);
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        payoutAccount: { method: selectedMethod, accountNumber, accountName, updatedAt: new Date() },
        payoutMethod: { type: selectedMethod, accountNumber, accountName, updatedAt: new Date() },
      });
      setPayoutAccount({ method: selectedMethod, accountNumber, accountName });
      setShowSetupModal(false);
      alert('Payout account saved successfully!');
    } catch (error) { console.error('Error saving payout account:', error); alert('Failed to save payout account'); }
    finally { setSavingAccount(false); }
  };

  const handleRequestPayout = async () => {
    if (!payoutAccount) { if (confirm('Please setup your GCash or Maya account first. Setup now?')) setShowSetupModal(true); return; }
    if (earnings.available < MINIMUM_PAYOUT_AMOUNT) { alert(`Minimum payout is ₱${MINIMUM_PAYOUT_AMOUNT}. Your available balance is ₱${earnings.available.toFixed(2)}`); return; }
    const methodName = payoutAccount.method === 'gcash' ? 'GCash' : 'Maya';
    if (!confirm(`Request payout of ₱${earnings.available.toFixed(2)} to your ${methodName} account?`)) return;
    setRequestingPayout(true);
    try {
      const payoutAmount = earnings.available;
      const providerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Provider';
      
      // Create payout request
      const payoutRef = await addDoc(collection(db, 'payoutRequests'), { 
        providerId: user!.uid, 
        providerName, 
        amount: payoutAmount, 
        accountMethod: payoutAccount.method, 
        accountNumber: payoutAccount.accountNumber, 
        accountName: payoutAccount.accountName, 
        status: 'pending', 
        requestedAt: serverTimestamp() 
      });
      
      await updateDoc(doc(db, 'users', user!.uid), { pendingPayout: (earnings.pending || 0) + payoutAmount });
      
      // Send notification to all admins
      try {
        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'ADMIN'));
        const adminsSnapshot = await getDocs(adminsQuery);
        
        const notificationPromises = adminsSnapshot.docs.map(adminDoc => 
          addDoc(collection(db, 'notifications'), {
            userId: adminDoc.id,
            targetUserId: adminDoc.id,
            type: 'payout_request',
            title: 'New Payout Request',
            message: `${providerName} requested a payout of ₱${payoutAmount.toLocaleString()} via ${methodName}`,
            data: {
              payoutId: payoutRef.id,
              providerId: user!.uid,
              providerName,
              amount: payoutAmount,
              accountMethod: methodName,
            },
            read: false,
            createdAt: serverTimestamp(),
          })
        );
        await Promise.all(notificationPromises);
      } catch (notifError) {
        console.error('Error sending admin notification:', notifError);
      }
      
      alert(`Payout request of ₱${payoutAmount.toFixed(2)} submitted! Admin will process it within 24 hours.`);
    } catch (error) { console.error('Error requesting payout:', error); alert('Failed to request payout'); }
    finally { setRequestingPayout(false); }
  };

  const formatCurrency = (amount: number) => `₱${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (authLoading || loading) {
    return (
      <ProviderLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">My Wallet</h1>
                  <p className="text-blue-100 text-sm">Manage your earnings and payouts</p>
                </div>
              </div>
              <button onClick={handleRefresh} disabled={refreshing}
                className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/25 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Main Balance Card */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Available Balance</p>
                  <p className="text-4xl font-bold text-white">{formatCurrency(earnings.available)}</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 rounded-full">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-300 text-sm font-semibold">Ready to withdraw</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-blue-200 text-xs mb-1">Total Earned</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(earnings.total)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-blue-200 text-xs mb-1">Withdrawn</p>
                  <p className="text-xl font-bold text-emerald-300">{formatCurrency(earnings.withdrawn)}</p>
                </div>
              </div>

              {earnings.pending > 0 && (
                <div className="bg-amber-500/20 rounded-xl p-3 mt-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span className="text-amber-200 text-sm font-medium">Pending Payout: {formatCurrency(earnings.pending)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">This Month</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(earnings.thisMonth)}</p>
                </div>
              </div>
            </div>
            <button onClick={() => router.push('/provider/earnings')} className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">View All</p>
                  <p className="text-lg font-bold text-gray-900">Earnings →</p>
                </div>
              </div>
            </button>
          </div>

          {/* Payout Account */}
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-3">Payout Account</h2>
            {payoutAccount ? (
              <div className="bg-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${payoutAccount.method === 'gcash' ? 'bg-blue-500' : 'bg-green-500'}`}>
                    <span className="text-white font-bold text-xl">{payoutAccount.method === 'gcash' ? 'G' : 'M'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{payoutAccount.method === 'gcash' ? 'GCash' : 'Maya'}</p>
                    <p className="text-gray-500 text-sm">{payoutAccount.accountNumber.slice(-4).padStart(payoutAccount.accountNumber.length, '*')}</p>
                    <p className="text-gray-400 text-xs">{payoutAccount.accountName}</p>
                  </div>
                  <button onClick={() => { setSelectedMethod(payoutAccount.method); setAccountNumber(payoutAccount.accountNumber); setAccountName(payoutAccount.accountName); setShowSetupModal(true); }}
                    className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <Pencil className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowSetupModal(true)}
                className="w-full bg-white rounded-2xl p-6 shadow-lg border-2 border-dashed border-gray-200 flex flex-col items-center hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <p className="font-bold text-gray-900 text-lg">Setup Payout Account</p>
                <p className="text-gray-500 text-sm mt-1">Add your GCash or Maya to receive payouts</p>
              </button>
            )}
          </div>

          {/* Request Payout Button */}
          <button onClick={handleRequestPayout} disabled={earnings.available < MINIMUM_PAYOUT_AMOUNT || requestingPayout}
            className={`w-full rounded-2xl py-4 flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-lg ${
              earnings.available >= MINIMUM_PAYOUT_AMOUNT ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-xl' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            <Send className="w-5 h-5" />
            {requestingPayout ? 'Requesting...' : 'Request Payout'}
          </button>
          {earnings.available < MINIMUM_PAYOUT_AMOUNT && (
            <p className="text-gray-400 text-sm text-center mt-2">Minimum payout amount is ₱{MINIMUM_PAYOUT_AMOUNT}</p>
          )}

          {/* Payout History */}
          {payoutHistory.length > 0 && (
            <div className="mt-8 mb-6">
              <h2 className="font-bold text-gray-900 text-lg mb-3">Payout History</h2>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {payoutHistory.map((payout, index) => (
                  <div key={payout.id} className={`p-4 flex items-center justify-between ${index < payoutHistory.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payout.method === 'gcash' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <CreditCard className={`w-5 h-5 ${payout.method === 'gcash' ? 'text-blue-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{formatCurrency(payout.amount)}</p>
                        <p className="text-gray-500 text-xs">{payout.method?.toUpperCase()} • {payout.requestedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      payout.status === 'approved' || payout.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      payout.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {payout.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How Payouts Work */}
          <div className="mt-8 mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-3">How Payouts Work</h2>
            <div className="bg-white rounded-2xl shadow-lg p-5">
              {[
                { icon: CheckCircle, text: 'Complete jobs and earn money', color: 'bg-emerald-100 text-emerald-600' },
                { icon: DollarSign, text: '5% service fee is deducted', color: 'bg-amber-100 text-amber-600' },
                { icon: Wallet, text: `Request payout (min ₱${MINIMUM_PAYOUT_AMOUNT})`, color: 'bg-blue-100 text-blue-600' },
                { icon: Shield, text: 'Receive within 24 hours', color: 'bg-purple-100 text-purple-600' },
              ].map((item, index) => (
                <div key={index} className={`flex items-center gap-4 py-3 ${index < 3 ? 'border-b border-gray-100' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color.split(' ')[0]}`}>
                    <item.icon className={`w-5 h-5 ${item.color.split(' ')[1]}`} />
                  </div>
                  <span className="text-gray-700 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Setup Payout Account</h3>
                <button onClick={() => setShowSetupModal(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => setSelectedMethod('gcash')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all ${selectedMethod === 'gcash' ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center mb-2 shadow-lg">
                    <span className="text-white font-bold text-2xl">G</span>
                  </div>
                  <span className="font-bold text-gray-900">GCash</span>
                </button>
                <button onClick={() => setSelectedMethod('maya')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all ${selectedMethod === 'maya' ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center mb-2 shadow-lg">
                    <span className="text-white font-bold text-2xl">M</span>
                  </div>
                  <span className="font-bold text-gray-900">Maya</span>
                </button>
              </div>

              <p className="text-sm font-semibold text-gray-700 mb-2">{selectedMethod === 'gcash' ? 'GCash' : 'Maya'} Number</p>
              <input type="tel" placeholder="09XX XXX XXXX" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={11}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 outline-none mb-4 font-medium" />

              <p className="text-sm font-semibold text-gray-700 mb-2">Account Holder Name</p>
              <input type="text" placeholder="Juan Dela Cruz" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 outline-none mb-6 font-medium" />

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowSetupModal(false)} className="py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleSavePayoutAccount} disabled={savingAccount}
                  className="py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold disabled:opacity-50 hover:shadow-lg transition-all">
                  {savingAccount ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  );
}
