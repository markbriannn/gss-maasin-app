"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/components/layouts/AdminLayout";
import Link from "next/link";
import { pushNotifications } from "@/lib/pushNotifications";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Calendar, DollarSign, User, Wrench,
  MessageCircle, CreditCard, FileText, Image, Zap, Ban,
} from "lucide-react";

interface JobData {
  id: string;
  title: string;
  category: string;
  status: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerTier?: string;
  providerPoints?: number;
  amount: number;
  providerPrice: number;
  systemFee: number;
  finalAmount?: number;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  description?: string;
  mediaUrls?: (string | { url: string; type?: string; isVideo?: boolean })[];
  adminApproved: boolean;
  paymentPreference: string;
  paid?: boolean;
  isPaidUpfront: boolean;
  upfrontPaidAmount?: number;
  isNegotiable: boolean;
  offeredPrice?: number;
  counterOfferPrice?: number;
  additionalCharges?: Array<{ id: string; description: string; amount: number; status: string }>;
  discount?: number;
  discountReason?: string;
  createdAt?: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}


const getCategoryStyle = (category: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("electric")) return { bg: "from-amber-500 to-yellow-600", icon: "⚡" };
  if (cat.includes("plumb")) return { bg: "from-blue-500 to-cyan-600", icon: "🔧" };
  if (cat.includes("carpent")) return { bg: "from-orange-500 to-amber-600", icon: "🪚" };
  if (cat.includes("clean")) return { bg: "from-emerald-500 to-teal-600", icon: "🧹" };
  if (cat.includes("paint")) return { bg: "from-pink-500 to-rose-600", icon: "🎨" };
  if (cat.includes("aircon") || cat.includes("hvac")) return { bg: "from-sky-500 to-blue-600", icon: "❄️" };
  return { bg: "from-violet-500 to-purple-600", icon: "🛠️" };
};

const getStatusStyle = (status: string, adminApproved: boolean) => {
  switch (status) {
    case "pending": return adminApproved ? { bg: "bg-gradient-to-r from-emerald-500 to-teal-500", label: "Awaiting Provider" } : { bg: "bg-gradient-to-r from-amber-500 to-yellow-500", label: "Pending Approval" };
    case "pending_negotiation": return { bg: "bg-gradient-to-r from-yellow-500 to-amber-500", label: "Negotiating" };
    case "counter_offer": return { bg: "bg-gradient-to-r from-purple-500 to-violet-500", label: "Counter Offer" };
    case "accepted": case "traveling": return { bg: "bg-gradient-to-r from-blue-500 to-indigo-500", label: status === "traveling" ? "Provider Traveling" : "Accepted" };
    case "arrived": return { bg: "bg-gradient-to-r from-indigo-500 to-purple-500", label: "Provider Arrived" };
    case "in_progress": return { bg: "bg-gradient-to-r from-blue-500 to-indigo-500", label: "In Progress" };
    case "pending_completion": return { bg: "bg-gradient-to-r from-amber-500 to-orange-500", label: "Awaiting Confirmation" };
    case "pending_payment": return { bg: "bg-gradient-to-r from-orange-500 to-amber-500", label: "Awaiting Payment" };
    case "payment_received": return { bg: "bg-gradient-to-r from-emerald-500 to-green-500", label: "Payment Received" };
    case "completed": return { bg: "bg-gradient-to-r from-emerald-500 to-green-500", label: "Completed" };
    case "cancelled": case "rejected": return { bg: "bg-gradient-to-r from-gray-500 to-slate-500", label: status === "cancelled" ? "Cancelled" : "Rejected" };
    default: return { bg: "bg-gray-100", label: status?.replace(/_/g, " ") };
  }
};

// Helper to get tier display info
const getTierDisplay = (tier?: string, points?: number) => {
  // First check tier name
  if (tier) {
    switch (tier.toLowerCase()) {
      case 'diamond': return { name: 'Diamond', color: 'bg-cyan-500' };
      case 'platinum': return { name: 'Platinum', color: 'bg-gray-400' };
      case 'gold': return { name: 'Gold', color: 'bg-yellow-500' };
      case 'silver': return { name: 'Silver', color: 'bg-gray-300' };
      case 'bronze': return { name: 'Bronze', color: 'bg-amber-600' };
    }
  }
  // Fall back to points
  if (points && points > 0) {
    if (points >= 5000) return { name: 'Diamond', color: 'bg-cyan-500' };
    if (points >= 2500) return { name: 'Platinum', color: 'bg-gray-400' };
    if (points >= 1000) return { name: 'Gold', color: 'bg-yellow-500' };
    if (points >= 500) return { name: 'Silver', color: 'bg-gray-300' };
    return { name: 'Bronze', color: 'bg-amber-600' };
  }
  return null;
};

export default function AdminJobDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toUpperCase() !== "ADMIN")) router.push("/login");
  }, [authLoading, user, router]);


  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(doc(db, "bookings", jobId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        let clientInfo = { name: data.clientName || "Unknown", phone: "", email: "" };
        if (data.clientId) {
          try {
            const clientDoc = await getDoc(doc(db, "users", data.clientId));
            if (clientDoc.exists()) {
              const cData = clientDoc.data();
              clientInfo = { name: `${cData.firstName || ""} ${cData.lastName || ""}`.trim() || "Unknown", phone: cData.phone || cData.phoneNumber || "", email: cData.email || "" };
            }
          } catch (e) {}
        }

        let providerInfo = { name: data.providerName || "Not Assigned", phone: "", email: "", tier: "", points: 0 };
        if (data.providerId) {
          try {
            const providerDoc = await getDoc(doc(db, "users", data.providerId));
            if (providerDoc.exists()) {
              const pData = providerDoc.data();
              providerInfo = { 
                name: `${pData.firstName || ""} ${pData.lastName || ""}`.trim() || "Unknown", 
                phone: pData.phone || pData.phoneNumber || "", 
                email: pData.email || "",
                tier: pData.tier || "",
                points: pData.points || 0,
              };
            }
          } catch (e) {}
        }

        setJob({
          id: docSnap.id,
          title: data.title || data.serviceTitle || "Service Request",
          category: data.category || data.serviceCategory || "General",
          status: data.status || "pending",
          clientId: data.clientId,
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          clientEmail: clientInfo.email,
          providerId: data.providerId,
          providerName: providerInfo.name,
          providerPhone: providerInfo.phone,
          providerEmail: providerInfo.email,
          providerTier: providerInfo.tier,
          providerPoints: providerInfo.points,
          amount: data.totalAmount || data.amount || data.providerPrice || data.providerFixedPrice || data.price || 0,
          providerPrice: data.providerPrice || data.providerFixedPrice || data.offeredPrice || data.price || 0,
          systemFee: data.systemFee || 0,
          finalAmount: data.finalAmount,
          scheduledDate: data.scheduledDate || "TBD",
          scheduledTime: data.scheduledTime || "TBD",
          address: data.address || data.location || "Not specified",
          description: data.description,
          mediaUrls: data.mediaFiles || data.mediaUrls || [],
          adminApproved: data.adminApproved || false,
          paymentPreference: data.paymentPreference || "pay_later",
          isPaidUpfront: data.isPaidUpfront || false,
          upfrontPaidAmount: data.upfrontPaidAmount,
          isNegotiable: data.isNegotiable || false,
          offeredPrice: data.offeredPrice,
          counterOfferPrice: data.counterOfferPrice,
          additionalCharges: data.additionalCharges || [],
          discount: data.discount,
          discountReason: data.discountReason,
          createdAt: data.createdAt?.toDate(),
          acceptedAt: data.acceptedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          cancelledAt: data.cancelledAt?.toDate(),
          cancellationReason: data.cancellationReason,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);


  const handleApprove = async () => {
    if (!job || !confirm("Approve this job request?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookings", job.id), { adminApproved: true, approvedAt: serverTimestamp(), approvedBy: user?.uid, updatedAt: serverTimestamp() });
      
      // Send FCM push notification to client
      if (job.clientId) {
        pushNotifications.jobApprovedToClient(job.clientId, job.id, job.category || 'service')
          .catch(err => console.log('FCM push to client failed:', err));
      }
      
      // Send FCM push notification to provider
      if (job.providerId) {
        pushNotifications.newJobToProvider(job.providerId, job.id, job.category || 'service')
          .catch(err => console.log('FCM push to provider failed:', err));
      }
      
      alert("Job approved successfully!");
    } catch (error) {
      console.error("Error approving job:", error);
      alert("Failed to approve job");
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!job || !confirm("Reject this job request?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookings", job.id), { status: "rejected", adminRejected: true, rejectedAt: serverTimestamp(), rejectedBy: user?.uid, updatedAt: serverTimestamp() });
      
      // Send FCM push notification to client
      if (job.clientId) {
        pushNotifications.jobRejectedToClient(job.clientId, job.id, job.category || 'service')
          .catch(err => console.log('FCM push to client failed:', err));
      }
      
      // Process automatic refund if payment was made
      if (job.paid || job.isPaidUpfront) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
          const refundResponse = await fetch(`${apiUrl}/payments/auto-refund/${job.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Admin rejected job', cancelledBy: 'admin' }),
          });
          const refundResult = await refundResponse.json();
          if (refundResult.refunded) {
            alert(`Job rejected. Refund of ₱${refundResult.amount} processed.`);
          } else {
            alert("Job rejected");
          }
        } catch (refundError) {
          console.error("Refund error:", refundError);
          alert("Job rejected. Refund may need manual processing.");
        }
      } else {
        alert("Job rejected");
      }
    } catch (error) {
      console.error("Error rejecting job:", error);
      alert("Failed to reject job");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!job || !confirm("Cancel this job?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookings", job.id), { status: "cancelled", cancelledAt: serverTimestamp(), cancelledBy: "admin", updatedAt: serverTimestamp() });
      
      // Send FCM push notification to client
      if (job.clientId) {
        pushNotifications.jobCancelledToUser(job.clientId, job.id, 'admin')
          .catch(err => console.log('FCM push to client failed:', err));
      }
      
      // Send FCM push notification to provider
      if (job.providerId) {
        pushNotifications.jobCancelledToUser(job.providerId, job.id, 'admin')
          .catch(err => console.log('FCM push to provider failed:', err));
      }
      
      // Process automatic refund if payment was made
      if (job.paid || job.isPaidUpfront) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
          const refundResponse = await fetch(`${apiUrl}/payments/auto-refund/${job.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Admin cancelled job', cancelledBy: 'admin' }),
          });
          const refundResult = await refundResponse.json();
          if (refundResult.refunded) {
            alert(`Job cancelled. Refund of ₱${refundResult.amount} processed.`);
          } else {
            alert("Job cancelled");
          }
        } catch (refundError) {
          console.error("Refund error:", refundError);
          alert("Job cancelled. Refund may need manual processing.");
        }
      } else {
        alert("Job cancelled");
      }
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert("Failed to cancel job");
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = () => {
    if (!job) return 0;
    const base = job.providerPrice || job.amount || 0;
    const approved = (job.additionalCharges || []).filter((c) => c.status === "approved").reduce((sum, c) => sum + c.amount, 0);
    const discount = job.discount || 0;
    return base + approved - discount;
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading job details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Job not found</h2>
            <Link href="/admin/jobs" className="text-violet-600 font-medium hover:underline">← Back to Jobs</Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const catStyle = getCategoryStyle(job.category);
  const statusStyle = getStatusStyle(job.status, job.adminApproved);


  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Premium Header */}
        <div className={`bg-gradient-to-r ${catStyle.bg} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-5xl mx-auto px-6 py-8">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Jobs</span>
            </button>

            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl text-4xl">
                  {catStyle.icon}
                </div>
                <div>
                  <p className="text-white/70 text-sm font-mono mb-1">{job.id}</p>
                  <h1 className="text-3xl font-bold text-white mb-1">{job.title}</h1>
                  <p className="text-white/90 font-medium text-lg">{job.category}</p>
                </div>
              </div>
              <span className={`${statusStyle.bg} text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg`}>
                {statusStyle.label}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Amount Card */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 -mt-8 relative z-10 mb-6 shadow-xl shadow-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Total Amount</p>
                <p className="text-5xl font-bold text-white">₱{(job.finalAmount || calculateTotal()).toLocaleString()}</p>
                {(job.finalAmount || calculateTotal()) === 0 && (
                  <p className="text-amber-200 text-sm mt-2 bg-amber-500/20 px-3 py-1 rounded-lg inline-block">
                    ⚠️ Price not set - booking may need to be updated
                  </p>
                )}
                {job.systemFee > 0 && (
                  <p className="text-emerald-100 text-sm mt-2">
                    Provider: ₱{job.providerPrice.toLocaleString()} + Fee: ₱{job.systemFee.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${job.paymentPreference === "pay_first" ? "bg-white/20" : "bg-white/20"}`}>
                  <CreditCard className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">{job.paymentPreference === "pay_first" ? "PAID" : "Pay Later"}</span>
                </div>
                {job.isPaidUpfront && (
                  <div className="mt-2 bg-white text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm">
                    ✓ PAID ₱{job.upfrontPaidAmount?.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="col-span-2 space-y-4">
              {/* Client & Provider */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Client</h3>
                  </div>
                  <p className="font-semibold text-gray-900 text-lg">{job.clientName}</p>
                  {job.clientPhone && <p className="text-gray-500">{job.clientPhone}</p>}
                  {job.clientEmail && <p className="text-gray-500 text-sm">{job.clientEmail}</p>}
                  <Link href={`/chat/new?recipientId=${job.clientId}`}
                    className="mt-4 flex items-center gap-2 text-violet-600 font-medium hover:underline">
                    <MessageCircle className="w-4 h-4" /> Message Client
                  </Link>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Provider</h3>
                  </div>
                  <p className="font-semibold text-gray-900 text-lg">{job.providerName}</p>
                  {job.providerPhone && <p className="text-gray-500">{job.providerPhone}</p>}
                  {job.providerEmail && <p className="text-gray-500 text-sm">{job.providerEmail}</p>}
                  {/* Provider Tier Badge */}
                  {(() => {
                    const tierDisplay = getTierDisplay(job.providerTier, job.providerPoints);
                    if (!tierDisplay) return null;
                    return (
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${tierDisplay.color} text-white`}>
                          {tierDisplay.name}
                        </span>
                      </div>
                    );
                  })()}
                  {job.providerId && (
                    <Link href={`/chat/new?recipientId=${job.providerId}`}
                      className="mt-4 flex items-center gap-2 text-violet-600 font-medium hover:underline">
                      <MessageCircle className="w-4 h-4" /> Message Provider
                    </Link>
                  )}
                </div>
              </div>

              {/* Schedule & Location */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-500" /> Schedule & Location
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-violet-600 text-xs font-medium mb-1">Date</p>
                    <p className="font-bold text-gray-900">{job.scheduledDate}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-blue-600 text-xs font-medium mb-1">Time</p>
                    <p className="font-bold text-gray-900">{job.scheduledTime}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 col-span-1">
                    <p className="text-emerald-600 text-xs font-medium mb-1">Location</p>
                    <p className="font-bold text-gray-900 text-sm">{job.address}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {job.description && (
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-500" /> Description
                  </h3>
                  <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{job.description}</p>
                </div>
              )}

              {/* Media */}
              {job.mediaUrls && job.mediaUrls.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5 text-violet-500" /> Attached Photos ({job.mediaUrls.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {job.mediaUrls.map((media, idx) => {
                      const imageUrl = typeof media === "string" ? media : (media as { url?: string })?.url;
                      const isVideo = typeof media === "object" && (media as { isVideo?: boolean })?.isVideo;
                      if (!imageUrl) return null;
                      return (
                        <a key={idx} href={imageUrl} target="_blank" rel="noopener noreferrer"
                          className="relative block aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity border-2 border-gray-200 hover:border-violet-500">
                          {isVideo ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-white text-3xl">▶</span>
                            </div>
                          ) : (
                            <img src={imageUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">No Image</text></svg>'; }} />
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-violet-500" /> Pricing Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-bold text-gray-900">₱{job.providerPrice.toLocaleString()}</span>
                  </div>
                  {(job.additionalCharges || []).map((charge) => (
                    <div key={charge.id} className={`flex justify-between items-center rounded-xl p-3 ${charge.status === "rejected" ? "bg-red-50" : charge.status === "approved" ? "bg-emerald-50" : "bg-amber-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className={charge.status === "rejected" ? "text-red-400 line-through" : "text-gray-600"}>{charge.description}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${charge.status === "approved" ? "bg-emerald-100 text-emerald-600" : charge.status === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                          {charge.status}
                        </span>
                      </div>
                      <span className={`font-bold ${charge.status === "rejected" ? "text-red-400 line-through" : "text-gray-900"}`}>+₱{charge.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {job.discount && job.discount > 0 && (
                    <div className="flex justify-between items-center bg-green-50 rounded-xl p-3">
                      <span className="text-green-600">Discount {job.discountReason && `(${job.discountReason})`}</span>
                      <span className="font-bold text-green-600">-₱{job.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-200 pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">Total</span>
                    <span className="font-bold text-emerald-600 text-2xl">₱{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Negotiation Info */}
              {job.isNegotiable && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-100">
                  <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Price Negotiation
                  </h3>
                  <div className="space-y-3">
                    {job.offeredPrice && (
                      <div className="bg-white rounded-xl p-3">
                        <p className="text-amber-600 text-xs font-medium">Client Offered</p>
                        <p className="font-bold text-amber-800 text-lg">₱{job.offeredPrice.toLocaleString()}</p>
                      </div>
                    )}
                    {job.counterOfferPrice && (
                      <div className="bg-white rounded-xl p-3">
                        <p className="text-purple-600 text-xs font-medium">Provider Counter</p>
                        <p className="font-bold text-purple-700 text-lg">₱{job.counterOfferPrice.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-500" /> Timeline
                </h3>
                <div className="space-y-3">
                  {job.createdAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="font-medium text-gray-900 text-sm">{job.createdAt.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {job.acceptedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-xs text-gray-500">Accepted</p>
                        <p className="font-medium text-gray-900 text-sm">{job.acceptedAt.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {job.completedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div>
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="font-medium text-gray-900 text-sm">{job.completedAt.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {job.cancelledAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="text-xs text-gray-500">Cancelled</p>
                        <p className="font-medium text-gray-900 text-sm">{job.cancelledAt.toLocaleString()}</p>
                        {job.cancellationReason && <p className="text-red-500 text-xs">{job.cancellationReason}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-violet-500" /> Admin Actions
                </h3>
                <div className="space-y-3">
                  {job.status === "pending" && !job.adminApproved && (
                    <>
                      <button onClick={handleApprove} disabled={updating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50">
                        <CheckCircle className="w-5 h-5" /> Approve Job
                      </button>
                      <button onClick={handleReject} disabled={updating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50">
                        <XCircle className="w-5 h-5" /> Reject Job
                      </button>
                    </>
                  )}
                  {!["completed", "cancelled", "rejected"].includes(job.status) && (
                    <button onClick={handleCancel} disabled={updating}
                      className="w-full flex items-center justify-center gap-2 border-2 border-red-300 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50">
                      <Ban className="w-5 h-5" /> Cancel Job
                    </button>
                  )}
                  {["completed", "cancelled", "rejected"].includes(job.status) && (
                    <p className="text-center text-gray-400 py-4">No actions available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
