'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Camera, Upload, Loader2, CheckCircle, User, ArrowRight } from 'lucide-react';
import { uploadImage } from '@/lib/cloudinary';

export default function SetupProfilePhoto() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [profilePhoto, setProfilePhoto] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    // If user already has profile photo, redirect to dashboard
    if (user?.profilePhoto) {
      router.push('/provider');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file, 'profiles');
      setProfilePhoto(result.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !profilePhoto) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        profilePhoto,
        profileSetupComplete: true,
      });
      router.push('/provider');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save profile photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          profileSetupComplete: true,
        });
        // Small delay to ensure Firestore update propagates
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Skip error:', error);
        // Store in localStorage as fallback to prevent redirect loop
        localStorage.setItem('profileSetupSkipped', 'true');
      }
    } else {
      // No user, store in localStorage as fallback
      localStorage.setItem('profileSetupSkipped', 'true');
    }
    
    // Use window.location for more reliable redirect
    window.location.href = '/provider';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Camera className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome!</h1>
          <p className="text-gray-500 mt-2">Add a profile photo to help clients recognize you</p>
        </div>

        {/* Photo Upload */}
        <div className="flex flex-col items-center mb-8">
          <label className="cursor-pointer relative group">
            <div className={`w-36 h-36 rounded-full flex items-center justify-center overflow-hidden transition-all ${
              profilePhoto 
                ? 'border-4 border-blue-500' 
                : 'border-4 border-dashed border-gray-300 bg-gray-100 hover:border-blue-400'
            }`}>
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              ) : profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
            </div>
            {/* Camera badge */}
            <div className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-3 border-white shadow-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* Upload Button */}
          <label className="cursor-pointer mt-4">
            <div className="flex items-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-500 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
              <Upload className="w-5 h-5" />
              <span>{profilePhoto ? 'Change Photo' : 'Upload Photo'}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Success indicator */}
        {profilePhoto && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 text-sm">Photo uploaded successfully!</span>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Photo Tips:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Use a clear, recent photo of yourself</li>
            <li>• Make sure your face is clearly visible</li>
            <li>• A professional photo builds trust with clients</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={!profilePhoto || isSaving}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={isSkipping}
            className="w-full text-gray-500 py-3 rounded-xl font-medium hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isSkipping ? 'Redirecting...' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
}
