'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendBookingConfirmation } from '@/lib/email';
import { createPaymentSource, PaymentMethod } from '@/lib/paymongo';
import ClientLayout from '@/components/layouts/ClientLayout';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, User, MapPin, FileText, Camera, X, Star, Shield,
  CreditCard, Loader2, CheckCircle, Clock, AlertCircle, Play,
  Sparkles, ChevronRight, Upload, ImagePlus, Video, Wallet,
  BadgeCheck, Calendar, MessageSquare, Phone, Navigation, Home,
  Building, Flag, Receipt, Info, ArrowRight, Check, Zap
} from 'lucide-react';

interface ProviderData {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  profilePhoto?: string;
  fixedPrice?: number;
  hourlyRate?: number;
  priceType?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  isOnline?: boolean;
  responseTime?: number;
}

interface MediaFile {
  file: File;
  preview: string;
  isVideo: boolean;
}

// Loading fallback component
function BookingLoading() {
  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00B14F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    </ClientLayout>
  );
}

// Main page wrapper with Suspense
export default function BookServicePage() {
  return (
    <Suspense fallback={<BookingLoading />}>
      <BookServiceContent />
    </Suspense>
  );
}

function BookServiceContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerId = searchParams.get('providerId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (providerId) fetchProvider();
    else setLoading(false);
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const providerDoc = await getDoc(doc(db, 'users', providerId!));
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        setProvider({
          id: providerDoc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          profilePhoto: data.profilePhoto,
          fixedPrice: data.fixedPrice || data.hourlyRate || data.price || data.rate || data.servicePrice || 0,
          hourlyRate: data.hourlyRate || data.rate || 0,
          priceType: data.priceType || 'per_job',
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          completedJobs: data.completedJobs || 0,
          isOnline: data.isOnline || false,
          responseTime: data.responseTime || 5,
        });
      }
    } catch (error) {
      console.error('Error fetching provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = () => provider?.fixedPrice || provider?.hourlyRate || 0;
  const getSystemFee = () => getPrice() * 0.05;
  const getTotalAmount = () => getPrice() + getSystemFee();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: MediaFile[] = [];
    const maxFiles = 5 - mediaFiles.length;
    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      newFiles.push({ file, preview: URL.createObjectURL(file), isVideo });
    }
    setMediaFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadMediaToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'gss_uploads');
    formData.append('folder', `jobs/${user?.uid}`);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxhisrwl5';
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: formData });
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!provider || !user) return;
    if (mediaFiles.length === 0) { alert('Please upload at least one photo or video'); return; }

    // Check if client already has an active booking with this provider
    try {
      const activeStatuses = ['pending', 'approved', 'accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'];
      const existingBookingsQuery = query(
        collection(db, 'bookings'),
        where('clientId', '==', user.uid),
        where('providerId', '==', provider.id),
        where('status', 'in', activeStatuses)
      );
      const existingBookingsSnap = await getDocs(existingBookingsQuery);
      
      if (!existingBookingsSnap.empty) {
        alert(`You already have an active booking with ${provider.firstName} ${provider.lastName}. Please wait for it to complete or cancel it before booking again.`);
        return;
      }
    } catch (checkError) {
      console.log('Error checking existing bookings:', checkError);
      // Continue with booking if check fails
    }

    setSubmitting(true);
    try {
      setUploadingMedia(true);
      const uploadedMedia: { url: string; type: string; isVideo: boolean }[] = [];
      for (const media of mediaFiles) {
        try {
          const url = await uploadMediaToCloudinary(media.file);
          uploadedMedia.push({ url, type: media.file.type, isVideo: media.isVideo });
        } catch (error) { console.error('Media upload failed:', error); }
      }
      setUploadingMedia(false);

      let clientAddress = user.barangay ? `Brgy. ${user.barangay}, Maasin City` : user.streetAddress ? `${user.streetAddress}, Maasin City` : 'Maasin City';
      const providerPrice = getPrice();
      const systemFee = getSystemFee();
      const totalAmount = getTotalAmount();

      // Create booking first with pending_payment status
      const bookingData = {
        clientId: user.uid,
        clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client',
        clientEmail: user.email,
        clientPhone: user.phoneNumber,
        providerId: provider.id,
        providerName: `${provider.firstName} ${provider.lastName}`.trim(),
        serviceCategory: provider.serviceCategory,
        title: `${provider.serviceCategory} Service Request`,
        description: additionalNotes || 'See attached photos/videos',
        additionalNotes,
        mediaFiles: uploadedMedia,
        address: clientAddress,
        houseNumber: user.houseNumber || '',
        streetAddress: user.streetAddress || '',
        barangay: user.barangay || '',
        landmark: user.landmark || '',
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        providerFixedPrice: providerPrice,
        providerPrice: providerPrice,
        priceType: provider.priceType || 'per_job',
        systemFee: systemFee,
        systemFeePercentage: 5,
        totalAmount: totalAmount,
        // Escrow payment - always pay first
        paymentMethod: paymentMethod,
        paymentPreference: 'pay_first', // ALWAYS pay first
        paymentStatus: 'pending', // pending -> paid -> held -> released
        isPaidUpfront: false,
        upfrontPaidAmount: 0,
        escrowAmount: totalAmount, // Amount held in escrow
        status: 'pending', // Start as pending - admin will review and approve
        adminApproved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      const newBookingId = docRef.id;
      setBookingId(newBookingId);

      // Now redirect to payment
      setProcessingPayment(true);
      
      const paymentResult = await createPaymentSource({
        amount: totalAmount,
        description: `${provider.serviceCategory} Service - ${provider.firstName} ${provider.lastName}`,
        bookingId: newBookingId,
        clientId: user.uid,
        providerId: provider.id,
        paymentMethod: paymentMethod,
      });

      if (paymentResult.success && paymentResult.checkoutUrl) {
        // Redirect to PayMongo checkout
        window.location.href = paymentResult.checkoutUrl;
      } else {
        alert('Failed to process payment: ' + (paymentResult.error || 'Unknown error'));
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking');
      setSubmitting(false);
      setUploadingMedia(false);
      setProcessingPayment(false);
    }
  };

  // Loading State
  if (authLoading || loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00B14F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading booking details...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Success State
  if (submitted) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Success Animation */}
            <div className="bg-white rounded-3xl shadow-2xl shadow-green-100 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00B14F] via-emerald-400 to-teal-500" />
              
              {/* Confetti Effect */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 50}%`,
                      backgroundColor: ['#00B14F', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'][i % 5],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random()}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200 animate-pulse">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
                <p className="text-gray-500 mb-6">Your booking is pending admin approval</p>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-600">Submitted</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center animate-pulse">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-gray-600">Pending</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <div className="flex items-center gap-2 opacity-50">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Zap className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-gray-400">Active</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link
                    href={`/client/bookings/${bookingId}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#00B14F] to-emerald-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-green-200 transition-all"
                  >
                    <span>View Booking Details</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/client/bookings"
                    className="block w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Go to My Bookings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // No Provider State
  if (!provider) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Provider Selected</h2>
            <p className="text-gray-500 mb-6">Please select a provider first</p>
            <Link href="/client/providers" className="inline-flex items-center gap-2 px-6 py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors">
              <span>Browse Providers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Main Booking Form
  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-[#00B14F] via-emerald-500 to-teal-500 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Book Service</h1>
                <p className="text-emerald-100 text-sm">Complete your booking in a few steps</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-4 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Provider Card */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {provider.profilePhoto ? (
                        <Image src={provider.profilePhoto} alt="" width={80} height={80} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
                          <User className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {provider.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-gray-900">{provider.firstName} {provider.lastName}</h2>
                        <BadgeCheck className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-[#00B14F] font-medium mb-2">{provider.serviceCategory}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-semibold text-gray-900">{(provider.rating || 0).toFixed(1)}</span>
                          <span className="text-gray-500">({provider.reviewCount || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Shield className="w-4 h-4" />
                          <span>{provider.completedJobs || 0} jobs</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>~{provider.responseTime || 5}m reply</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Upload Photos/Videos</h3>
                    <p className="text-sm text-gray-500">Show us what needs to be fixed</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Required</span>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" multiple className="hidden" />

                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragActive ? 'border-[#00B14F] bg-green-50' : mediaFiles.length === 0 ? 'border-red-300 bg-red-50/50 hover:border-red-400' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${dragActive ? 'bg-green-100' : mediaFiles.length === 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-8 h-8 ${dragActive ? 'text-green-600' : mediaFiles.length === 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">
                    {dragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-sm text-gray-500">Up to 5 photos or videos • Max 50MB each</p>
                  
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ImagePlus className="w-4 h-4" />
                      <span>Photos</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Video className="w-4 h-4" />
                      <span>Videos</span>
                    </div>
                  </div>
                </div>

                {/* Media Preview Grid */}
                {mediaFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">{mediaFiles.length} of 5 files uploaded</p>
                      <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#00B14F] to-emerald-400 transition-all" style={{ width: `${(mediaFiles.length / 5) * 100}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {mediaFiles.map((media, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                          {media.isVideo ? (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                              <Play className="w-8 h-8 text-white" />
                            </div>
                          ) : (
                            <img src={media.preview} alt="" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveMedia(index); }} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                          {media.isVideo && (
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">Video</div>
                          )}
                        </div>
                      ))}
                      {mediaFiles.length < 5 && (
                        <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-[#00B14F] hover:bg-green-50 transition-colors">
                          <Camera className="w-6 h-6 text-gray-400" />
                          <span className="text-xs text-gray-400 mt-1">Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {mediaFiles.length === 0 && (
                  <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Please upload at least one photo or video of the problem</span>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Describe the Problem</h3>
                    <p className="text-sm text-gray-500">Help the provider understand your needs</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">Optional</span>
                </div>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="E.g., The kitchen sink has been leaking for 2 days. Water is dripping from under the cabinet..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-[#00B14F] focus:ring-2 focus:ring-green-100 outline-none resize-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-2 text-right">{additionalNotes.length}/500 characters</p>
              </div>

              {/* Payment Method - Escrow System */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Secure Payment</h3>
                    <p className="text-sm text-gray-500">Pay now, money released after job completion</p>
                  </div>
                </div>

                {/* Escrow Info */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-800">Protected Payment</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Your payment is held securely until the job is completed and you confirm satisfaction.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('gcash')}
                    className={`relative p-4 rounded-2xl border-2 text-center transition-all ${
                      paymentMethod === 'gcash'
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {paymentMethod === 'gcash' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-lg">G</span>
                    </div>
                    <p className={`font-semibold ${paymentMethod === 'gcash' ? 'text-blue-600' : 'text-gray-900'}`}>GCash</p>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('maya')}
                    className={`relative p-4 rounded-2xl border-2 text-center transition-all ${
                      paymentMethod === 'maya'
                        ? 'border-green-500 bg-green-50 shadow-lg shadow-green-100'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {paymentMethod === 'maya' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-lg">M</span>
                    </div>
                    <p className={`font-semibold ${paymentMethod === 'maya' ? 'text-green-600' : 'text-gray-900'}`}>Maya</p>
                  </button>
                </div>

                <div className="mt-4 p-4 bg-amber-50 rounded-xl flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    You&apos;ll be redirected to {paymentMethod === 'gcash' ? 'GCash' : 'Maya'} to complete payment. 
                    Money will be held until the provider completes the job and you confirm.
                  </p>
                </div>
              </div>

              {/* Service Location */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Service Location</h3>
                    <p className="text-sm text-gray-500">Where the service will be performed</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  {user?.houseNumber && (
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{user.houseNumber}</span>
                    </div>
                  )}
                  {user?.streetAddress && (
                    <div className="flex items-center gap-3">
                      <Navigation className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{user.streetAddress}</span>
                    </div>
                  )}
                  {user?.barangay && (
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Barangay {user.barangay}</span>
                    </div>
                  )}
                  {user?.landmark && (
                    <div className="flex items-center gap-3">
                      <Flag className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Near {user.landmark}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#00B14F]" />
                    <span className="text-gray-700 font-medium">Maasin City, Southern Leyte</span>
                  </div>
                </div>

                <Link href="/settings/profile" className="flex items-center gap-2 mt-4 text-[#00B14F] text-sm font-medium hover:underline">
                  <span>Update address</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Sidebar - Price Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-4">
                {/* Price Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#00B14F] to-emerald-500 p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="w-5 h-5" />
                      <span className="font-semibold">Price Summary</span>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Service Price</span>
                      <span className="font-semibold text-gray-900">₱{getPrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">Platform Fee</span>
                        <span className="text-xs text-gray-400">(5%)</span>
                      </div>
                      <span className="font-semibold text-gray-900">₱{getSystemFee().toLocaleString()}</span>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-[#00B14F]">₱{getTotalAmount().toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {provider.priceType === 'per_hire' ? 'Per hire' : 'Per job'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || processingPayment || mediaFiles.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-[#00B14F] to-emerald-500 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting || processingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadingMedia ? 'Uploading...' : processingPayment ? 'Redirecting to Payment...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₱{getTotalAmount().toLocaleString()} & Book</span>
                    </>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                    <Shield className="w-5 h-5 text-[#00B14F]" />
                    <span>Payment held until job completion</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                    <CheckCircle className="w-5 h-5 text-[#00B14F]" />
                    <span>Money released only after you confirm</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Sparkles className="w-5 h-5 text-[#00B14F]" />
                    <span>100% Secure with PayMongo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
