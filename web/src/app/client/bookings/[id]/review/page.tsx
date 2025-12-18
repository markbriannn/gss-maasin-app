'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Star, User, Loader2, CheckCircle, Camera, X, AlertCircle } from 'lucide-react';

interface JobData {
  id: string;
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  serviceCategory: string;
  rating?: number;
  review?: string;
  reviewed?: boolean;
  status: string;
  clientId: string;
}

export default function ReviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Eligibility state
  const [eligible, setEligible] = useState(true);
  const [ineligibleReason, setIneligibleReason] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!jobId || !user) return;
    fetchJobAndCheckEligibility();
  }, [jobId, user]);

  const fetchJobAndCheckEligibility = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (!jobDoc.exists()) {
        setEligible(false);
        setIneligibleReason('Booking not found.');
        setLoading(false);
        return;
      }

      const data = jobDoc.data();
      
      // Check if already reviewed
      if (data.reviewed || data.rating) {
        setSubmitted(true);
        setRating(data.rating || 0);
        setReview(data.review || '');
      }

      // Check eligibility
      // 1. Must be the client who booked
      if (data.clientId !== user?.uid) {
        setEligible(false);
        setIneligibleReason('You can only review jobs you booked.');
        setLoading(false);
        return;
      }

      // 2. Job must be completed
      if (data.status !== 'completed') {
        setEligible(false);
        setIneligibleReason('You can only review completed jobs.');
        setLoading(false);
        return;
      }

      // 3. Check if already reviewed in reviews collection
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('bookingId', '==', jobId),
        where('clientId', '==', user?.uid)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      if (!reviewsSnap.empty) {
        setSubmitted(true);
        const existingReview = reviewsSnap.docs[0].data();
        setRating(existingReview.rating || 0);
        setReview(existingReview.comment || existingReview.review || '');
      }

      // Fetch provider info
      let providerInfo = { name: data.providerName || 'Provider', photo: '' };
      if (data.providerId) {
        try {
          const providerDoc = await getDoc(doc(db, 'users', data.providerId));
          if (providerDoc.exists()) {
            const pData = providerDoc.data();
            providerInfo = {
              name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || data.providerName,
              photo: pData.profilePhoto || '',
            };
          }
        } catch (e) {
          console.error('Error fetching provider:', e);
        }
      }

      setJob({
        id: jobDoc.id,
        providerId: data.providerId,
        providerName: providerInfo.name,
        providerPhoto: providerInfo.photo,
        serviceCategory: data.serviceCategory || '',
        rating: data.rating,
        review: data.review,
        reviewed: data.reviewed,
        status: data.status,
        clientId: data.clientId,
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      setEligible(false);
      setIneligibleReason('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      alert('You can only add up to 5 images.');
      return;
    }

    const newImages: { file: File; preview: string }[] = [];
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setImages(prev => [...prev, ...newImages]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImagesToCloudinary = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const img of images) {
      try {
        const formData = new FormData();
        formData.append('file', img.file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'gss_uploads');
        
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dqsyqnqvt';
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData }
        );
        
        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!job || rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!review.trim()) {
      alert('Please add a comment to your review.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload images first if any
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        setUploadingImages(true);
        uploadedImageUrls = await uploadImagesToCloudinary();
        setUploadingImages(false);
      }

      // Add review to reviews collection
      await addDoc(collection(db, 'reviews'), {
        bookingId: job.id,
        providerId: job.providerId,
        providerName: job.providerName,
        clientId: user?.uid,
        clientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client',
        clientPhoto: user?.profilePhoto || '',
        rating,
        comment: review.trim(),
        review: review.trim(),
        images: uploadedImageUrls,
        serviceCategory: job.serviceCategory,
        createdAt: serverTimestamp(),
      });

      // Update booking with rating
      await updateDoc(doc(db, 'bookings', job.id), {
        rating,
        review: review.trim(),
        reviewed: true,
        reviewRating: rating,
        reviewedAt: serverTimestamp(),
      });

      // Update provider's average rating
      const providerDoc = await getDoc(doc(db, 'users', job.providerId));
      if (providerDoc.exists()) {
        const providerData = providerDoc.data();
        const currentRating = providerData.rating || providerData.averageRating || 0;
        const currentCount = providerData.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + rating) / newCount;

        await updateDoc(doc(db, 'users', job.providerId), {
          rating: newRating,
          averageRating: newRating,
          reviewCount: newCount,
        });
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Tap to rate';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B14F]" />
      </div>
    );
  }

  // Not eligible to review
  if (!eligible) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cannot Submit Review</h2>
          <p className="text-gray-600 mb-6">{ineligibleReason}</p>
          <button
            onClick={() => router.back()}
            className="w-full py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Booking not found</p>
          <Link href="/client/bookings" className="text-[#00B14F] mt-4 inline-block">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  // Already submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your review has been submitted successfully. It helps other clients find great service providers.
          </p>
          <div className="flex items-center justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <Link
            href="/client/bookings"
            className="block w-full py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Leave a Review</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Provider Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 text-center">
          {job.providerPhoto ? (
            <img src={job.providerPhoto} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900">{job.providerName}</h2>
          <p className="text-gray-500">{job.serviceCategory}</p>
        </div>

        {/* Rating */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">How was your experience?</h3>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-gray-600">{getRatingLabel(hoverRating || rating)}</p>
        </div>

        {/* Review Text */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Share details of your experience</h3>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share details of your experience..."
            className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:border-[#00B14F] focus:ring-1 focus:ring-[#00B14F] outline-none"
            rows={4}
          />
        </div>

        {/* Image Upload Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Add Photos (Optional)</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={img.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs mt-1">{images.length}/5</span>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Add up to 5 photos of the completed work</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddImages}
            className="hidden"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || !review.trim() || submitting}
          className="w-full py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {uploadingImages ? 'Uploading images...' : 'Submitting...'}
            </>
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </div>
  );
}