'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wrench, Users, Shield, Star } from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">About</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Logo & Name */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#00B14F] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">GSS Maasin</h2>
          <p className="text-gray-500 mt-1">General Services System</p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <p className="text-gray-600 leading-relaxed">
            GSS Maasin is a platform connecting service providers with clients in Maasin City, 
            Southern Leyte. Our mission is to make it easy for residents to find reliable, 
            skilled professionals for their home and business needs.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Users className="w-8 h-8 text-[#00B14F] mx-auto mb-2" />
            <p className="font-semibold text-gray-900">Verified Providers</p>
            <p className="text-sm text-gray-500 mt-1">All providers are verified</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Shield className="w-8 h-8 text-[#00B14F] mx-auto mb-2" />
            <p className="font-semibold text-gray-900">Secure Payments</p>
            <p className="text-sm text-gray-500 mt-1">Safe & secure transactions</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Star className="w-8 h-8 text-[#00B14F] mx-auto mb-2" />
            <p className="font-semibold text-gray-900">Rated Services</p>
            <p className="text-sm text-gray-500 mt-1">Reviews from real clients</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Wrench className="w-8 h-8 text-[#00B14F] mx-auto mb-2" />
            <p className="font-semibold text-gray-900">Many Services</p>
            <p className="text-sm text-gray-500 mt-1">Wide range of categories</p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Email:</span> support@gssmaasin.com
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Phone:</span> +63 912 345 6789
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Address:</span> Maasin City, Southern Leyte, Philippines
            </p>
          </div>
        </div>

        {/* Version */}
        <div className="text-center text-gray-500 text-sm">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
