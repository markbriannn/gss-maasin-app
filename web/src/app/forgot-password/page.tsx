'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendPasswordResetCode } from '@/lib/emailjs';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, Loader2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'sent'>('email');
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('No account found with this email address');
        setLoading(false);
        return;
      }

      // Generate and store reset code
      const resetCode = generateCode();
      setGeneratedCode(resetCode);

      // Store code in Firestore with expiry
      await setDoc(doc(db, 'passwordResets', email.toLowerCase()), {
        code: resetCode,
        email: email.toLowerCase(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        used: false,
      });

      // Send email via backend
      const result = await sendPasswordResetCode(email, resetCode);
      
      if (result.success) {
        setStep('sent');
      } else {
        setError('Failed to send reset code. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      setError('Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a password reset code to <span className="font-medium">{email}</span>
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <KeyRound className="w-5 h-5" />
                <span>Your reset code is valid for 10 minutes</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
                className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Try Another Email
              </button>
              <Link
                href="/login"
                className="block w-full py-3 bg-[#00B14F] text-white rounded-xl font-medium hover:bg-[#009940] transition-colors text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/login" className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Enter your email address and we&apos;ll send you a code to reset your password.
          </p>

          <form onSubmit={handleSendCode} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#00B14F] focus:ring-1 focus:ring-[#00B14F] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <p className="text-center text-gray-600 mt-6">
            Remember your password?{' '}
            <Link href="/login" className="text-[#00B14F] font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
