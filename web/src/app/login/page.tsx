'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Wrench, Mail, Lock, Eye, EyeOff, ArrowLeft, User, Briefcase, Shield, ChevronRight, Clock, Ban, X } from 'lucide-react';

type Role = 'CLIENT' | 'PROVIDER' | 'ADMIN' | null;

interface SuspensionDetails {
  reason: string;
  label: string;
  suspendedAt: string;
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspensionDetails, setSuspensionDetails] = useState<SuspensionDetails | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, selectedRole || undefined);
      if (result.success) {
        // Small delay to let auth context update with user data
        setTimeout(() => {
          // Check if first time login (show onboarding for client/provider)
          const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
          if (!hasSeenOnboarding && selectedRole !== 'ADMIN') {
            router.push('/onboarding');
          } else {
            // Redirect based on selected role
            if (selectedRole === 'ADMIN') {
              router.push('/admin');
            } else if (selectedRole === 'PROVIDER') {
              router.push('/provider');
            } else {
              router.push('/client');
            }
          }
        }, 100);
      } else {
        // Handle specific error types
        if (result.errorType === 'PENDING_APPROVAL') {
          setShowPendingModal(true);
        } else if (result.errorType === 'ACCOUNT_SUSPENDED' && result.suspensionDetails) {
          setSuspensionDetails(result.suspensionDetails);
          setShowSuspendedModal(true);
        } else if (result.errorType === 'ROLE_MISMATCH') {
          // Show role mismatch error and go back to role selection
          setError(result.error || 'Wrong account type selected.');
          setTimeout(() => {
            setSelectedRole(null);
            setError('');
          }, 3000);
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
        setIsLoading(false);
      }
    } catch {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  // Role Selection Screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/" className="flex justify-center items-center gap-2">
            <div className="w-12 h-12 bg-[#00B14F] rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Choose how you want to sign in
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
          <div className="space-y-4">
            {/* Client Option */}
            <button
              onClick={() => setSelectedRole('CLIENT')}
              className="w-full bg-white p-6 rounded-xl shadow-sm border-2 border-transparent hover:border-[#00B14F] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <User className="w-7 h-7 text-[#00B14F]" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Login as Client</h3>
                  <p className="text-sm text-gray-500">Book services from trusted providers</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00B14F] transition-colors" />
              </div>
            </button>

            {/* Provider Option */}
            <button
              onClick={() => setSelectedRole('PROVIDER')}
              className="w-full bg-white p-6 rounded-xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Briefcase className="w-7 h-7 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Login as Provider</h3>
                  <p className="text-sm text-gray-500">Manage jobs and grow your business</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </button>

            {/* Admin Option */}
            <button
              onClick={() => setSelectedRole('ADMIN')}
              className="w-full bg-white p-6 rounded-xl shadow-sm border-2 border-transparent hover:border-purple-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Shield className="w-7 h-7 text-purple-500" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Login as Admin</h3>
                  <p className="text-sm text-gray-500">Manage platform and users</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </button>
          </div>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-[#00B14F] hover:text-[#009940]">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login Form Screen
  const roleColors = {
    CLIENT: { bg: 'bg-green-100', text: 'text-[#00B14F]', border: 'border-[#00B14F]', button: 'bg-[#00B14F] hover:bg-[#009940]' },
    PROVIDER: { bg: 'bg-blue-100', text: 'text-blue-500', border: 'border-blue-500', button: 'bg-blue-500 hover:bg-blue-600' },
    ADMIN: { bg: 'bg-purple-100', text: 'text-purple-500', border: 'border-purple-500', button: 'bg-purple-500 hover:bg-purple-600' },
  };
  const colors = roleColors[selectedRole];
  const roleLabels = { CLIENT: 'Client', PROVIDER: 'Provider', ADMIN: 'Admin' };
  const roleIcons = { CLIENT: User, PROVIDER: Briefcase, ADMIN: Shield };
  const RoleIcon = roleIcons[selectedRole];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Back to Role Selection */}
      <div className="absolute top-4 left-4">
        <button
          onClick={() => {
            setSelectedRole(null);
            setError('');
            setEmail('');
            setPassword('');
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className={`w-16 h-16 ${colors.bg} rounded-xl flex items-center justify-center`}>
            <RoleIcon className={`w-8 h-8 ${colors.text}`} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          {roleLabels[selectedRole]} Login
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Sign in to your {roleLabels[selectedRole].toLowerCase()} account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${colors.border.replace('border-', 'focus:ring-')} focus:border-transparent`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${colors.border.replace('border-', 'focus:ring-')} focus:border-transparent`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className={`h-4 w-4 ${colors.text} focus:ring-2 border-gray-300 rounded`}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <Link href="/forgot-password" className={`text-sm font-medium ${colors.text} hover:opacity-80`}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {selectedRole !== 'ADMIN' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">New to GSS Maasin?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={selectedRole === 'CLIENT' ? '/register/client' : '/register/provider'}
                  className={`w-full flex justify-center py-3 px-4 border-2 ${colors.border} rounded-lg text-sm font-semibold ${colors.text} hover:bg-opacity-5 transition-colors`}
                >
                  Create {roleLabels[selectedRole]} Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Approval Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h3>
            <p className="text-gray-600 mb-6">
              Your provider account is currently under review. We&apos;ll notify you via email once your account has been approved by our admin team.
            </p>
            <div className="bg-amber-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                This usually takes 1-2 business days. Thank you for your patience!
              </p>
            </div>
            <button
              onClick={() => setShowPendingModal(false)}
              className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Suspended Account Modal */}
      {showSuspendedModal && suspensionDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Ban className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h3>
            {suspensionDetails.suspendedAt && (
              <p className="text-sm text-gray-500 mb-4">
                Suspended on: {suspensionDetails.suspendedAt}
              </p>
            )}
            {suspensionDetails.label && (
              <span className="inline-block bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                {suspensionDetails.label}
              </span>
            )}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-gray-700">
                {suspensionDetails.reason}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Contact: support@gssmaasin.com</span>
            </div>
            <button
              onClick={() => setShowSuspendedModal(false)}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
