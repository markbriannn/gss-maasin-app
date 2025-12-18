'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { 
  DollarSign, CheckCircle, Calculator, Wallet, Plus, Pencil, X,
  Briefcase, Scissors, Zap, RefreshCw, TrendingUp, ArrowDownCircle,
  Clock, ChevronRight, Sparkles, CreditCard, Building2, AlertTriangle,
  XCircle, Send
} from 'lucide-react';

const SYSTEM_FEE_PERCENTAGE = 0.05;
const MINIMUM_PAYOUT_AMOUNT = 100;

interface PayoutAccount {
  method: 'gcash' | 'maya';
  accountNumber: string;
  accountName: string;
}

interface PendingPayout {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  accountMethod: string;
  accountNumber: string;
  accountName: string;
  requestedAt: Date;
  status: string;
}

interface ConfirmModal {
  show: boolean;
  type: 'approve' | 'withdraw' | 'success' | 'error' | 'setup';
  title: string;
  message: string;
  payout?: PendingPayout;
  onConfirm?: () => void;
}

export default function AdminEarningsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState({
    totalSystemFee: 0, availableBalance: 0, pendingWithdrawal: 0, totalWithdrawn: 0, completedJobs: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'gcash' | 'maya'>('gcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ show: false, type: 'approve', title: '', message: '' });


  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'ADMIN') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchAdminPayoutAccount();
      fetchPendingPayouts();
      const unsubscribe = setupEarningsListener();
      return () => unsubscribe && unsubscribe();
    }
  }, [user]);

  const fetchAdminPayoutAccount = async () => {
    try {
      const adminId = user?.uid;
      if (!adminId) return;
      const userDoc = await getDoc(doc(db, 'users', adminId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.adminPayoutAccount) setPayoutAccount(data.adminPayoutAccount);
      }
    } catch (error) {
      console.error('Error fetching admin payout account:', error);
    }
  };

  const fetchPendingPayouts = async () => {
    setLoadingPayouts(true);
    try {
      onSnapshot(collection(db, 'payoutRequests'), async (snapshot1) => {
        onSnapshot(collection(db, 'payouts'), async (snapshot2) => {
          const payoutsRaw: PendingPayout[] = [];
          const seenIds = new Set<string>();
          const providerIdsToFetch = new Set<string>();
          
          snapshot1.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'pending') {
              seenIds.add(docSnap.id);
              if (data.providerId && !data.providerName) providerIdsToFetch.add(data.providerId);
              payoutsRaw.push({
                id: docSnap.id, providerId: data.providerId, providerName: data.providerName || '',
                amount: data.amount || 0, accountMethod: data.accountMethod || data.method,
                accountNumber: data.accountNumber, accountName: data.accountName,
                requestedAt: data.requestedAt?.toDate?.() || new Date(), status: data.status,
              });
            }
          });
          
          snapshot2.forEach((docSnap) => {
            if (!seenIds.has(docSnap.id)) {
              const data = docSnap.data();
              if (data.status === 'pending') {
                if (data.providerId && !data.providerName) providerIdsToFetch.add(data.providerId);
                payoutsRaw.push({
                  id: docSnap.id, providerId: data.providerId, providerName: data.providerName || '',
                  amount: data.amount || 0, accountMethod: data.accountMethod || data.method,
                  accountNumber: data.accountNumber, accountName: data.accountName,
                  requestedAt: data.requestedAt?.toDate?.() || new Date(), status: data.status,
                });
              }
            }
          });
          
          const providerNames: Record<string, string> = {};
          for (const providerId of providerIdsToFetch) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', providerId));
              if (providerDoc.exists()) {
                const p = providerDoc.data();
                providerNames[providerId] = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Provider';
              }
            } catch (e) { console.log('Error fetching provider:', e); }
          }
          
          const payouts = payoutsRaw.map(payout => ({
            ...payout, providerName: payout.providerName || providerNames[payout.providerId] || 'Provider',
          }));
          
          payouts.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
          setPendingPayouts(payouts);
          setLoadingPayouts(false);
        });
      });
    } catch (error) {
      console.error('Error fetching pending payouts:', error);
      setLoadingPayouts(false);
    }
  };

  const setupEarningsListener = () => {
    return onSnapshot(collection(db, 'bookings'), async (snapshot) => {
      let totalSystemFee = 0, completedJobs = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;
        if (isCompleted || isPayFirstConfirmed) {
          completedJobs++;
          let amount = data.finalAmount;
          if (!amount) {
            const baseAmount = data.totalAmount || data.fixedPrice || data.price || 0;
            const approvedAdditionalCharges = (data.additionalCharges || [])
              .filter((c: { status: string }) => c.status === 'approved')
              .reduce((sum: number, c: { total?: number; amount?: number }) => sum + (c.total || c.amount || 0), 0);
            amount = baseAmount + approvedAdditionalCharges;
          }
          totalSystemFee += data.systemFee || (amount * SYSTEM_FEE_PERCENTAGE);
        }
      });

      const adminId = user?.uid;
      let totalWithdrawn = 0, pendingWithdrawal = 0;
      if (adminId) {
        const adminDoc = await getDoc(doc(db, 'users', adminId));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          totalWithdrawn = adminData.totalWithdrawn || 0;
          pendingWithdrawal = adminData.pendingWithdrawal || 0;
        }
      }
      setEarnings({
        totalSystemFee, availableBalance: Math.max(totalSystemFee - totalWithdrawn - pendingWithdrawal, 0),
        pendingWithdrawal, totalWithdrawn, completedJobs,
      });
      setLoadingData(false);
      setRefreshing(false);
    });
  };

  const handleSavePayoutAccount = async () => {
    if (!accountNumber || accountNumber.length < 10) {
      setConfirmModal({ show: true, type: 'error', title: 'Invalid Account', message: 'Please enter a valid 11-digit account number.' });
      return;
    }
    if (!accountName || accountName.length < 2) {
      setConfirmModal({ show: true, type: 'error', title: 'Invalid Name', message: 'Please enter the account holder name.' });
      return;
    }
    setSavingAccount(true);
    try {
      const adminId = user?.uid;
      if (!adminId) return;
      await updateDoc(doc(db, 'users', adminId), {
        adminPayoutAccount: { method: selectedMethod, accountNumber, accountName, updatedAt: new Date() },
      });
      setPayoutAccount({ method: selectedMethod, accountNumber, accountName });
      setShowSetupModal(false);
      setConfirmModal({ show: true, type: 'success', title: 'Account Saved!', message: 'Your withdrawal account has been saved successfully.' });
    } catch (error) {
      console.error('Error saving payout account:', error);
      setConfirmModal({ show: true, type: 'error', title: 'Save Failed', message: 'Failed to save payout account. Please try again.' });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRequestWithdrawal = () => {
    if (!payoutAccount) {
      setConfirmModal({
        show: true, type: 'setup', title: 'Setup Required',
        message: 'Please setup your GCash or Maya account first to withdraw earnings.',
        onConfirm: () => { setConfirmModal({ ...confirmModal, show: false }); setShowSetupModal(true); }
      });
      return;
    }
    if (earnings.availableBalance < MINIMUM_PAYOUT_AMOUNT) {
      setConfirmModal({
        show: true, type: 'error', title: 'Minimum Not Met',
        message: `Minimum withdrawal is ₱${MINIMUM_PAYOUT_AMOUNT}. Your available balance is ₱${earnings.availableBalance.toFixed(2)}.`
      });
      return;
    }
    const methodName = payoutAccount.method === 'gcash' ? 'GCash' : 'Maya';
    const maskedNumber = payoutAccount.accountNumber.slice(-4).padStart(payoutAccount.accountNumber.length, '*');
    setConfirmModal({
      show: true, type: 'withdraw', title: 'Confirm Withdrawal',
      message: `Withdraw ₱${earnings.availableBalance.toFixed(2)} to your ${methodName} account (${maskedNumber})?`,
      onConfirm: executeWithdrawal
    });
  };

  const executeWithdrawal = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    setProcessingWithdrawal(true);
    try {
      const adminId = user?.uid;
      if (!adminId || !payoutAccount) return;
      const withdrawalAmount = earnings.availableBalance;
      await addDoc(collection(db, 'adminWithdrawals'), {
        adminId, amount: withdrawalAmount, method: payoutAccount.method,
        accountNumber: payoutAccount.accountNumber, accountName: payoutAccount.accountName,
        status: 'processing', createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', adminId), {
        pendingWithdrawal: (earnings.pendingWithdrawal || 0) + withdrawalAmount,
      });
      setConfirmModal({
        show: true, type: 'success', title: 'Withdrawal Submitted!',
        message: `Your withdrawal of ₱${withdrawalAmount.toFixed(2)} has been submitted. You will receive it within 24 hours.`
      });
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      setConfirmModal({ show: true, type: 'error', title: 'Withdrawal Failed', message: 'Failed to process withdrawal. Please try again.' });
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const showApproveConfirm = (payout: PendingPayout) => {
    setConfirmModal({
      show: true, type: 'approve', title: 'Approve Payout',
      message: `Are you sure you want to approve the payout of ₱${payout.amount.toLocaleString()} to ${payout.providerName}?`,
      payout, onConfirm: () => executeApprovePayout(payout)
    });
  };

  const executeApprovePayout = async (payout: PendingPayout) => {
    setConfirmModal({ ...confirmModal, show: false });
    setProcessingApproval(payout.id);
    try {
      try {
        const payoutRequestDoc = await getDoc(doc(db, 'payoutRequests', payout.id));
        if (payoutRequestDoc.exists()) {
          await updateDoc(doc(db, 'payoutRequests', payout.id), { status: 'approved', approvedAt: serverTimestamp(), approvedBy: user?.uid });
        } else {
          await updateDoc(doc(db, 'payouts', payout.id), { status: 'approved', approvedAt: serverTimestamp(), approvedBy: user?.uid });
        }
      } catch {
        await updateDoc(doc(db, 'payouts', payout.id), { status: 'approved', approvedAt: serverTimestamp(), approvedBy: user?.uid });
      }
      setConfirmModal({
        show: true, type: 'success', title: 'Payout Approved!',
        message: `Successfully approved ₱${payout.amount.toLocaleString()} payout to ${payout.providerName}.`
      });
    } catch (error) {
      console.error('Error approving payout:', error);
      setConfirmModal({ show: true, type: 'error', title: 'Approval Failed', message: 'Failed to approve payout. Please try again.' });
    } finally {
      setProcessingApproval(null);
    }
  };

  const formatCurrency = (amount: number) => `₱${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;


  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading earnings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-amber-100 text-sm font-medium">Platform Commission</p>
                  <h1 className="text-3xl font-bold text-white">Admin Earnings</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setRefreshing(true)} disabled={refreshing}
                  className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/25 transition-all disabled:opacity-50 shadow-lg">
                  <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Calculator className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-semibold">5% Fee</span>
                </div>
              </div>
            </div>

            {/* Main Balance Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-amber-100" />
                    <span className="text-amber-100 text-sm font-medium">Available Balance</span>
                  </div>
                  <p className="text-5xl font-bold text-white tracking-tight">{formatCurrency(earnings.availableBalance)}</p>
                  {earnings.pendingWithdrawal > 0 && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-white/10 rounded-lg w-fit">
                      <Clock className="w-4 h-4 text-amber-200" />
                      <span className="text-amber-200 text-sm">Pending: {formatCurrency(earnings.pendingWithdrawal)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-amber-100 text-xs font-medium mb-1">Total Collected</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(earnings.totalSystemFee)}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-300" />
                    <p className="text-amber-100 text-xs font-medium">Total Collected</p>
                  </div>
                  <p className="text-xl font-bold text-white">{formatCurrency(earnings.totalSystemFee)}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="w-4 h-4 text-emerald-300" />
                    <p className="text-amber-100 text-xs font-medium">Withdrawn</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-300">{formatCurrency(earnings.totalWithdrawn)}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <p className="text-amber-100 text-xs font-medium">Completed Jobs</p>
                  </div>
                  <p className="text-xl font-bold text-white">{earnings.completedJobs}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{earnings.completedJobs}</p>
                  <p className="text-gray-500 text-sm font-medium">Completed Jobs</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">5%</p>
                  <p className="text-gray-500 text-sm font-medium">Service Fee Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal Account Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-violet-500" /> Withdrawal Account
            </h2>
            {payoutAccount ? (
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                    payoutAccount.method === 'gcash' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30'
                  }`}>
                    <span className="text-white font-bold text-xl">{payoutAccount.method === 'gcash' ? 'G' : 'M'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{payoutAccount.method === 'gcash' ? 'GCash' : 'Maya'}</p>
                    <p className="text-gray-500">{payoutAccount.accountNumber.slice(-4).padStart(payoutAccount.accountNumber.length, '*')}</p>
                    <p className="text-gray-400 text-sm">{payoutAccount.accountName}</p>
                  </div>
                  <button onClick={() => { setSelectedMethod(payoutAccount.method); setAccountNumber(payoutAccount.accountNumber); setAccountName(payoutAccount.accountName); setShowSetupModal(true); }} 
                    className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <Pencil className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowSetupModal(true)} 
                className="w-full bg-white rounded-2xl p-8 shadow-lg border-2 border-dashed border-gray-200 flex flex-col items-center hover:border-amber-400 hover:shadow-xl transition-all group">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <p className="font-bold text-gray-900 text-lg">Setup Withdrawal Account</p>
                <p className="text-gray-500 mt-1">Add your GCash or Maya to withdraw earnings</p>
              </button>
            )}
          </div>

          {/* Withdraw Button */}
          <button onClick={handleRequestWithdrawal} disabled={earnings.availableBalance < MINIMUM_PAYOUT_AMOUNT || processingWithdrawal}
            className={`w-full rounded-2xl py-5 flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-xl mb-2 ${
              earnings.availableBalance >= MINIMUM_PAYOUT_AMOUNT 
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white hover:shadow-2xl hover:scale-[1.01] shadow-amber-500/30' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {processingWithdrawal ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
            ) : (
              <><DollarSign className="w-6 h-6" /> Withdraw Earnings</>
            )}
          </button>
          {earnings.availableBalance < MINIMUM_PAYOUT_AMOUNT && (
            <p className="text-gray-400 text-sm text-center mb-6">Minimum withdrawal amount is ₱{MINIMUM_PAYOUT_AMOUNT}</p>
          )}

          {/* Provider Payout Requests */}
          <div className="mt-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-500" /> Provider Payout Requests
                {pendingPayouts.length > 0 && (
                  <span className="ml-2 px-2.5 py-1 bg-amber-100 text-amber-600 rounded-full text-sm font-bold">{pendingPayouts.length}</span>
                )}
              </h2>
              <button onClick={() => fetchPendingPayouts()} 
                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingPayouts ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {loadingPayouts ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
              </div>
            ) : pendingPayouts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className="font-bold text-gray-900 text-lg">All Caught Up!</p>
                <p className="text-gray-500 mt-1">No pending payout requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map((payout) => (
                  <div key={payout.id} className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                          payout.accountMethod?.toLowerCase() === 'gcash' 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' 
                            : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30'
                        }`}>
                          <span className="text-white font-bold">{payout.accountMethod?.toLowerCase() === 'gcash' ? 'G' : 'M'}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{payout.providerName}</p>
                          <p className="text-gray-500 text-sm">{payout.accountMethod?.toUpperCase()} • {payout.accountNumber}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{payout.requestedAt?.toLocaleDateString?.() || 'Recently'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-500">{formatCurrency(payout.amount)}</p>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-600 rounded-lg text-xs font-semibold">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      </div>
                    </div>
                    <button onClick={() => showApproveConfirm(payout)} disabled={processingApproval === payout.id}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl py-3.5 font-semibold transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-70">
                      {processingApproval === payout.id ? (
                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                      ) : (
                        <><CheckCircle className="w-5 h-5" /> Approve Payout</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How System Fees Work */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" /> How System Fees Work
            </h2>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {[
                { icon: Briefcase, text: 'Provider completes a job', color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
                { icon: Scissors, text: '5% service fee is collected', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' },
                { icon: Wallet, text: 'Fee added to your balance', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' },
                { icon: Zap, text: 'Withdraw anytime (min ₱100)', color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30' },
              ].map((item, index) => (
                <div key={index} className={`flex items-center gap-4 p-4 ${index < 3 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">{index + 1}</div>
                    <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-lg ${item.shadow}`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700 font-medium">{item.text}</p>
                  {index < 3 && <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header with Icon */}
            <div className={`p-6 text-center ${
              confirmModal.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              confirmModal.type === 'error' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
              confirmModal.type === 'approve' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              confirmModal.type === 'withdraw' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
              'bg-gradient-to-br from-violet-500 to-purple-600'
            }`}>
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                {confirmModal.type === 'success' && <CheckCircle className="w-10 h-10 text-white" />}
                {confirmModal.type === 'error' && <XCircle className="w-10 h-10 text-white" />}
                {confirmModal.type === 'approve' && <Send className="w-10 h-10 text-white" />}
                {confirmModal.type === 'withdraw' && <DollarSign className="w-10 h-10 text-white" />}
                {confirmModal.type === 'setup' && <AlertTriangle className="w-10 h-10 text-white" />}
              </div>
              <h3 className="text-2xl font-bold text-white">{confirmModal.title}</h3>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-600 text-center text-lg leading-relaxed">{confirmModal.message}</p>
              
              {/* Payout Details for Approve */}
              {confirmModal.type === 'approve' && confirmModal.payout && (
                <div className="mt-4 bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      confirmModal.payout.accountMethod?.toLowerCase() === 'gcash' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-br from-green-500 to-emerald-600'
                    }`}>
                      <span className="text-white font-bold text-sm">{confirmModal.payout.accountMethod?.toLowerCase() === 'gcash' ? 'G' : 'M'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{confirmModal.payout.providerName}</p>
                      <p className="text-gray-500 text-sm">{confirmModal.payout.accountMethod?.toUpperCase()} • {confirmModal.payout.accountNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-gray-500">Amount</span>
                    <span className="text-2xl font-bold text-amber-500">{formatCurrency(confirmModal.payout.amount)}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Actions */}
            <div className="p-6 pt-0">
              {(confirmModal.type === 'success' || confirmModal.type === 'error') ? (
                <button onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                    confirmModal.type === 'success' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl' 
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl'
                  }`}>
                  Got it
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                    className="py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                    Cancel
                  </button>
                  <button onClick={confirmModal.onConfirm}
                    className={`py-4 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl ${
                      confirmModal.type === 'approve' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30' :
                      confirmModal.type === 'withdraw' ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/30' :
                      'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/30'
                    }`}>
                    {confirmModal.type === 'approve' ? 'Approve' : confirmModal.type === 'withdraw' ? 'Withdraw' : 'Setup Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Setup Withdrawal</h3>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <p className="text-sm font-semibold text-gray-600 mb-3">Select Payment Method</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setSelectedMethod('gcash')} 
                className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all ${
                  selectedMethod === 'gcash' ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${
                  selectedMethod === 'gcash' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' : 'bg-blue-500'
                }`}>
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <span className="font-bold text-gray-900">GCash</span>
              </button>
              <button onClick={() => setSelectedMethod('maya')} 
                className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all ${
                  selectedMethod === 'maya' ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${
                  selectedMethod === 'maya' ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30' : 'bg-green-500'
                }`}>
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <span className="font-bold text-gray-900">Maya</span>
              </button>
            </div>
            
            <p className="text-sm font-semibold text-gray-600 mb-2">{selectedMethod === 'gcash' ? 'GCash' : 'Maya'} Number</p>
            <input type="tel" placeholder="09XX XXX XXXX" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={11} 
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none mb-4 font-medium" />
            
            <p className="text-sm font-semibold text-gray-600 mb-2">Account Holder Name</p>
            <input type="text" placeholder="Juan Dela Cruz" value={accountName} onChange={(e) => setAccountName(e.target.value)} 
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none mb-6 font-medium" />
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowSetupModal(false)} className="py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSavePayoutAccount} disabled={savingAccount} 
                className="py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2">
                {savingAccount ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
