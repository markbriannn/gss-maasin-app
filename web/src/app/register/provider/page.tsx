'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  Wrench, ArrowLeft, ArrowRight, User, Mail, MapPin, Lock, Briefcase, FileText,
  CheckCircle, Clock, Calendar, Eye, EyeOff, Camera, Upload, Loader2, Navigation, ShieldCheck
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

const TOTAL_STEPS = 10;

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'sss', label: 'SSS ID' },
  { value: 'philhealth', label: 'PhilHealth ID' },
  { value: 'postal', label: 'Postal ID' },
  { value: 'voters', label: "Voter's ID" },
  { value: 'prc', label: 'PRC ID' },
  { value: 'umid', label: 'UMID' },
  { value: 'tin', label: 'TIN ID' },
];

const SERVICE_CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: '⚡', color: '#F59E0B' },
  { id: 'plumber', name: 'Plumber', icon: '🔧', color: '#3B82F6' },
  { id: 'carpenter', name: 'Carpenter', icon: '🔨', color: '#8B4513' },
  { id: 'cleaner', name: 'Cleaner', icon: '✨', color: '#10B981' },
];

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
  dateOfBirth: string;
  serviceCategory: string;
  aboutService: string;
  yearsExperience: string;
  priceType: 'per_job' | 'per_hire';
  fixedPrice: string;
  profilePhoto: string;
  // Documents
  idType: string;
  validIdUrl: string;
  barangayClearanceUrl: string;
  policeClearanceUrl: string;
  selfieUrl: string;
}

export default function ProviderRegistration() {
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
    dateOfBirth: '',
    serviceCategory: '',
    aboutService: '',
    yearsExperience: '',
    priceType: 'per_job',
    fixedPrice: '',
    profilePhoto: '',
    // Documents
    idType: '',
    validIdUrl: '',
    barangayClearanceUrl: '',
    policeClearanceUrl: '',
    selfieUrl: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
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

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

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

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingDoc(field);
    try {
      const result = await uploadImage(file, 'documents');
      setFormData(prev => ({ ...prev, [field]: result.url }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingDoc(null);
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

  // Get address from coordinates using reverse geocoding (same as client)
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

  // Handle map location change
  const handleLocationChange = async (lat: number, lng: number) => {
    // Update coordinates immediately
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    
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
  };

  // Get current location (same as client)
  const getCurrentLocation = async () => {
    console.log('Location button clicked');
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please enter your address manually.');
      return;
    }
    
    setIsLoadingLocation(true);
    
    // Check permission status first (if available)
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        console.log('Permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          setIsLoadingLocation(false);
          alert('Location permission is denied. Please enable location access in your browser settings:\n\n1. Click the lock/info icon in the address bar\n2. Find "Location" and set it to "Allow"\n3. Refresh the page and try again');
          return;
        }
      } catch (e) {
        console.log('Permission query not supported:', e);
      }
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`Location found: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
        
        // Get address from coordinates
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
          alert(`Location Found!\n\nBarangay: ${addressData.barangay}${addressData.streetAddress ? `\nStreet: ${addressData.streetAddress}` : ''}${addressData.houseNumber ? `\nHouse #: ${addressData.houseNumber}` : ''}\n\nAccuracy: ~${Math.round(accuracy)}m\n\nPlease verify the information is correct.`);
        } else {
          alert(`Location detected (accuracy: ~${Math.round(accuracy)}m) but we couldn't identify your barangay automatically.\n\nPlease select your barangay from the list below.`);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLoadingLocation(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location permission denied.\n\nTo enable location:\n1. Click the lock/info icon in the address bar\n2. Find "Location" and set it to "Allow"\n3. Refresh the page and try again');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable. Please check if:\n\n1. Your device has GPS/location services enabled\n2. You have an internet connection\n\nYou can also enter your address manually below.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out. Please try again or enter your address manually.');
            break;
          default:
            alert('Could not get your location. Please enable location services or enter your address manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const updateForm = (field: keyof FormData, value: string | boolean | number) => {
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


  const canProceed = () => {
    switch (step) {
      case 1: // Personal Info
        return formData.firstName.trim() && formData.lastName.trim();
      case 2: // Contact Info
        return formData.email.trim() && formData.phoneNumber.trim() && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 3: // Email Verification
        return emailVerified;
      case 4: // Location
        return formData.streetAddress.trim() && formData.barangay.trim();
      case 5: // Password
        // Password must have: 8+ chars, 1 uppercase, 1 number, and match confirmation
        return formData.password.length >= 8 && 
               /[A-Z]/.test(formData.password) && 
               /[0-9]/.test(formData.password) && 
               formData.password === formData.confirmPassword;
      case 6: // Date of Birth
        return formData.dateOfBirth.trim();
      case 7: // Service Category
        return formData.serviceCategory.trim();
      case 8: // About Service with Pricing
        return formData.aboutService.trim().length >= 10 && formData.fixedPrice && parseFloat(formData.fixedPrice) > 0;
      case 9: // Documents
        return formData.idType && formData.validIdUrl && formData.barangayClearanceUrl && formData.policeClearanceUrl && formData.selfieUrl;
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
        phone: formData.phoneNumber.startsWith('+63') 
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
        location: {
          streetAddress: formData.streetAddress,
          houseNumber: formData.houseNumber,
          barangay: formData.barangay,
          landmark: formData.landmark,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
        dateOfBirth: formData.dateOfBirth,
        serviceCategory: formData.serviceCategory,
        aboutService: formData.aboutService,
        bio: formData.aboutService,
        yearsExperience: formData.yearsExperience,
        priceType: formData.priceType,
        fixedPrice: parseFloat(formData.fixedPrice) || 0,
        profilePhoto: formData.profilePhoto,
        // Documents
        documents: {
          idType: formData.idType,
          validId: formData.validIdUrl,
          barangayClearance: formData.barangayClearanceUrl,
          policeClearance: formData.policeClearanceUrl,
          selfie: formData.selfieUrl,
        },
        role: 'PROVIDER',
        providerStatus: 'pending',
        status: 'pending',
        rating: 0,
        averageRating: 0,
        reviewCount: 0,
        completedJobs: 0,
        isOnline: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStep(TOTAL_STEPS);
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
      case 1: // Personal Info
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-gray-500 mt-1">Let&apos;s get to know you</p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jr., Sr., III"
                />
              </div>
            </div>
          </div>
        );

      case 2: // Contact Info
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Mail className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
              <p className="text-gray-500 mt-1">How can clients reach you?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value.toLowerCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="9XX XXX XXXX"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        );


      case 3: // Email Verification
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
              <p className="text-gray-500 mt-1">We&apos;ll send a verification code to</p>
              <p className="text-blue-500 font-semibold">{formData.email}</p>
            </div>

            {!codeSent ? (
              <button
                onClick={sendEmailVerificationCode}
                disabled={isSendingCode}
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={verifyEmailCode}
                  disabled={verificationCode.length !== 6}
                  className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300"
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
                      className="text-blue-500 font-medium text-sm hover:underline"
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

      case 4: // Location with Map (simplified - 4 fields only like mobile)
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Set Your Location</h2>
              <p className="text-gray-500 mt-1">Where are you located in Maasin City?</p>
            </div>

            {/* Interactive Map - Click the locate button (green arrow) on the map or drag marker */}
            <InteractiveMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationChange={handleLocationChange}
            />

            {/* Barangay Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.barangay}
                onChange={(e) => updateForm('barangay', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Barangay</option>
                {MAASIN_BARANGAYS.map((brgy) => (
                  <option key={brgy} value={brgy}>{brgy}</option>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Street Name"
              />
            </div>

            {/* House Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House/Building Number
              </label>
              <input
                type="text"
                value={formData.houseNumber}
                onChange={(e) => updateForm('houseNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 123, Blk 5 Lot 10"
              />
            </div>
          </div>
        );

      case 5: // Password
        const hasMinLength = formData.password.length >= 8;
        const hasUppercase = /[A-Z]/.test(formData.password);
        const hasNumber = /[0-9]/.test(formData.password);
        const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Lock className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create Password</h2>
              <p className="text-gray-500 mt-1">Secure your account</p>
            </div>

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
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Password Requirements</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${hasMinLength ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${hasUppercase ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>One uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>One number</span>
                </div>
              </div>
            </div>

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
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.confirmPassword 
                      ? passwordsMatch ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
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

      case 6: // Date of Birth
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Date of Birth</h2>
              <p className="text-gray-500 mt-1">When were you born?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateForm('dateOfBirth', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-2">You must be at least 18 years old to register as a provider.</p>
            </div>
          </div>
        );

      case 7: // Service Category
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Service Category</h2>
              <p className="text-gray-500 mt-1">What services do you offer?</p>
            </div>

            <div className="space-y-3">
              {SERVICE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => updateForm('serviceCategory', category.name)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    formData.serviceCategory === category.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
                  </div>
                  <span className="font-semibold text-gray-900 flex-1 text-left">{category.name}</span>
                  {formData.serviceCategory === category.name ? (
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );


      case 8: // About Service with Pricing (like mobile)
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">About Your Service</h2>
              <p className="text-gray-500 mt-1">Tell us about your experience and set your pricing</p>
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <input
                type="text"
                value={formData.yearsExperience}
                onChange={(e) => updateForm('yearsExperience', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 3 years"
              />
            </div>

            {/* About/Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                About Your Service <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.aboutService}
                onChange={(e) => updateForm('aboutService', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe your experience, skills, and services..."
              />
              <p className={`text-sm mt-1 text-right ${formData.aboutService.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                {formData.aboutService.length} / 10 minimum
              </p>
            </div>

            {/* Pricing Section */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Set Your Pricing <span className="text-red-500">*</span>
              </label>
              
              {/* Price Type Selection */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => updateForm('priceType', 'per_job')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                    formData.priceType === 'per_job'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Per Job
                </button>
                <button
                  type="button"
                  onClick={() => updateForm('priceType', 'per_hire')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                    formData.priceType === 'per_hire'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Per Hire
                </button>
              </div>

              {/* Price Input */}
              <div className="flex items-center bg-gray-50 rounded-xl px-4">
                <span className="text-xl font-bold text-gray-900">₱</span>
                <input
                  type="number"
                  value={formData.fixedPrice}
                  onChange={(e) => updateForm('fixedPrice', e.target.value)}
                  className="flex-1 px-3 py-4 bg-transparent text-xl font-semibold text-gray-900 focus:outline-none"
                  placeholder="0.00"
                />
                <span className="text-gray-500">
                  / {formData.priceType === 'per_job' ? 'job' : 'hire'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formData.priceType === 'per_job' 
                  ? 'This is the fixed price you charge for completing a job'
                  : 'This is the fixed price you charge each time you are hired'
                }
              </p>

              {/* Fee Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4 flex gap-3">
                <span className="text-yellow-600">ℹ️</span>
                <p className="text-sm text-yellow-800">
                  Note: Clients will be charged an additional 5% service fee on top of your price. 
                  You will receive the full amount you set here.
                </p>
              </div>
            </div>
          </div>
        );

      case 9: // Documents Upload
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
              <p className="text-gray-500 mt-1">Please provide the required documents for verification</p>
            </div>

            {/* ID Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type of Valid ID <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.idType}
                onChange={(e) => updateForm('idType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select ID Type</option>
                {ID_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Valid ID Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid ID <span className="text-red-500">*</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                formData.validIdUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}>
                {uploadingDoc === 'validIdUrl' ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : formData.validIdUrl ? (
                  <>
                    <img src={formData.validIdUrl} alt="Valid ID" className="w-48 h-28 object-cover rounded-lg mb-2" />
                    <span className="text-green-600 text-sm font-medium">✓ ID Uploaded (tap to change)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-gray-500 text-sm">Upload photo of your ID</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocumentUpload(e, 'validIdUrl')} />
              </label>
            </div>

            {/* Barangay Clearance Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barangay Clearance <span className="text-red-500">*</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                formData.barangayClearanceUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}>
                {uploadingDoc === 'barangayClearanceUrl' ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : formData.barangayClearanceUrl ? (
                  <>
                    <img src={formData.barangayClearanceUrl} alt="Barangay Clearance" className="w-48 h-28 object-cover rounded-lg mb-2" />
                    <span className="text-green-600 text-sm font-medium">✓ Barangay Clearance Uploaded</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-gray-500 text-sm">Upload Barangay Clearance</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocumentUpload(e, 'barangayClearanceUrl')} />
              </label>
            </div>

            {/* Police Clearance Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Police Clearance <span className="text-red-500">*</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                formData.policeClearanceUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}>
                {uploadingDoc === 'policeClearanceUrl' ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : formData.policeClearanceUrl ? (
                  <>
                    <img src={formData.policeClearanceUrl} alt="Police Clearance" className="w-48 h-28 object-cover rounded-lg mb-2" />
                    <span className="text-green-600 text-sm font-medium">✓ Police Clearance Uploaded</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-gray-500 text-sm">Upload Police Clearance</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocumentUpload(e, 'policeClearanceUrl')} />
              </label>
            </div>

            {/* Selfie Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selfie for Verification <span className="text-red-500">*</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                formData.selfieUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}>
                {uploadingDoc === 'selfieUrl' ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : formData.selfieUrl ? (
                  <>
                    <img src={formData.selfieUrl} alt="Selfie" className="w-28 h-28 object-cover rounded-full mb-2" />
                    <span className="text-green-600 text-sm font-medium">✓ Selfie Uploaded</span>
                  </>
                ) : (
                  <>
                    <User className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-gray-500 text-sm">Upload a selfie photo</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocumentUpload(e, 'selfieUrl')} />
              </label>
            </div>

            <p className="text-xs text-gray-400 text-center">* Required documents for verification</p>
          </div>
        );

      case 10: // Success - Pending Approval
        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-yellow-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 mb-4">Your provider application is pending approval.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
              <p className="text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 inline text-green-500 mr-2" />
                Our team will review your application within 24-48 hours.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <CheckCircle className="w-4 h-4 inline text-green-500 mr-2" />
                You&apos;ll receive an email notification once approved.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-600"
            >
              Go to Login
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
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
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
              className="h-full bg-blue-500 transition-all duration-300"
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
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  className="w-5 h-5 mt-0.5 text-blue-500 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-blue-500 font-medium hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-blue-500 font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  . I understand that my data will be processed in accordance with these policies and I consent to background verification.
                </label>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed() || !agreedToTerms}
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>
          )}
        </div>

        {step < TOTAL_STEPS && (
          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500 font-medium hover:underline">
              Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
