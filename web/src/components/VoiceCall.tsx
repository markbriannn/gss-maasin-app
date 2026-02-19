'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';

// Dynamically import Agora SDK only on client side
let AgoraRTC: any = null;
if (typeof window !== 'undefined') {
  import('agora-rtc-sdk-ng').then(module => {
    AgoraRTC = module.default;
  });
}

interface VoiceCallProps {
  callId: string;
  channelName: string;
  isIncoming?: boolean;
  callerName?: string;
  onEnd: () => void;
  onDecline?: () => void;
  onAnswer?: () => void;
}

export default function VoiceCall({
  callId,
  channelName,
  isIncoming = false,
  callerName = 'Unknown',
  onEnd,
  onDecline,
  onAnswer,
}: VoiceCallProps) {
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'active' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAgoraReady, setIsAgoraReady] = useState(false);
  
  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Wait for Agora SDK to load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkAgora = setInterval(() => {
        if (AgoraRTC) {
          setIsAgoraReady(true);
          clearInterval(checkAgora);
        }
      }, 100);
      
      return () => clearInterval(checkAgora);
    }
  }, []);

  // Initialize Agora client
  useEffect(() => {
    if (!isAgoraReady || !AgoraRTC) return;
    
    const initClient = async () => {
      try {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Handle remote user events
        client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'audio') {
            user.audioTrack?.play();
            setCallState('active');
            startDurationTimer();
          }
        });

        client.on('user-unpublished', (user: any) => {
          console.log('User unpublished:', user.uid);
        });

        client.on('user-left', () => {
          handleEndCall();
        });

        // Auto-join for outgoing calls
        if (!isIncoming) {
          await joinChannel();
        }

      } catch (err) {
        console.error('Failed to initialize Agora client:', err);
        setError('Failed to initialize call');
      }
    };

    initClient();

    return () => {
      cleanup();
    };
  }, [isAgoraReady]);

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const joinChannel = async () => {
    try {
      setCallState('connecting');
      
      // Get token from backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/agora/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, uid: 0, role: 'publisher' }),
      });

      if (!response.ok) throw new Error('Failed to get token');
      
      const { token, appId } = await response.json();

      // Join channel
      await clientRef.current?.join(appId, channelName, token, null);

      // Create and publish local audio track
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      await clientRef.current?.publish([localAudioTrackRef.current]);

      setCallState('active');
      startDurationTimer();
    } catch (err) {
      console.error('Failed to join channel:', err);
      setError('Failed to connect');
      handleEndCall();
    }
  };

  const handleAnswer = async () => {
    if (onAnswer) onAnswer();
    await joinChannel();
  };

  const handleDecline = () => {
    if (onDecline) onDecline();
    cleanup();
  };

  const handleEndCall = () => {
    stopDurationTimer();
    setCallState('ended');
    cleanup();
    onEnd();
  };

  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const cleanup = async () => {
    try {
      stopDurationTimer();
      
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming call screen
  if (isIncoming && callState === 'ringing') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 z-50 flex flex-col items-center justify-center p-6">
        <div className="text-center text-white mb-12">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Phone className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold mb-2">{callerName}</h1>
          <p className="text-2xl opacity-90">is calling...</p>
        </div>

        <div className="flex gap-8">
          <button
            onClick={handleDecline}
            className="w-24 h-24 bg-red-500 hover:bg-red-600 rounded-full flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 shadow-2xl"
          >
            <PhoneOff className="w-10 h-10 mb-1" />
            <span className="text-sm font-semibold">Decline</span>
          </button>

          <button
            onClick={handleAnswer}
            className="w-24 h-24 bg-green-500 hover:bg-green-600 rounded-full flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 shadow-2xl animate-bounce"
          >
            <Phone className="w-10 h-10 mb-1" />
            <span className="text-sm font-semibold">Answer</span>
          </button>
        </div>
      </div>
    );
  }

  // Active call screen
  if (callState === 'connecting' || callState === 'active') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 z-50 flex flex-col items-center justify-center p-6">
        <div className="text-center text-white mb-12">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic className={`w-16 h-16 ${isMuted ? 'opacity-50' : ''}`} />
          </div>
          <h1 className="text-4xl font-bold mb-2">{callerName}</h1>
          <p className="text-3xl font-mono">
            {callState === 'connecting' ? 'Connecting...' : formatDuration(duration)}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-300 text-white px-6 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-8">
          <button
            onClick={toggleMute}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 shadow-xl ${
              isMuted ? 'bg-gray-600' : 'bg-white/20'
            }`}
            disabled={callState === 'connecting'}
          >
            {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            <span className="text-xs mt-1">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={handleEndCall}
            className="w-24 h-24 bg-red-500 hover:bg-red-600 rounded-full flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 shadow-2xl"
          >
            <PhoneOff className="w-10 h-10 mb-1" />
            <span className="text-sm font-semibold">End Call</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
