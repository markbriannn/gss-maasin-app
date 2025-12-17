'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Wrench, User, Briefcase, ArrowLeft, Eye, EyeOff } from 'lucide-react';

type Role = 'CLIENT' | 'PROVIDER';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role')?.toUpperCase() as Role || null;
  
  const [step, setStep] = useState<'role' | 'form'>(initialRole ? 'form' : 'role');
  const [role, setRole] = useState<Role | null>(initialRole);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    serviceCategory: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const serviceCategories = [
    'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Mechanic', 'Cleaner',
    'Mason', 'Welder', 'HVAC Technician', 'Landscaper'
  ];

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (role === 'PROVIDER' && !formData.serviceCategory) {
      setError('Please select a service category');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userData: Record<string, unknown> = {
        uid: userCredential.user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        role: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (role === 'PROVIDER') {
        userData.serviceCategory = formData.serviceCategory;
        userData.providerStatus = 'pending';
        userData.rating = 0;
        userData.reviewCount = 0;
        userData.completedJobs = 0;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      if (role === 'PROVIDER') {
        router.push('/provider');
      } else {
        router.push('/client');
      }
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


  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">GSS Maasin</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Join GSS Maasin
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Choose how you want to use the platform
            </p>

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('CLIENT')}
                className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-[#00B14F] text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">I need services</h3>
                    <p className="text-gray-500 mt-1">
                      Book trusted service providers for your home or business
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('PROVIDER')}
                className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-[#00B14F] text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">I provide services</h3>
                    <p className="text-gray-500 mt-1">
                      Join as a service provider and grow your business
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-gray-600 mt-8">
              Already have an account?{' '}
              <Link href="/login" className="text-[#00B14F] font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => setStep('role')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 ${
              role === 'CLIENT' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {role === 'CLIENT' ? (
                <User className="w-8 h-8 text-blue-600" />
              ) : (
                <Briefcase className="w-8 h-8 text-green-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {role === 'CLIENT' ? 'Create Client Account' : 'Become a Provider'}
            </h1>
            <p className="text-gray-600 mt-1">
              {role === 'CLIENT' 
                ? 'Book services from trusted providers' 
                : 'Start earning by offering your services'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                placeholder="+63"
              />
            </div>

            {role === 'PROVIDER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Category
                </label>
                <select
                  required
                  value={formData.serviceCategory}
                  onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                >
                  <option value="">Select a category</option>
                  {serviceCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00B14F] text-white py-3 rounded-lg font-semibold hover:bg-[#009940] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00B14F] font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
