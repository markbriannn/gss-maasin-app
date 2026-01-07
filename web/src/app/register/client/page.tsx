'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  Wrench, ArrowLeft, ArrowRight, User, Mail, MapPin, Lock, Camera,
  CheckCircle, Check, Navigation, Loader2, Eye, EyeOff, Upload, ShieldCheck
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { uploadImage } from '@/lib/cloudinary';

// Define the props interface for InteractiveMap
interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Dynamically import the interactive map component (client-side only)
const InteractiveMap: ComponentType<InteractiveMapProps> = dynamic(
  () => import('@/components/InteractiveMap'),
  { ssr: false, loading: () => <div className="h-[250px] bg-gray-100 rounded-xl flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> }
);

const TOTAL_STEPS = 7;

const MAASIN_BARANGAYS = [
  'Abgao', 'Acasia', 'Asuncion', 'Bactul I', 'Bactul II', 'Badiang', 
  'Bagtican', 'Basak', 'Bato I', 'Bato II', 'Batuan', 'Baugo', 
  'Bilibol', 'Bogo', 'Cabadiangan', 'Cabulihan', 'Cagnituan', 'Cambooc', 
  'Cansirong', 'Canturing', 'Canyuom', 'Combado', 'Dongon', 'Gawisan', 
  'Guadalupe', 'Hanginan', 'Hantag', 'Hinapu Daku', 'Hinapu Gamay', 'Ibarra', 
  'Isagani (Pugaling)', 'Laboon', 'Lanao', 'Libertad', 'Libhu', 'Lib-og', 
  'Lonoy', 'Lunas', 'Mahayahay', 'Malapoc Norte', 'Malapoc Sur', 'Mambajao', 
  'Manhilo', 'Mantahan', 'Maria Clara', 'Matin-ao', 'Nasaug', 'Nati', 
  'Nonok Norte', 'Nonok Sur', 'Panan-awan', 'Pansaan', 'Pasay', 'Pinaskohan', 
  'Rizal', 'San Agustin (Lundag)', 'San Isidro', 'San Jose', 'San Rafael', 
  'Santa Cruz', 'Santo Niño', 'Santa Rosa', 'Santo Rosario', 'Soro-soro', 
  'Tagnipa', 'Tam-is', 'Tawid', 'Tigbawan', 'Tomoy-tomoy', 'Tunga-tunga'
];

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  streetAddress: string;
  houseNumber: string;
  barangay: string;
  landmark: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  profilePhoto: string;
}

export default function ClientRegistration() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    streetAddress: '',
    houseNumber: '',
    barangay: '',
    landmark: '',
    city: 'Maasin City',
    province: 'Southern Leyte',
    latitude: 10.1335,
    longitude: 124.8513,
    profilePhoto: '',
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const result = await uploadImage(file, 'profiles');
      setFormData(prev => ({ ...prev, profilePhoto: result.url }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Find matching barangay from our list
  const findMatchingBarangay = (barangayName: string): string => {
    if (!barangayName) return '';
    const normalizedName = barangayName.toLowerCase().trim();
    
    // Try exact match first
    const exactMatch = MAASIN_BARANGAYS.find((b) => b.toLowerCase() === normalizedName);
    if (exactMatch) return exactMatch;
    
    // Try partial match
    const partialMatch = MAASIN_BARANGAYS.find(
      (b) => normalizedName.includes(b.toLowerCase()) || b.toLowerCase().includes(normalizedName)
    );
    if (partialMatch) return partialMatch;
    
    // Try removing common prefixes/suffixes
    const cleanedName = normalizedName
      .replace(/^(brgy\.?|barangay)\s*/i, '')
      .replace(/,.*$/, '')
      .trim();
    
    const cleanMatch = MAASIN_BARANGAYS.find(
      (b) =>
        b.toLowerCase() === cleanedName ||
        cleanedName.includes(b.toLowerCase()) ||
        b.toLowerCase().includes(cleanedName)
    );
    
    return cleanMatch || '';
  };

  // Get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyC-qP1WOx8JSM6DfcAkIEmKQ8AQiAtiL9k';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        let streetNumber = '';
        let route = '';
        let barangay = '';
        let neighborhood = '';
        let sublocality = '';
        
        // Check all results for barangay info
        for (const result of data.results) {
          const addressComponents = result.address_components;
          
          for (const component of addressComponents) {
            if (component.types.includes('street_number')) {
              streetNumber = streetNumber || component.long_name;
            }
            if (component.types.includes('route')) {
              route = route || component.long_name;
            }
            if (component.types.includes('sublocality_level_1') || component.types.includes('sublocality')) {
              sublocality = sublocality || component.long_name;
            }
            if (component.types.includes('neighborhood')) {
              neighborhood = neighborhood || component.long_name;
            }
            if (component.types.includes('political') && component.long_name.toLowerCase().includes('brgy')) {
              barangay = barangay || component.long_name;
            }
            
            // Check if the component name matches any barangay
            const matchedBarangay = findMatchingBarangay(component.long_name);
            if (matchedBarangay && !barangay) {
              barangay = matchedBarangay;
            }
          }
        }
        
        // Try to find barangay from various fields
        const detectedBarangay =
          barangay ||
          findMatchingBarangay(sublocality) ||
          findMatchingBarangay(neighborhood) ||
          findMatchingBarangay(data.results[0].formatted_address);
        
        // Filter out "Unnamed Road"
        const cleanStreetAddress = route && !route.toLowerCase().includes('unnamed') ? route : '';
        
        return {
          streetAddress: cleanStreetAddress,
          houseNumber: streetNumber || '',
          barangay: detectedBarangay,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Send email verification code
  const sendEmailVerificationCode = async () => {
    if (isSendingCode || !formData.email) return;
    setIsSendingCode(true);
    setError('');

    try {
      const response = await fetch('https://gss-maasin-app.onrender.com/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          name: formData.firstName 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedCode(data.code);
        setCodeSent(true);
        setCountdown(60);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify email code
  const verifyEmailCode = () => {
    if (verificationCode === generatedCode) {
      setEmailVerified(true);
      setError('');
      // Auto-advance to next step after short delay
      setTimeout(() => {
        setStep(step + 1);
      }, 1000);
    } else {
      setError('Invalid verification code. Please try again.');
    }
  };

  // Countdown timer for resend
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle get current location
  const handleGetCurrentLocation = async () => {
    console.log('=== LOCATION BUTTON CLICKED ===');
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      setIsLoadingLocation(false);
      alert('Geolocation is not supported by your browser.');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`Location found: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
        
        const addressData = await getAddressFromCoordinates(latitude, longitude);
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          barangay: addressData?.barangay || prev.barangay,
          streetAddress: addressData?.streetAddress || prev.streetAddress,
          houseNumber: addressData?.houseNumber || prev.houseNumber,
        }));
        
        setIsLoadingLocation(false);
        
        if (addressData?.barangay) {
          alert(`Location Found!\n\nBarangay: ${addressData.barangay}\nAccuracy: ~${Math.round(accuracy)}m`);
        } else {
          alert(`Location detected but couldn't identify barangay. Please select manually.`);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLoadingLocation(false);
        alert('Could not get location. Please enable location services or enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.firstName.trim() && formData.lastName.trim();
      case 2:
        return formData.email.trim() && formData.phoneNumber.trim() && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 3:
        return emailVerified;
      case 4:
        return formData.streetAddress.trim() && formData.barangay.trim();
      case 5:
        return formData.password.length >= 8 && formData.password === formData.confirmPassword;
      case 6:
        return true; // Profile photo is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceed() && step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        suffix: formData.suffix,
        phoneNumber: formData.phoneNumber.startsWith('+63') 
          ? formData.phoneNumber 
          : `+63${formData.phoneNumber.replace(/^0/, '')}`,
        streetAddress: formData.streetAddress,
        houseNumber: formData.houseNumber,
        barangay: formData.barangay,
        landmark: formData.landmark,
        city: formData.city,
        province: formData.province,
        latitude: formData.latitude,
        longitude: formData.longitude,
        profilePhoto: formData.profilePhoto,
        role: 'CLIENT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStep(TOTAL_STEPS); // Go to completion step
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      if (errorMessage.includes('email-already-in-use')) {
        setError('This email is already registered');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-gray-500 mt-1">Let&apos;s start with your basic details</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  placeholder="Juan"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => updateForm('middleName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  placeholder="Santos"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  placeholder="Dela Cruz"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suffix <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.suffix}
                  onChange={(e) => updateForm('suffix', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  placeholder="Jr., Sr., III"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Mail className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
              <p className="text-gray-500 mt-1">How can we reach you?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value.toLowerCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 border border-r-0 border-gray-300 rounded-l-xl bg-gray-50 text-gray-500">
                  +63
                </span>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateForm('phoneNumber', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  placeholder="9XX XXX XXXX"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Your data is secure</p>
                <p className="text-sm text-green-600">We&apos;ll never share your contact information with third parties.</p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
              <p className="text-gray-500 mt-1">We&apos;ll send a verification code to</p>
              <p className="text-[#00B14F] font-semibold">{formData.email}</p>
            </div>

            {!codeSent ? (
              <button
                onClick={sendEmailVerificationCode}
                disabled={isSendingCode}
                className="w-full bg-[#00B14F] text-white py-3 rounded-xl font-semibold hover:bg-[#009940] disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Verification Code
                  </>
                )}
              </button>
            ) : emailVerified ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-800 font-semibold">Email Verified!</p>
                <p className="text-green-600 text-sm mt-1">Your email has been verified successfully.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter 6-digit code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={verifyEmailCode}
                  disabled={verificationCode.length !== 6}
                  className="w-full bg-[#00B14F] text-white py-3 rounded-xl font-semibold hover:bg-[#009940] disabled:bg-gray-300"
                >
                  Verify Code
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">Didn&apos;t receive the code?</p>
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-400">Resend in {countdown}s</p>
                  ) : (
                    <button
                      onClick={() => {
                        setVerificationCode('');
                        sendEmailVerificationCode();
                      }}
                      className="text-[#00B14F] font-medium text-sm hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Check your inbox</p>
                <p className="text-sm text-blue-600">The code may take a few seconds to arrive. Check spam folder if not found.</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Set Your Location</h2>
              <p className="text-gray-500 mt-1">Where are you located in Maasin City?</p>
            </div>

            {/* Interactive Map - Click the locate button (green arrow) on the map or drag marker to set location */}
            <InteractiveMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationChange={async (lat: number, lng: number) => {
                // Update coordinates immediately
                setFormData(prev => ({
                  ...prev,
                  latitude: lat,
                  longitude: lng,
                }));
                
                // Get address from new coordinates
                const addressData = await getAddressFromCoordinates(lat, lng);
                if (addressData) {
                  setFormData(prev => ({
                    ...prev,
                    barangay: addressData.barangay || prev.barangay,
                    streetAddress: addressData.streetAddress || prev.streetAddress,
                    houseNumber: addressData.houseNumber || prev.houseNumber,
                  }));
                }
              }}
            />

            {/* Barangay Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.barangay}
                onChange={(e) => updateForm('barangay', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] bg-white"
              >
                <option value="">Select Barangay</option>
                {MAASIN_BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) => updateForm('streetAddress', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="e.g., Rizal Street, Purok 1"
              />
            </div>

            {/* House/Building Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House/Building Number
              </label>
              <input
                type="text"
                value={formData.houseNumber}
                onChange={(e) => updateForm('houseNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="e.g., 123, Bldg. A"
              />
            </div>
          </div>
        );

      case 5:
        const hasMinLength = formData.password.length >= 8;
        const hasUppercase = /[A-Z]/.test(formData.password);
        const hasNumber = /[0-9]/.test(formData.password);
        const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Lock className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create Password</h2>
              <p className="text-gray-500 mt-1">Secure your account with a strong password</p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Password Requirements</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${hasMinLength ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${hasUppercase ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>One uppercase letter (recommended)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>One number (recommended)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateForm('confirmPassword', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] ${
                    formData.confirmPassword 
                      ? passwordsMatch 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className={`w-4 h-4 ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Profile Photo</h2>
              <p className="text-gray-500 mt-1">Add a photo to help others recognize you</p>
            </div>

            {/* Photo Upload Section */}
            <div className="flex flex-col items-center">
              <label className="cursor-pointer relative group">
                <div className={`w-36 h-36 rounded-full flex items-center justify-center mb-4 overflow-hidden ${
                  formData.profilePhoto 
                    ? 'border-4 border-[#00B14F]' 
                    : 'border-3 border-dashed border-gray-300 bg-gray-100'
                }`}>
                  {isUploadingPhoto ? (
                    <Loader2 className="w-10 h-10 text-[#00B14F] animate-spin" />
                  ) : formData.profilePhoto ? (
                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                {/* Camera badge */}
                <div className="absolute bottom-4 right-0 w-10 h-10 bg-[#00B14F] rounded-full flex items-center justify-center border-3 border-white shadow-lg">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>

              {/* Upload Button */}
              <label className="cursor-pointer w-full max-w-xs">
                <div className="flex items-center justify-center gap-2 py-3 border-2 border-[#00B14F] text-[#00B14F] rounded-xl font-semibold hover:bg-green-50 transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>{formData.profilePhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>

            {/* Photo Tips */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Photo Tips</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Use a clear, recent photo of yourself</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Make sure your face is clearly visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Avoid group photos or logos</span>
                </div>
              </div>
            </div>

            {/* Skip option */}
            <p className="text-center text-sm text-gray-400">You can skip this step and add a photo later</p>
          </div>
        );

      case 7:
        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Check className="w-12 h-12 text-[#00B14F]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to GSS Maasin!</h2>
            <p className="text-gray-500 mb-8">Your account has been created successfully.</p>
            <button
              onClick={() => router.push('/onboarding')}
              className="bg-[#00B14F] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#009940]"
            >
              Get Started
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          {step > 1 && step < TOTAL_STEPS ? (
            <button onClick={handleBack} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : step === 1 ? (
            <Link href="/register" className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : null}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00B14F] rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">GSS Maasin</span>
            </div>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* Progress Bar */}
      {step < TOTAL_STEPS && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00B14F] transition-all duration-300"
              style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">Step {step} of {TOTAL_STEPS - 1}</p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          {renderStepContent()}

          {/* Navigation Buttons */}
          {step < TOTAL_STEPS - 1 && (
            <div className="mt-8">
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full bg-[#00B14F] text-white py-3 rounded-xl font-semibold hover:bg-[#009940] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === TOTAL_STEPS - 1 && (
            <div className="mt-8 space-y-4">
              {/* Terms and Conditions Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-[#00B14F] border-gray-300 rounded focus:ring-[#00B14F] cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-[#00B14F] font-medium hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-[#00B14F] font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  . I understand that my data will be processed in accordance with these policies.
                </label>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={loading || !agreedToTerms}
                className="w-full bg-[#00B14F] text-white py-3 rounded-xl font-semibold hover:bg-[#009940] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          )}
        </div>

        {step < TOTAL_STEPS && (
          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00B14F] font-medium hover:underline">
              Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
