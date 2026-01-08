"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/components/layouts/AdminLayout";
import Link from "next/link";
import {
  ArrowLeft, Star, CheckCircle, XCircle, MapPin, Mail, Phone, Calendar, Briefcase,
  Award, MessageCircle, Shield, Clock, DollarSign, FileText, ChevronRight, PlayCircle,
  PauseCircle, Trophy, Zap, Eye,
} from "lucide-react";

interface ProviderData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceCategory: string;
  status: string;
  providerStatus: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  profilePhoto?: string;
  barangay?: string;
  streetAddress?: string;
  bio?: string;
  experience?: string;
  fixedPrice?: number;
  hourlyRate?: number;
  priceType?: string;
  tier?: string;
  points?: number;
  isOnline?: boolean;
  createdAt?: Date;
  approvedAt?: Date;
  documents?: {
    governmentId?: string;
    governmentIdUrl?: string;
    idType?: string;
    selfie?: string;
    selfieUrl?: string;
    barangayClearance?: string;
    barangayClearanceUrl?: string;
    policeClearance?: string;
    policeClearanceUrl?: string;
    certificates?: string[];
    certificateUrls?: string[];
  };
}


interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface Job {
  id: string;
  title: string;
  status: string;
  amount: number;
  scheduledDate: string;
  clientName: string;
}

const TIERS: Record<string, { name: string; color: string; bg: string }> = {
  bronze: { name: "Bronze", color: "#CD7F32", bg: "from-amber-600 to-orange-700" },
  silver: { name: "Silver", color: "#9CA3AF", bg: "from-gray-400 to-slate-500" },
  gold: { name: "Gold", color: "#F59E0B", bg: "from-amber-400 to-yellow-500" },
  platinum: { name: "Platinum", color: "#6366F1", bg: "from-indigo-400 to-purple-500" },
  diamond: { name: "Diamond", color: "#06B6D4", bg: "from-cyan-400 to-blue-500" },
};

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

export default function AdminProviderDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const providerId = params.id as string;

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "jobs" | "reviews">("info");

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toUpperCase() !== "ADMIN")) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (providerId) {
      fetchProvider();
      fetchReviews();
      fetchJobs();
    }
  }, [providerId]);


  const fetchProvider = async () => {
    try {
      const providerDoc = await getDoc(doc(db, "users", providerId));
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        setProvider({
          id: providerDoc.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || data.phoneNumber || "",
          serviceCategory: data.serviceCategory || "",
          status: data.status || "pending",
          providerStatus: data.providerStatus || data.status || "pending",
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          completedJobs: data.completedJobs || 0,
          profilePhoto: data.profilePhoto,
          barangay: data.barangay,
          streetAddress: data.streetAddress,
          bio: data.bio,
          experience: data.experience,
          fixedPrice: data.fixedPrice,
          hourlyRate: data.hourlyRate,
          priceType: data.priceType,
          tier: data.tier || "bronze",
          points: data.points || 0,
          isOnline: data.isOnline,
          createdAt: data.createdAt?.toDate(),
          approvedAt: data.approvedAt?.toDate(),
          documents: {
            governmentId: data.documents?.governmentId || data.governmentId,
            governmentIdUrl: data.documents?.governmentIdUrl || data.governmentIdUrl || data.validIdUrl || data.documents?.validId,
            idType: data.documents?.idType || data.idType,
            selfie: data.documents?.selfie || data.selfie,
            selfieUrl: data.documents?.selfieUrl || data.selfieUrl || data.documents?.selfie,
            barangayClearance: data.documents?.barangayClearance || data.barangayClearance,
            barangayClearanceUrl: data.documents?.barangayClearanceUrl || data.barangayClearanceUrl || data.documents?.barangayClearance,
            policeClearance: data.documents?.policeClearance || data.policeClearance,
            policeClearanceUrl: data.documents?.policeClearanceUrl || data.policeClearanceUrl || data.documents?.policeClearance,
            certificates: data.documents?.certificates || data.certificates || [],
            certificateUrls: data.documents?.certificateUrls || data.certificateUrls || data.certificationUrls || [],
          },
        });
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const reviewsQuery = query(collection(db, "reviews"), where("providerId", "==", providerId), orderBy("createdAt", "desc"), limit(10));
      const snapshot = await getDocs(reviewsQuery);
      const reviewsList: Review[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reviewsList.push({ id: doc.id, clientName: data.clientName || "Client", rating: data.rating || 0, comment: data.comment || data.review || "", createdAt: data.createdAt?.toDate() || new Date() });
      });
      setReviews(reviewsList);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      const jobsQuery = query(collection(db, "bookings"), where("providerId", "==", providerId), orderBy("createdAt", "desc"), limit(20));
      const snapshot = await getDocs(jobsQuery);
      const jobsList: Job[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        jobsList.push({ id: doc.id, title: data.title || data.serviceCategory || "Service", status: data.status || "pending", amount: data.totalAmount || data.amount || 0, scheduledDate: data.scheduledDate || "TBD", clientName: data.clientName || "Client" });
      });
      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };


  const handleApprove = async () => {
    if (!provider || !confirm("Approve this provider?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", provider.id), { 
        status: "approved", 
        providerStatus: "approved", 
        isOnline: true,
        approvedAt: new Date(), 
        approvedBy: user?.uid 
      });
      setProvider((prev) => (prev ? { ...prev, status: "approved", providerStatus: "approved", isOnline: true } : null));
      alert("Provider approved successfully!");
    } catch (error) {
      console.error("Error approving provider:", error);
      alert("Failed to approve provider");
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!provider || !confirm("Reject this provider?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", provider.id), { status: "rejected", providerStatus: "rejected", rejectedAt: new Date(), rejectedBy: user?.uid });
      setProvider((prev) => (prev ? { ...prev, status: "rejected", providerStatus: "rejected" } : null));
      alert("Provider rejected");
    } catch (error) {
      console.error("Error rejecting provider:", error);
      alert("Failed to reject provider");
    } finally {
      setUpdating(false);
    }
  };

  const handleSuspend = async () => {
    if (!provider || !confirm("Suspend this provider?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", provider.id), { status: "suspended", providerStatus: "suspended", suspendedAt: new Date(), suspendedBy: user?.uid });
      setProvider((prev) => (prev ? { ...prev, status: "suspended", providerStatus: "suspended" } : null));
      alert("Provider suspended");
    } catch (error) {
      console.error("Error suspending provider:", error);
      alert("Failed to suspend provider");
    } finally {
      setUpdating(false);
    }
  };

  const handleReactivate = async () => {
    if (!provider || !confirm("Reactivate this provider?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", provider.id), { 
        status: "approved", 
        providerStatus: "approved", 
        isOnline: true,
        reactivatedAt: new Date(),
        suspensionReason: null,
        suspendedAt: null
      });
      setProvider((prev) => (prev ? { ...prev, status: "approved", providerStatus: "approved", isOnline: true } : null));
      alert("Provider reactivated");
    } catch (error) {
      console.error("Error reactivating provider:", error);
      alert("Failed to reactivate provider");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "approved": return { bg: "bg-gradient-to-r from-emerald-500 to-teal-500", text: "text-white" };
      case "pending": return { bg: "bg-gradient-to-r from-amber-500 to-yellow-500", text: "text-white" };
      case "suspended": return { bg: "bg-gradient-to-r from-red-500 to-rose-500", text: "text-white" };
      case "rejected": return { bg: "bg-gradient-to-r from-gray-500 to-slate-500", text: "text-white" };
      default: return { bg: "bg-gray-100", text: "text-gray-700" };
    }
  };

  const getJobStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "pending": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };


  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading provider...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!provider) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Provider not found</h2>
            <Link href="/admin/providers" className="text-violet-600 font-medium hover:underline">← Back to Providers</Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const catStyle = getCategoryStyle(provider.serviceCategory);
  const statusStyle = getStatusStyle(provider.providerStatus);
  const tierData = TIERS[provider.tier || "bronze"];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Premium Header */}
        <div className={`bg-gradient-to-r ${catStyle.bg} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-5xl mx-auto px-6 py-8">
            {/* Back Button */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Providers</span>
            </button>

            {/* Profile Section */}
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden">
                  {provider.profilePhoto ? (
                    <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-gray-400">
                      {provider.firstName?.[0]}{provider.lastName?.[0]}
                    </span>
                  )}
                </div>
                {provider.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg"></div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{provider.firstName} {provider.lastName}</h1>
                  <span className={`${statusStyle.bg} ${statusStyle.text} px-3 py-1 rounded-full text-sm font-bold`}>
                    {provider.providerStatus.charAt(0).toUpperCase() + provider.providerStatus.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{catStyle.icon}</span>
                  <span className="text-white/90 text-lg font-medium">{provider.serviceCategory}</span>
                  {tierData && (
                    <span className={`bg-gradient-to-r ${tierData.bg} px-3 py-1 rounded-full text-white text-sm font-bold shadow-lg`}>
                      {tierData.name}
                    </span>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
                    <span className="text-white font-bold">{provider.rating.toFixed(1)}</span>
                    <span className="text-white/70 text-sm">({provider.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                    <span className="text-white font-bold">{provider.completedJobs}</span>
                    <span className="text-white/70 text-sm">jobs</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <Trophy className="w-5 h-5 text-amber-300" />
                    <span className="text-white font-bold">{provider.points}</span>
                    <span className="text-white/70 text-sm">points</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Contact Info Cards */}
          <div className="grid grid-cols-4 gap-4 -mt-8 relative z-10 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="font-semibold text-gray-900 truncate">{provider.email}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                  <p className="font-semibold text-gray-900">{provider.phone}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Location</p>
                  <p className="font-semibold text-gray-900">{provider.barangay ? `Brgy. ${provider.barangay}` : "Maasin City"}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Member Since</p>
                  <p className="font-semibold text-gray-900">{provider.createdAt?.toLocaleDateString() || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-6 inline-flex gap-2">
            {[
              { id: "info", label: "Info", icon: FileText },
              { id: "jobs", label: "Jobs", icon: Briefcase },
              { id: "reviews", label: "Reviews", icon: Star },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "info" && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                {/* About */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-500" /> About
                  </h3>
                  <p className="text-gray-600">{provider.bio || "No bio provided"}</p>
                </div>

                {/* Experience */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-violet-500" /> Experience
                  </h3>
                  <p className="text-gray-600">{provider.experience || "Not specified"}</p>
                </div>

                {/* Documents */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-violet-500" /> Verification Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {provider.documents?.governmentIdUrl && (
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-400">
                        <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">🪪 Government ID</p>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <a href={provider.documents.governmentIdUrl} target="_blank" rel="noopener noreferrer">
                          <img src={provider.documents.governmentIdUrl} alt="Government ID" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {provider.documents?.selfieUrl && (
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-400">
                        <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">🤳 Selfie with ID</p>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <a href={provider.documents.selfieUrl} target="_blank" rel="noopener noreferrer">
                          <img src={provider.documents.selfieUrl} alt="Selfie" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {provider.documents?.barangayClearanceUrl && (
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-400">
                        <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">📜 Brgy Clearance</p>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <a href={provider.documents.barangayClearanceUrl} target="_blank" rel="noopener noreferrer">
                          <img src={provider.documents.barangayClearanceUrl} alt="Barangay Clearance" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {provider.documents?.policeClearanceUrl && (
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-400">
                        <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">👮 Police Clearance</p>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <a href={provider.documents.policeClearanceUrl} target="_blank" rel="noopener noreferrer">
                          <img src={provider.documents.policeClearanceUrl} alt="Police Clearance" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {provider.documents?.certificateUrls?.map((certUrl, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border-2 border-emerald-400">
                        <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">🎓 Certificate</p>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <a href={certUrl} target="_blank" rel="noopener noreferrer">
                          <img src={certUrl} alt={`Certificate ${idx + 1}`} className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    ))}
                    {!provider.documents?.governmentIdUrl && !provider.documents?.selfieUrl && !provider.documents?.barangayClearanceUrl && !provider.documents?.policeClearanceUrl && (!provider.documents?.certificateUrls || provider.documents.certificateUrls.length === 0) && (
                      <div className="col-span-2 text-center py-8 text-gray-400">No documents uploaded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Pricing Card */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-violet-500" /> Pricing
                  </h3>
                  <div className="space-y-3">
                    {provider.fixedPrice && (
                      <div className="bg-emerald-50 rounded-xl p-4">
                        <p className="text-sm text-emerald-600 font-medium mb-1">Fixed Price</p>
                        <p className="text-2xl font-bold text-emerald-700">₱{provider.fixedPrice.toLocaleString()}</p>
                      </div>
                    )}
                    {provider.hourlyRate && (
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-blue-600 font-medium mb-1">Hourly Rate</p>
                        <p className="text-2xl font-bold text-blue-700">₱{provider.hourlyRate}/hr</p>
                      </div>
                    )}
                    {!provider.fixedPrice && !provider.hourlyRate && (
                      <p className="text-gray-400 text-center py-4">No pricing set</p>
                    )}
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-violet-500" /> Admin Actions
                  </h3>
                  <div className="space-y-3">
                    {provider.providerStatus === "pending" && (
                      <>
                        <button onClick={handleApprove} disabled={updating}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50">
                          <CheckCircle className="w-5 h-5" /> Approve
                        </button>
                        <button onClick={handleReject} disabled={updating}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50">
                          <XCircle className="w-5 h-5" /> Reject
                        </button>
                      </>
                    )}
                    {provider.providerStatus === "approved" && (
                      <button onClick={handleSuspend} disabled={updating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50">
                        <PauseCircle className="w-5 h-5" /> Suspend
                      </button>
                    )}
                    {provider.providerStatus === "suspended" && (
                      <button onClick={handleReactivate} disabled={updating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50">
                        <PlayCircle className="w-5 h-5" /> Reactivate
                      </button>
                    )}
                    <Link href={`/chat/new?recipientId=${provider.id}`}
                      className="w-full flex items-center justify-center gap-2 border-2 border-violet-500 text-violet-600 py-3 rounded-xl font-bold hover:bg-violet-50 transition-all">
                      <MessageCircle className="w-5 h-5" /> Message
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {jobs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No jobs found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <Link key={job.id} href={`/admin/jobs/${job.id}`}
                      className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.clientName} • {job.scheduledDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">₱{job.amount.toLocaleString()}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getJobStatusStyle(job.status)}`}>
                            {job.status.replace("_", " ")}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-violet-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {reviews.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-violet-600">{review.clientName[0]}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{review.clientName}</p>
                            <p className="text-xs text-gray-400">{review.createdAt.toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-4 h-4 ${star <= review.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
