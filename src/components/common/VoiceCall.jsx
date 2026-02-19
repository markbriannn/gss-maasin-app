import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AGORA_APP_ID, API_BASE_URL } from '@env';

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

  useEffect(() => {
    initEngine();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callState === 'active') {
      startDurationTimer();
    }
    return () => stopDurationTimer();
  }, [callState]);

  const initEngine = async () => {
    try {
      const appId = AGORA_APP_ID || 'dfed04451174410bb13b5dcee9bfcb8a';
      
      if (!appId) {
        console.error('[VoiceCall] No Agora App ID configured');
        setError('Voice call not configured');
        return;
      }
      
      // Create engine using v4.x API
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

    } catch (err) {
      console.error('[VoiceCall] Failed to initialize Agora:', err);
      setError('Failed to initialize call');
      // Don't crash the app, just show error
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
      
      setCallState('active');
    } catch (err) {
      console.error('Failed to join channel:', err);
      setError('Failed to connect');
      Alert.alert('Error', 'Failed to connect to call');
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
      <Modal visible={true} animationType="slide" statusBarTranslucent>
        <View style={styles.container}>
          <View style={styles.incomingCallContent}>
            <View style={styles.avatarContainer}>
              <Icon name="phone" size={80} color="#fff" />
            </View>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.callingText}>is calling...</Text>
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
      </Modal>
    );
  }

  // Active call screen
  if (callState === 'connecting' || callState === 'active') {
    return (
      <Modal visible={true} animationType="slide" statusBarTranslucent>
        <View style={styles.container}>
          <View style={styles.activeCallContent}>
            <View style={styles.avatarContainer}>
              <Icon 
                name={isMuted ? "microphone-off" : "microphone"} 
                size={80} 
                color={isMuted ? "#999" : "#fff"} 
              />
            </View>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.durationText}>
              {callState === 'connecting' ? 'Connecting...' : formatDuration(duration)}
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.mutedButton]}
              onPress={toggleMute}
              disabled={callState === 'connecting'}
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

            <TouchableOpacity
              style={[styles.callButton, styles.endCallButton]}
              onPress={handleEndCall}
            >
              <Icon name="phone-hangup" size={40} color="#fff" />
              <Text style={styles.buttonText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
