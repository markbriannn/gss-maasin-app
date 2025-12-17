'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { 
  Shield, 
  MapPin, 
  Star, 
  Clock, 
  Users, 
  Wrench,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Car,
  Home
} from 'lucide-react';

const services = [
  { icon: Zap, name: 'Electrician', color: '#F59E0B' },
  { icon: Droplets, name: 'Plumber', color: '#3B82F6' },
  { icon: Hammer, name: 'Carpenter', color: '#8B5CF6' },
  { icon: Paintbrush, name: 'Painter', color: '#EF4444' },
  { icon: Car, name: 'Mechanic', color: '#10B981' },
  { icon: Home, name: 'Cleaner', color: '#EC4899' },
];

const features = [
  {
    icon: Shield,
    title: 'Verified Providers',
    description: 'All service providers are verified and background-checked for your safety.',
  },
  {
    icon: MapPin,
    title: 'Real-time Tracking',
    description: 'Track your service provider in real-time as they come to you.',
  },
  {
    icon: Star,
    title: 'Ratings & Reviews',
    description: 'Read reviews from other customers to find the best providers.',
  },
  {
    icon: Clock,
    title: 'Quick Response',
    description: 'Get connected with available providers within minutes.',
  },
];

export default function LandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect based on role
      const role = user.role?.toUpperCase();
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'PROVIDER') {
        router.push('/provider');
      } else {
        router.push('/client');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#00B14F]">
        <div className="spinner border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">GSS Maasin</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Login
              </Link>
              <Link 
                href="/register" 
                className="bg-[#00B14F] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#009940] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00B14F] to-[#009940] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Find Trusted Service Providers in Maasin City
            </h1>
            <p className="text-xl text-green-100 mb-8">
              Connect with verified electricians, plumbers, carpenters, and more. 
              Book services, track in real-time, and pay securely.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/register?role=client" 
                className="bg-white text-[#00B14F] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Book a Service
              </Link>
              <Link 
                href="/register?role=provider" 
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Become a Provider
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {services.map((service) => (
              <div 
                key={service.name}
                className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div 
                  className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: `${service.color}20` }}
                >
                  <service.icon className="w-7 h-7" style={{ color: service.color }} />
                </div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose GSS Maasin?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-16 h-16 bg-[#00B14F]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-[#00B14F]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#00B14F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-green-100">Service Providers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-green-100">Jobs Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.8</div>
              <div className="text-green-100">Average Rating</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-green-100">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers in Maasin City. 
            Download our mobile app or use the web platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="bg-[#00B14F] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#009940] transition-colors inline-flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">GSS Maasin</span>
              </div>
              <p className="text-gray-400">
                Connecting Maasin City with trusted service providers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Electrician</li>
                <li>Plumber</li>
                <li>Carpenter</li>
                <li>Painter</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Maasin City, Southern Leyte</li>
                <li>support@gssmaasin.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 GSS Maasin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
