import { db } from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

/**
 * Call Service - Handles voice calling with Agora.io
 * Web version
 */

interface CallData {
  id?: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  bookingId?: string | null;
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  channelName: string;
  startedAt: Timestamp | ReturnType<typeof serverTimestamp>;
  endedAt?: Timestamp | ReturnType<typeof serverTimestamp> | null;
  duration: number;
  adminApproved: boolean;
}

// Initiate a call
export const initiateCall = async (
  callerId: string,
  callerName: string,
  receiverId: string,
  receiverName: string,
  bookingId?: string | null
): Promise<CallData> => {
  try {
    // Check if caller is admin - admins can always call
    const callerDoc = await getDoc(doc(db, 'users', callerId));
    const userData = callerDoc.data();
    const isAdmin = callerDoc.exists() && (
      userData?.role === 'admin' ||
      userData?.role === 'ADMIN' ||
      userData?.role?.toLowerCase() === 'admin'
    );

    console.log('[Call Service] Caller check:', {
      callerId,
      exists: callerDoc.exists(),
      role: userData?.role,
      isAdmin,
    });

    // If not admin, check if booking is admin approved (if bookingId provided)
    if (!isAdmin && bookingId) {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingDoc.exists() || !bookingDoc.data().adminApproved) {
        throw new Error('Booking must be admin approved to make calls');
      }
    }

    // Create call document
    const callData = {
      callerId,
      callerName,
      receiverId,
      receiverName,
      bookingId: bookingId || null,
      status: 'ringing' as const,
      channelName: `call_${Date.now()}`,
      startedAt: serverTimestamp(),
      endedAt: null,
      duration: 0,
      adminApproved: isAdmin || (bookingId ? true : false),
    };

    const callRef = await addDoc(collection(db, 'calls'), callData);

    // Send push notification to receiver so they get notified even if app is closed
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
      await fetch(`${apiUrl}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: receiverId,
          title: `📞 ${callerName} is calling`,
          body: 'Tap to answer the voice call',
          data: {
            type: 'incoming_call',
            callId: callRef.id,
            callerId,
            callerName,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to send call push notification:', err);
    }

    return { id: callRef.id, ...callData, startedAt: Timestamp.now() };
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
};

// Answer a call
export const answerCall = async (callId: string): Promise<boolean> => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'active',
      answeredAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error answering call:', error);
    throw error;
  }
};

// Decline a call
export const declineCall = async (callId: string): Promise<boolean> => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'declined',
      endedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error declining call:', error);
    throw error;
  }
};

// End a call
export const endCall = async (callId: string, duration: number = 0): Promise<boolean> => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: serverTimestamp(),
      duration,
    });
    return true;
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
};

// Mark call as missed
export const missedCall = async (callId: string): Promise<boolean> => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'missed',
      endedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error marking call as missed:', error);
    throw error;
  }
};

// Get active call for user
export const getActiveCall = async (userId: string): Promise<CallData | null> => {
  try {
    const q = query(
      collection(db, 'calls'),
      where('status', 'in', ['ringing', 'active']),
    );

    const snapshot = await getDocs(q);
    const activeCalls = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as CallData))
      .filter(call => call.callerId === userId || call.receiverId === userId);

    return activeCalls.length > 0 ? activeCalls[0] : null;
  } catch (error) {
    console.error('Error getting active call:', error);
    return null;
  }
};

// Listen to call updates
export const listenToCall = (callId: string, callback: (call: CallData) => void) => {
  const callRef = doc(db, 'calls', callId);
  return onSnapshot(callRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as CallData);
    }
  });
};

// Listen to incoming calls for user — only recent ones (ignore stale calls)
export const listenToIncomingCalls = (userId: string, callback: (call: CallData) => void) => {
  // Only listen for calls created in the last 60 seconds
  const recentTime = new Date(Date.now() - 60 * 1000);

  const q = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    where('status', '==', 'ringing'),
    where('startedAt', '>=', recentTime)
  );

  // Clean up any stale ringing calls (older than 60s)
  const cleanupStale = async () => {
    try {
      const staleQ = query(
        collection(db, 'calls'),
        where('receiverId', '==', userId),
        where('status', '==', 'ringing')
      );
      const staleSnap = await getDocs(staleQ);
      const now = Date.now();
      staleSnap.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        const startTime = (data.startedAt as Timestamp)?.toDate?.()?.getTime() || 0;
        if (now - startTime > 60000) {
          await updateDoc(doc(db, 'calls', docSnap.id), {
            status: 'missed',
            endedAt: serverTimestamp(),
          }).catch(() => { });
        }
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  };
  cleanupStale();

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const startTime = (data.startedAt as Timestamp)?.toDate?.()?.getTime() || 0;
        if (Date.now() - startTime < 60000) {
          callback({ id: change.doc.id, ...data } as CallData);
        }
      }
    });
  });
};

// Check if user can call (admin approval check)
export const canMakeCall = async (
  callerId: string,
  receiverId: string,
  bookingId?: string | null
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    // Admin can always call
    const callerDoc = await getDoc(doc(db, 'users', callerId));
    if (callerDoc.exists() && callerDoc.data().role === 'admin') {
      return { allowed: true };
    }

    // If no booking, not allowed
    if (!bookingId) {
      return { allowed: false, reason: 'Booking required for calls' };
    }

    // Check if booking is admin approved
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) {
      return { allowed: false, reason: 'Booking not found' };
    }

    const booking = bookingDoc.data();
    if (!booking.adminApproved) {
      return { allowed: false, reason: 'Booking must be admin approved' };
    }

    // Check if caller and receiver are part of the booking
    const isPartOfBooking =
      booking.clientId === callerId ||
      booking.providerId === callerId ||
      booking.clientId === receiverId ||
      booking.providerId === receiverId;

    if (!isPartOfBooking) {
      return { allowed: false, reason: 'Not part of this booking' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking call permission:', error);
    return { allowed: false, reason: 'Error checking permissions' };
  }
};
