'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  Wrench, ArrowLeft, ArrowRight, User, Mail, MapPin, Lock, Briefcase, FileText,
  CheckCircle, Clock, Calendar
} from 'lucide-react';

const TOTAL_STEPS = 9;

const SERVICE_CATEGORIES = [
  'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Mechanic', 'Cleaner',
  'Mason', 'Welder', 'HVAC Technician', 'Landscaper', 'Appliance Repair', 'Locksmith'
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
  barangay: string;
  city: string;
  province: string;
  dateOfBirth: string;
  serviceCategory: string;
  aboutService: string;
  yearsExperience: string;
  hasValidId: boolean;
  hasClearance: boolean;
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
    barangay: '',
    city: 'Maasin City',
    province: 'Southern Leyte',
    dateOfBirth: '',
    serviceCategory: '',
    aboutService: '',
    yearsExperience: '',
    hasValidId: false,
    hasClearance: false,
  });

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.firstName.trim() && formData.lastName.trim();
      case 2:
        return formData.email.trim() && formData.phoneNumber.trim() && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 3:
        return formData.streetAddress.trim() && formData.barangay.trim();
      case 4:
        return formData.password.length >= 6 && formData.password === formData.confirmPassword;
      case 5:
        return formData.dateOfBirth.trim();
      case 6:
        return formData.serviceCategory.trim();
      case 7:
        return formData.aboutService.trim().length >= 20;
      case 8:
        return formData.hasValidId;
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
        barangay: formData.barangay,
        city: formData.city,
        province: formData.province,
        dateOfBirth: formData.dateOfBirth,
        serviceCategory: formData.serviceCategory,
        aboutService: formData.aboutService,
        yearsExperience: formData.yearsExperience,
        role: 'PROVIDER',
        providerStatus: 'pending',
        rating: 0,
        reviewCount: 0,
        completedJobs: 0,
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
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-10 h-10 text-[#00B14F]" />
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Service Location</h2>
              <p className="text-gray-500 mt-1">Where do you provide services?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) => updateForm('streetAddress', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="House/Building No., Street Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.barangay}
                onChange={(e) => updateForm('barangay', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="Enter your barangay"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  type="text"
                  value={formData.province}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Lock className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Secure Your Account</h2>
              <p className="text-gray-500 mt-1">Create a strong password</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => updateForm('password', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateForm('confirmPassword', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="Re-enter your password"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-[#00B14F]" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
              />
              <p className="text-sm text-gray-500 mt-2">You must be at least 18 years old to register as a provider.</p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Service Category</h2>
              <p className="text-gray-500 mt-1">What services do you offer?</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => updateForm('serviceCategory', category)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    formData.serviceCategory === category
                      ? 'border-[#00B14F] bg-green-50 text-[#00B14F]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{category}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">About Your Service</h2>
              <p className="text-gray-500 mt-1">Tell clients about yourself</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <select
                value={formData.yearsExperience}
                onChange={(e) => updateForm('yearsExperience', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
              >
                <option value="">Select experience</option>
                <option value="0-1">Less than 1 year</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                About Your Service <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.aboutService}
                onChange={(e) => updateForm('aboutService', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] resize-none"
                placeholder="Describe your skills, experience, and what makes you stand out..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.aboutService.length}/20 characters minimum
              </p>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-10 h-10 text-[#00B14F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Document Verification</h2>
              <p className="text-gray-500 mt-1">Confirm you have the required documents</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.hasValidId}
                  onChange={(e) => updateForm('hasValidId', e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#00B14F] focus:ring-[#00B14F]"
                />
                <div>
                  <p className="font-medium text-gray-900">Valid Government ID</p>
                  <p className="text-sm text-gray-500">I have a valid government-issued ID (Driver&apos;s License, Passport, etc.)</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.hasClearance}
                  onChange={(e) => updateForm('hasClearance', e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#00B14F] focus:ring-[#00B14F]"
                />
                <div>
                  <p className="font-medium text-gray-900">NBI/Police Clearance</p>
                  <p className="text-sm text-gray-500">I have or can obtain NBI or Police clearance (optional but recommended)</p>
                </div>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You&apos;ll need to upload your documents after registration for verification.
              </p>
            </div>
          </div>
        );

      case 9:
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
              onClick={() => router.push('/provider')}
              className="bg-[#00B14F] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#009940]"
            >
              Go to Dashboard
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
            <div className="mt-8">
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="w-full bg-[#00B14F] text-white py-3 rounded-xl font-semibold hover:bg-[#009940] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting Application...' : 'Submit Application'}
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
