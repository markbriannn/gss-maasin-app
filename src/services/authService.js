import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import {auth, db} from '../config/firebase';
import {uploadDocument as uploadToCloudinary} from './imageUploadService';
import authNative from '@react-native-firebase/auth';

const getProfile = async (uid) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const authService = {
  // Fetch profile from Firestore by uid
  getProfileByUid: async (uid) => {
    if (!uid) return null;
    return await getProfile(uid);
  },
  // Email/password login against Firebase Auth + Firestore profile
  login: async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdToken();
    const profile = await getProfile(credential.user.uid);
    
    // Block providers whose account is still pending approval
    if (profile?.status === 'pending') {
      throw new Error('Your provider account is pending admin approval.');
    }
    
    // Block suspended accounts and include the reason
    if (profile?.status === 'suspended') {
      const suspensionReason = profile?.suspensionReason || 'Your account has been suspended.';
      const suspensionLabel = profile?.suspensionReasonLabel || 'Account Suspended';
      const suspendedAt = profile?.suspendedAt?.toDate?.() 
        ? profile.suspendedAt.toDate().toLocaleDateString() 
        : 'Unknown date';
      
      const error = new Error('ACCOUNT_SUSPENDED');
      error.suspensionDetails = {
        reason: suspensionReason,
        label: suspensionLabel,
        suspendedAt: suspendedAt,
      };
      throw error;
    }
    
    // Backfill missing provider role for older records (non-pending)
    let resolvedRole = profile?.role;
    if (!resolvedRole && profile) {
      if (profile.status === 'approved') {
        resolvedRole = 'PROVIDER';
        try {
          await updateDoc(doc(db, 'users', credential.user.uid), {role: resolvedRole});
        } catch (err) {
          console.warn('Could not backfill role for approved provider:', err?.message);
        }
      }
    }
    const user = {
      uid: credential.user.uid,
      email: credential.user.email,
      role: resolvedRole || 'CLIENT',
      ...profile,
    };
    return {token, user};
  },

  // Generic register (used by AuthContext) - defaults to CLIENT role
  register: async (userData = {}) => {
    const {email, password, role = 'CLIENT', ...rest} = userData;
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      email,
      role,
      ...rest,
      createdAt: serverTimestamp(),
    };
    // Remove any undefined fields - Firestore rejects undefined values
    Object.keys(profile).forEach((key) => {
      if (typeof profile[key] === 'undefined') delete profile[key];
    });

    await setDoc(doc(db, 'users', credential.user.uid), profile);
    const token = await credential.user.getIdToken();
    return {
      token,
      user: {
        uid: credential.user.uid,
        ...profile,
      },
    };
  },

  // Register Client explicitly
  registerClient: async (userData = {}) => {
    return authService.register({...userData, role: 'CLIENT'});
  },

  // Upload a document image to Cloudinary
  uploadDocument: async (userId, docType, imageUri) => {
    if (!imageUri) return null;
    try {
      console.log(`[authService] Uploading ${docType} for user ${userId}`);
      const downloadUrl = await uploadToCloudinary(imageUri, userId);
      console.log(`[authService] Successfully uploaded ${docType}:`, downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      return null;
    }
  },

  // Register Provider with document uploads
  registerProvider: async (userData = {}, documents = {}) => {
    const {email, password, ...rest} = userData;
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = credential.user.uid;
    
    // Upload documents to Firebase Storage
    const validIdUrl = await authService.uploadDocument(userId, 'validId', documents?.validId?.uri);
    const selfieUrl = await authService.uploadDocument(userId, 'selfie', documents?.selfie?.uri);
    const barangayClearanceUrl = await authService.uploadDocument(userId, 'barangayClearance', documents?.barangayClearance?.uri);
    const policeClearanceUrl = await authService.uploadDocument(userId, 'policeClearance', documents?.policeClearance?.uri);
    
    // Upload certifications if any
    const certificationUrls = [];
    if (Array.isArray(documents?.certifications)) {
      for (let i = 0; i < documents.certifications.length; i++) {
        const url = await authService.uploadDocument(userId, `certification_${i}`, documents.certifications[i]?.uri);
        if (url) certificationUrls.push(url);
      }
    }
    
    const profile = {
      email,
      role: 'PROVIDER',
      ...rest,
      documents: {
        governmentId: documents?.validId?.fileName || null,
        governmentIdUrl: validIdUrl,
        selfie: documents?.selfie?.fileName || null,
        selfieUrl: selfieUrl,
        barangayClearance: documents?.barangayClearance?.fileName || null,
        barangayClearanceUrl: barangayClearanceUrl,
        policeClearance: documents?.policeClearance?.fileName || null,
        policeClearanceUrl: policeClearanceUrl,
        certificates: Array.isArray(documents?.certifications)
          ? documents.certifications.map((c) => c?.fileName).filter(Boolean)
          : [],
        certificateUrls: certificationUrls,
      },
      createdAt: serverTimestamp(),
    };
    
    // Remove undefined fields
    Object.keys(profile).forEach((key) => {
      if (typeof profile[key] === 'undefined') delete profile[key];
    });

    await setDoc(doc(db, 'users', userId), profile);
    const token = await credential.user.getIdToken();
    return {
      token,
      user: {
        uid: userId,
        ...profile,
      },
    };
  },

  // Forgot Password
  forgotPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
    return {success: true};
  },

  // Logout
  logout: async () => {
    await signOut(auth);
    return {success: true};
  },

  // Refresh token
  refreshToken: async () => {
    if (!auth.currentUser) throw new Error('No active session');
    const token = await auth.currentUser.getIdToken(true);
    const profile = await getProfile(auth.currentUser.uid);
    return {token, user: {uid: auth.currentUser.uid, email: auth.currentUser.email, ...profile}};
  },

  // Check Email Availability (true means available)
  checkEmailAvailability: async (email) => {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    return {available: snap.empty};
  },

  // Email verification
  sendEmailVerification: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    await sendEmailVerification(user);
    return {success: true};
  },

  checkEmailVerified: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    await reload(user);
    return {verified: user.emailVerified};
  },

  // Phone OTP (uses native Firebase Auth for RN)
  startPhoneOTP: async (phoneNumber) => {
    if (!phoneNumber) throw new Error('Phone number is required');
    const confirmation = await authNative().signInWithPhoneNumber(phoneNumber);
    // Caller must keep the confirmation object to confirm the code.
    return confirmation;
  },

  verifyPhoneOTP: async (confirmation, code) => {
    if (!confirmation || !code) {
      throw new Error('Confirmation and code are required');
    }
    const credential = await confirmation.confirm(code);
    const token = await credential.user.getIdToken();
    const profile = await getProfile(credential.user.uid);
    const user = {
      uid: credential.user.uid,
      phoneNumber: credential.user.phoneNumber,
      role: profile?.role || 'CLIENT',
      ...profile,
    };
    return {token, user};
  },

  // Phone checks / OTP not implemented in Firebase Auth email/password setup
  verifyOTP: async () => {
    throw new Error('OTP verification not implemented with Firebase email/password');
  },
  resendOTP: async () => {
    throw new Error('OTP resend not implemented with Firebase email/password');
  },

  // Password reset via token is handled by Firebase-hosted emails; expose forgotPassword instead
  resetPassword: async () => {
    throw new Error('Use forgotPassword to send a reset email');
  },
};
