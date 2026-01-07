'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface User {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?: string;
  profilePhoto?: string;
  photo?: string;
  phoneNumber?: string;
  phone?: string;
  serviceCategory?: string;
  status?: string;
  providerStatus?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  barangay?: string;
  streetAddress?: string;
  houseNumber?: string;
  latitude?: number;
  longitude?: number;
  profileSetupComplete?: boolean;
  // Location object (nested)
  location?: {
    barangay?: string;
    streetAddress?: string;
    houseNumber?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  };
  // Provider pricing fields
  fixedPrice?: number;
  hourlyRate?: number;
  priceType?: string;
  // Profile fields
  bio?: string;
  about?: string;
  experience?: string;
  landmark?: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  errorType?: 'PENDING_APPROVAL' | 'ACCOUNT_SUSPENDED' | 'ROLE_MISMATCH';
  suspensionDetails?: {
    reason: string;
    label: string;
    suspendedAt: string;
  };
  actualRole?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, expectedRole?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              profilePhoto: userData.profilePhoto,
              photo: userData.photo,
              phoneNumber: userData.phoneNumber,
              phone: userData.phone,
              serviceCategory: userData.serviceCategory,
              status: userData.status,
              providerStatus: userData.providerStatus,
              rating: userData.rating || userData.averageRating || 0,
              reviewCount: userData.reviewCount || 0,
              completedJobs: userData.completedJobs || 0,
              barangay: userData.barangay || userData.location?.barangay,
              streetAddress: userData.streetAddress || userData.location?.streetAddress,
              houseNumber: userData.houseNumber || userData.location?.houseNumber,
              latitude: userData.latitude || userData.location?.latitude,
              longitude: userData.longitude || userData.location?.longitude,
              location: userData.location,
              fixedPrice: userData.fixedPrice || 0,
              hourlyRate: userData.hourlyRate || 0,
              priceType: userData.priceType || 'per_job',
              bio: userData.bio,
              about: userData.about,
              experience: userData.experience,
              landmark: userData.landmark || userData.location?.landmark,
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, expectedRole?: string): Promise<LoginResult> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user profile from Firestore to check status
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Validate role if expectedRole is provided
        if (expectedRole) {
          const userRole = (userData.role || 'CLIENT').toUpperCase();
          const expected = expectedRole.toUpperCase();
          
          if (userRole !== expected) {
            // Sign out the user since they selected wrong role
            await signOut(auth);
            const roleLabels: Record<string, string> = {
              CLIENT: 'Client',
              PROVIDER: 'Provider',
              ADMIN: 'Admin',
            };
            return {
              success: false,
              error: `This account is registered as a ${roleLabels[userRole] || userRole}. Please select the correct login option.`,
              errorType: 'ROLE_MISMATCH' as const,
              actualRole: userRole,
            };
          }
        }
        
        // Block providers whose account is still pending approval
        if (userData.role === 'PROVIDER' && (userData.status === 'pending' || userData.providerStatus === 'pending')) {
          // Sign out the user since they shouldn't be logged in
          await signOut(auth);
          return { 
            success: false, 
            error: 'Your provider account is pending admin approval. Please wait for approval before logging in.',
            errorType: 'PENDING_APPROVAL' as const
          };
        }
        
        // Block suspended accounts
        if (userData.status === 'suspended' || userData.isSuspended) {
          // Sign out the user since they shouldn't be logged in
          await signOut(auth);
          const suspensionReason = userData.suspensionReason || 'Your account has been suspended. Please contact support for more information.';
          return { 
            success: false, 
            error: suspensionReason,
            errorType: 'ACCOUNT_SUSPENDED' as const,
            suspensionDetails: {
              reason: suspensionReason,
              label: userData.suspensionReasonLabel || 'Account Suspended',
              suspendedAt: userData.suspendedAt?.toDate?.()?.toLocaleDateString() || 'Unknown date',
            }
          };
        }
      }
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
