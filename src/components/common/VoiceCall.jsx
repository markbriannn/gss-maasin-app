import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  PermissionsAndroid,
  Vibration,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AGORA_APP_ID, API_BASE_URL } from '@env';
import { listenToCall } from '../../services/callService';

// AGORA DISABLED - Voice calling temporarily disabled
let createAgoraRtcEngine, ChannelProfileType, ClientRoleType;
const AGORA_DISABLED = true;
try {
  if (!AGORA_DISABLED) {
    const agoraModule = require('react-native-agora');
    createAgoraRtcEngine = agoraModule.createAgoraRtcEngine;
    ChannelProfileType = agoraModule.ChannelProfileType;
    ClientRoleType = agoraModule.ClientRoleType;
  }
} catch (err) {
  console.warn('[VoiceCall] react-native-agora not available:', err.message);
}

const { width, height } = Dimensions.get('window');

const VoiceCall = ({
  callId,
  channelName,
  isIncoming = false,
  callerName = 'Unknown',
  onEnd,
  onDecline,
  onAnswer,
}) => {
  const [callState, setCallState] = useState('ringing'); // ringing, connecting, active, ended
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const engineRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start vibration for incoming calls
  useEffect(() => {
    if (isIncoming && callState === 'ringing') {
      // Start vibration pattern (repeating)
      Vibration.vibrate([0, 1000, 1000, 1000], true);

      // Pulse animation for the avatar
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Auto-miss after 30 seconds
      const missTimeout = setTimeout(() => {
        Vibration.cancel();
        handleEndCall();
      }, 30000);

      return () => {
        Vibration.cancel();
        pulse.stop();
        clearTimeout(missTimeout);
      };
    }
    
    // Pulse animation for outgoing calls
    if (!isIncoming && (callState === 'ringing' || callState === 'connecting')) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
      };
    }

    // Stop vibration when call becomes active
    if (callState === 'active') {
      Vibration.cancel();
    }
  }, [isIncoming, callState]);

  useEffect(() => {
    // Don't auto-init engine on mount — only init when joining channel
    // For outgoing calls, auto-join
    if (!isIncoming) {
      joinChannel();
    }
    return () => {
      cleanup();
    };
  }, []);

  // Listen to call status changes in Firestore
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = listenToCall(callId, (callData) => {
      console.log('[VoiceCall] Call status changed:', callData.status);
      
      // If call ended remotely, end it locally
      if (callData.status === 'ended' || callData.status === 'declined' || callData.status === 'missed') {
        if (callState !== 'ended') {
          console.log('[VoiceCall] Call ended remotely, cleaning up');
          // Set state to ended first to prevent re-renders
          setCallState('ended');
          // Then cleanup and call onEnd
          cleanup();
          if (onEnd) {
            onEnd();
          }
        }
      }
    });

    return () => unsubscribe();
  }, [callId]);

  useEffect(() => {
    if (callState === 'active') {
      startDurationTimer();
    }
    return () => stopDurationTimer();
  }, [callState]);

  // Request microphone permission on Android
  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'H.E.L.P needs microphone access for voice calls',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('[VoiceCall] Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const initEngine = async () => {
    if (!createAgoraRtcEngine) {
      setError('Voice calling not available on this device');
      return false;
    }

    try {
      const appId = AGORA_APP_ID || 'dfed04451174410bb13b5dcee9bfcb8a';

      if (!appId) {
        console.error('[VoiceCall] No Agora App ID configured');
        setError('Voice call not configured');
        return false;
      }

      // Request permission first
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        setError('Microphone permission denied');
        return false;
      }

      // Create engine
      const engine = createAgoraRtcEngine();
      await engine.initialize({ appId });
      engineRef.current = engine;

      // Enable audio
      await engine.enableAudio();

      // Register event handlers
      engine.registerEventHandler({
        onUserJoined: (connection, remoteUid, elapsed) => {
          console.log('[VoiceCall] User joined:', remoteUid);
          setCallState('active');
        },
        onUserOffline: (connection, remoteUid, reason) => {
          console.log('[VoiceCall] User left:', remoteUid);
          handleEndCall();
        },
        onError: (err, msg) => {
          console.error('[VoiceCall] Agora error:', err, msg);
          setError('Call error occurred');
        },
      });

      return true;
    } catch (err) {
      console.error('[VoiceCall] Failed to initialize Agora:', err);
      setError('Failed to initialize call');
      return false;
    }
  };

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

      // Initialize engine only when needed (lazy init)
      if (!engineRef.current) {
        const success = await initEngine();
        if (!success) {
          handleEndCall();
          return;
        }
      }

      // Get token from backend
      const apiUrl = API_BASE_URL || 'https://gss-maasin-app.onrender.com/api';
      const response = await fetch(`${apiUrl}/agora/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, uid: 0, role: 'publisher' }),
      });

      if (!response.ok) throw new Error('Failed to get token');

      const { token } = await response.json();

      // Set channel profile and client role
      await engineRef.current?.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      await engineRef.current?.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Join channel using v4.x API
      await engineRef.current?.joinChannel(token, channelName, 0, {});

      // Stay in 'ringing' state — only switch to 'active' when remote user joins
      setCallState('ringing');
    } catch (err) {
      console.error('Failed to join channel:', err);
      setError('Failed to connect');
      Alert.alert('Error', 'Failed to connect to call');
      handleEndCall();
    }
  };

  const handleAnswer = async () => {
    Vibration.cancel();
    if (onAnswer) {
      onAnswer();
    }
    await joinChannel();
  };

  const handleDecline = () => {
    Vibration.cancel();
    cleanup();
    // Call onDecline to close the modal
    if (onDecline) {
      onDecline();
    }
  };

  const handleEndCall = () => {
    Vibration.cancel();
    stopDurationTimer();
    setCallState('ended');
    cleanup();
    // Call onEnd immediately to close the modal
    if (onEnd) {
      onEnd();
    }
  };

  const toggleMute = async () => {
    try {
      await engineRef.current?.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  const cleanup = async () => {
    try {
      Vibration.cancel();
      stopDurationTimer();
      if (engineRef.current) {
        await engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming call screen
  if (isIncoming && callState === 'ringing') {
    return (
      <View style={styles.container}>
        <View style={styles.incomingCallContent}>
          {/* Pulsing ring effect */}
          <Animated.View style={[styles.ringEffect, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.2], outputRange: [0.6, 0] }) }]} />
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim.interpolate({ inputRange: [1, 1.2], outputRange: [1, 1.05] }) }] }]}>
            <Icon name="phone-incoming" size={80} color="#fff" />
          </Animated.View>
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callingText}>Incoming call...</Text>
          <Text style={styles.callingSubtext}>📱 Voice Call</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.callButton, styles.declineButton]}
            onPress={handleDecline}
          >
            <Icon name="phone-hangup" size={40} color="#fff" />
            <Text style={styles.buttonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.callButton, styles.answerButton]}
            onPress={handleAnswer}
          >
            <Icon name="phone" size={40} color="#fff" />
            <Text style={styles.buttonText}>Answer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Don't show anything if call has ended
  if (callState === 'ended') {
    return null;
  }

  // Active / Ringing call screen
  if (callState === 'connecting' || callState === 'ringing' || callState === 'active') {
    const isWaitingForAnswer = callState === 'ringing' || callState === 'connecting';
    return (
      <View style={styles.container}>
        <View style={styles.activeCallContent}>
          {isWaitingForAnswer ? (
            // Ringing state — waiting for other person to answer
            <>
              <Animated.View style={[styles.ringEffect, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.2], outputRange: [0.6, 0] }) }]} />
              <View style={styles.avatarContainer}>
                <Icon name="phone-outgoing" size={80} color="#fff" />
              </View>
              <Text style={styles.callerName}>{callerName}</Text>
              <Text style={styles.callingText}>Ringing...</Text>
              <Text style={styles.callingSubtext}>Waiting for answer...</Text>
            </>
          ) : (
            // Active call — connected, showing timer
            <>
              <View style={styles.avatarContainer}>
                <Icon
                  name={isMuted ? "microphone-off" : "microphone"}
                  size={80}
                  color={isMuted ? "#999" : "#fff"}
                />
              </View>
              <Text style={styles.callerName}>{callerName}</Text>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            </>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!isWaitingForAnswer && (
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.mutedButton]}
              onPress={toggleMute}
            >
              <Icon
                name={isMuted ? "microphone-off" : "microphone"}
                size={32}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.callButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Icon name="phone-hangup" size={40} color="#fff" />
            <Text style={styles.buttonText}>{isWaitingForAnswer ? 'Cancel' : 'End Call'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  incomingCallContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCallContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  callerName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  callingText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  callingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  ringEffect: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.6)',
    top: '25%',
  },
  durationText: {
    fontSize: 32,
    fontFamily: 'monospace',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingHorizontal: 40,
  },
  callButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  answerButton: {
    backgroundColor: '#10B981',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.8)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    padding: 16,
    marginHorizontal: 24,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default VoiceCall;
