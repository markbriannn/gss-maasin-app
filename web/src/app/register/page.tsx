'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench, User, Briefcase, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
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
              onClick={() => router.push('/register/client')}
              className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-[#00B14F] text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
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
              onClick={() => router.push('/register/provider')}
              className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-[#00B14F] text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
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
