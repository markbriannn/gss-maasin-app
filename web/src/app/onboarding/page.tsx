'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Hand, Users, MapPin, ShieldCheck, Sparkles, Search, Navigation, Star, Rocket, ArrowRight } from 'lucide-react';

const onboardingData = [
  {
    id: 1,
    title: 'Welcome to GSS',
    subtitle: 'Connect with trusted local service providers in Maasin City',
    backgroundColor: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-500',
    Icon: Hand,
    SecondaryIcon: Sparkles,
  },
  {
    id: 2,
    title: 'Browse and Hire',
    subtitle: 'Find electricians, plumbers, carpenters and more. View profiles, ratings and distance',
    backgroundColor: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    Icon: Users,
    SecondaryIcon: Search,
  },
  {
    id: 3,
    title: 'Track in Real-Time',
    subtitle: 'See your provider coming to you on the map. Chat and stay updated',
    backgroundColor: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    Icon: MapPin,
    SecondaryIcon: Navigation,
  },
  {
    id: 4,
    title: 'Safe and Reliable',
    subtitle: 'All providers are verified. Pay securely through the app. Rate and review',
    backgroundColor: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-500',
    Icon: ShieldCheck,
    SecondaryIcon: Star,
  },
];

export default function OnboardingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user has already seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding === 'true') {
      redirectToDashboard();
    }
  }, []);

  useEffect(() => {
    // Trigger animation on slide change
    setIsAnimating(false);
    const timer = setTimeout(() => setIsAnimating(true), 50);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const redirectToDashboard = () => {
    if (user?.role === 'PROVIDER') {
      router.replace('/provider');
    } else {
      router.replace('/client');
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    redirectToDashboard();
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const currentSlide = onboardingData[currentIndex];
  const isLastSlide = currentIndex === onboardingData.length - 1;
  const Icon = currentSlide.Icon;
  const SecondaryIcon = currentSlide.SecondaryIcon;

  return (
    <div className={`min-h-screen ${currentSlide.backgroundColor} transition-colors duration-500 flex flex-col`}>
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Icon Container */}
        <div className={`relative w-48 h-48 ${currentSlide.iconBg} rounded-full flex items-center justify-center mb-12 transition-all duration-500 ${isAnimating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
          {/* Sparkle effects */}
          <div className={`absolute -top-2 -right-2 ${currentSlide.iconColor} animate-pulse`}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div className={`absolute top-8 -left-4 ${currentSlide.iconColor} animate-pulse delay-300`}>
            <Star className="w-5 h-5" />
          </div>
          
          {/* Main Icon */}
          <Icon className={`w-24 h-24 ${currentSlide.iconColor} animate-bounce-slow`} />
          
          {/* Secondary Icon */}
          <div className={`absolute -bottom-2 -right-4 ${currentSlide.iconBg} p-3 rounded-xl shadow-lg`}>
            <SecondaryIcon className={`w-6 h-6 ${currentSlide.iconColor}`} />
          </div>
        </div>

        {/* Text Content */}
        <div className={`text-center max-w-md transition-all duration-500 delay-200 ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {currentSlide.title}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {currentSlide.subtitle}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-12">
        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {onboardingData.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 bg-[#00B14F]'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Next/Get Started Button */}
        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 ${
              isLastSlide
                ? 'bg-[#00B14F] hover:bg-[#009940] shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40'
                : 'bg-[#00B14F] hover:bg-[#009940]'
            }`}
          >
            <span>{isLastSlide ? 'Get Started' : 'Next'}</span>
            {isLastSlide ? (
              <Rocket className="w-5 h-5" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
