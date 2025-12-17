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
  phoneNumber?: string;
  serviceCategory?: string;
  status?: string;
  providerStatus?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
              phoneNumber: userData.phoneNumber,
              serviceCategory: userData.serviceCategory,
              status: userData.status,
              providerStatus: userData.providerStatus,
              rating: userData.rating || userData.averageRating || 0,
              reviewCount: userData.reviewCount || 0,
              completedJobs: userData.completedJobs || 0,
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

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
