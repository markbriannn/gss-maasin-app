import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
  Alert,
  Modal,
  ScrollView,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { chatStyles as styles } from '../../css/chatStyles';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { uploadChatImage } from '../../services/imageUploadService';
import { AnimatedMessage } from '../../components/animations';
import {
  getOrCreateConversation,
  sendMessage as sendFirebaseMessage,
  subscribeToMessages,
  markConversationAsRead,
  setTypingStatus,
  subscribeToTypingStatus,
  toggleReaction,
} from '../../services/messageService';
import { attemptMessage } from '../../utils/rateLimiter';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import VoiceCall from '../../components/common/VoiceCall';
import { initiateCall, listenToIncomingCalls, answerCall, declineCall, endCall } from '../../services/callService';

const ChatScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { isDark, theme } = useTheme();
  const { recipient, jobId, jobTitle, conversationId: existingConversationId } = route.params || {};

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(existingConversationId || null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // Image to send (preview before sending)
  const [showReactionPicker, setShowReactionPicker] = useState(null); // Message ID for reaction picker
  const [senderNamesCache, setSenderNamesCache] = useState({}); // Cache for fetched sender names
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Voice call state
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState(null); // 'ringing', 'ongoing', 'incoming', null
  const callStartTimeRef = useRef(null);

  // Send a call event message to the chat (like Messenger)
  const sendCallEventMessage = async (callType, durationSeconds = 0) => {
    if (!conversationId || !user?.uid) return;
    try {
      const senderName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : 'User';
      let text = '';
      if (callType === 'completed') {
        const mins = Math.floor(durationSeconds / 60);
        const secs = durationSeconds % 60;
        text = mins > 0 ? `📞 Voice call · ${mins} min ${secs > 0 ? secs + ' sec' : ''}` : `📞 Voice call · ${secs} sec`;
      } else if (callType === 'missed') {
        text = '📞 Missed voice call';
      } else if (callType === 'declined') {
        text = '📞 Declined voice call';
      } else {
        text = '📞 Voice call';
      }
      await sendFirebaseMessage(conversationId, user.uid, text, senderName);
    } catch (err) {
      console.log('Error sending call event message:', err);
    }
  };

  // Start a call
  const handleStartCall = async () => {
    if (!recipient?.id || !user?.uid) {
      Alert.alert('Error', 'Cannot make call right now');
      return;
    }
    try {
      const callerName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : 'User';
      const call = await initiateCall(
        user.uid,
        callerName,
        recipient.id,
        recipient.name || 'User',
        jobId || null
      );
      setActiveCall(call);
      setCallStatus('ringing');
      callStartTimeRef.current = Date.now();
    } catch (err) {
      Alert.alert('Call Failed', err.message || 'Could not start call');
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = listenToIncomingCalls(user.uid, (call) => {
      // Only show if from the current chat recipient
      if (call.callerId === recipient?.id) {
        setIncomingCall(call);
        setCallStatus('incoming');
        Vibration.vibrate([0, 500, 200, 500], true);
      }
    });

    return () => {
      unsubscribe?.();
      Vibration.cancel();
    };
  }, [user?.uid, recipient?.id]);

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Fetch sender name from Firestore users collection
  const fetchSenderName = useCallback(async (senderId) => {
    // Return from cache if available
    if (senderNamesCache[senderId]) {
      return senderNamesCache[senderId];
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', senderId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Check if admin
        if (userData.role?.toUpperCase() === 'ADMIN') {
          setSenderNamesCache(prev => ({ ...prev, [senderId]: 'H.E.L.P Support' }));
          return 'H.E.L.P Support';
        }
        // Build name with fallbacks
        let name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        if (!name) {
          name = userData.displayName || userData.name || userData.email?.split('@')[0] || 'User';
        }
        setSenderNamesCache(prev => ({ ...prev, [senderId]: name }));
        return name;
      }
    } catch (error) {
      console.log('Error fetching sender name:', error);
    }
    return null; // Return null to indicate we should use stored senderName
  }, [senderNamesCache]);

  // Get display name for a message sender
  const getSenderDisplayName = useCallback((item) => {
    // If we have a cached name from Firestore, use it
    if (senderNamesCache[item.senderId]) {
      return senderNamesCache[item.senderId];
    }
    // Otherwise use stored senderName or fallback
    return item.senderName || 'User';
  }, [senderNamesCache]);

  // Handle image attachment
  const handleAttachment = () => {
    Alert.alert('Send Image', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.5,
        maxWidth: 600,
        maxHeight: 600,
      });
      if (result?.assets && result.assets.length > 0) {
        // Set selected image for preview instead of sending immediately
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.5,
        maxWidth: 600,
        maxHeight: 600,
      });
      if (result?.assets && result.assets.length > 0) {
        // Set selected image for preview instead of sending immediately
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  // Typing animation
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Typing dots animation
  useEffect(() => {
    if (otherUserTyping) {
      const animateDots = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot2Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
          Animated.timing(dot3Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          if (otherUserTyping) animateDots();
        });
      };
      animateDots();
    }
  }, [otherUserTyping]);

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        if (existingConversationId) {
          // FIX: Check if current user is in participants, if not add them
          try {
            const convDoc = await getDoc(doc(db, 'conversations', existingConversationId));
            if (convDoc.exists()) {
              const convData = convDoc.data();
              const participants = convData.participants || [];

              if (!participants.includes(user?.uid) && user?.uid) {
                console.log('[Chat Mobile] FIXING broken conversation - adding current user to participants');
                console.log('[Chat Mobile] Old participants:', participants);
                const newParticipants = [...participants, user.uid];
                console.log('[Chat Mobile] New participants:', newParticipants);
                await updateDoc(doc(db, 'conversations', existingConversationId), {
                  participants: newParticipants,
                  [`unreadCount.${user.uid}`]: 0,
                });
              }
            }
          } catch (fixError) {
            console.log('[Chat Mobile] Error fixing conversation:', fixError);
          }

          setConversationId(existingConversationId);
          setLoading(false);
          return;
        }

        if (!recipient?.id || !user?.uid) {
          console.log('Missing recipient or user:', {
            recipientId: recipient?.id,
            userId: user?.uid,
          });
          setLoading(false);
          Alert.alert('Error', 'Unable to start conversation. Recipient information is missing.');
          return;
        }

        // Get or create conversation (pass recipient role for admin conversations)
        const conversation = await getOrCreateConversation(
          user.uid,
          recipient.id,
          jobId || null,
          recipient.role || null, // Pass recipient role to create separate conversations
        );
        setConversationId(conversation.id);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setLoading(false);
      }
    };

    initConversation();
  }, [existingConversationId, recipient?.id, user?.uid, jobId]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId || !user?.uid) return;

    // Pass user.uid to filter messages based on deletedAt timestamp
    const unsubscribe = subscribeToMessages(conversationId, async (updatedMessages) => {
      setMessages(updatedMessages);

      // Fetch real names for messages with "User" as senderName
      const senderIdsToFetch = new Set();
      updatedMessages.forEach(msg => {
        // Fetch name if senderName is "User" or missing, and we don't have it cached
        if ((!msg.senderName || msg.senderName === 'User') && msg.senderId && !senderNamesCache[msg.senderId]) {
          senderIdsToFetch.add(msg.senderId);
        }
      });

      // Fetch names for unknown senders
      if (senderIdsToFetch.size > 0) {
        for (const senderId of senderIdsToFetch) {
          fetchSenderName(senderId);
        }
      }

      // Mark as read when viewing
      if (user?.uid) {
        markConversationAsRead(conversationId, user.uid);
      }
    }, user.uid); // Pass userId to filter messages after deletedAt

    return () => unsubscribe();
  }, [conversationId, user?.uid, fetchSenderName, senderNamesCache]);

  // Subscribe to typing status
  useEffect(() => {
    if (!conversationId || !user?.uid) return;

    const unsubscribe = subscribeToTypingStatus(conversationId, user.uid, (typing) => {
      setOtherUserTyping(typing);
    });

    return () => unsubscribe?.();
  }, [conversationId, user?.uid]);

  // Handle typing indicator
  const handleTextChange = useCallback(
    (text) => {
      setMessage(text);

      if (!conversationId || !user?.uid) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set typing status
      if (text.trim() && !isTyping) {
        setIsTyping(true);
        setTypingStatus(conversationId, user.uid, true);
      }

      // Clear typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingStatus(conversationId, user.uid, false);
      }, 2000);
    },
    [conversationId, user?.uid, isTyping],
  );

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      if (conversationId && user?.uid) {
        setTypingStatus(conversationId, user.uid, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user?.uid]);

  const sendMessage = async () => {
    // Allow sending if there's text OR a selected image
    if ((!message.trim() && !selectedImage) || !conversationId || sending) return;

    // Check rate limit before sending
    const rateLimitCheck = await attemptMessage(user?.uid);
    if (!rateLimitCheck.allowed) {
      Alert.alert('Slow Down', rateLimitCheck.message);
      return;
    }

    const messageText = message.trim();
    const imageToSend = selectedImage;

    setMessage('');
    setSelectedImage(null);
    setSending(true);

    // Clear typing status immediately
    setIsTyping(false);
    if (conversationId && user?.uid) {
      setTypingStatus(conversationId, user.uid, false);
    }

    try {
      const senderName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : 'User';

      // If there's an image, upload and send it
      if (imageToSend) {
        setUploadingImage(true);
        try {
          const downloadUrl = await uploadChatImage(imageToSend.uri, conversationId);
          // Send with optional caption (message text)
          await sendFirebaseMessage(
            conversationId,
            user.uid,
            messageText || '📷 Image',
            senderName,
            downloadUrl,
          );
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
          setSelectedImage(imageToSend); // Restore image if failed
        } finally {
          setUploadingImage(false);
        }
      } else {
        // Text only message
        await sendFirebaseMessage(conversationId, user.uid, messageText, senderName);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText); // Restore message if failed
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = async (messageId, emoji) => {
    if (!conversationId || !user?.uid) return;
    try {
      const userName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : 'User';
      await toggleReaction(conversationId, messageId, user.uid, userName, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
    setShowReactionPicker(null);
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderId === user?.uid;
    const showReadReceipt = isMe && index === messages.length - 1;
    const hasImage = item.imageUrl;
    const reactions = item.reactions || [];
    const isCallEvent = item.text?.startsWith('📞');

    // Render call event message (Messenger-style)
    if (isCallEvent) {
      const isMissed = item.text.includes('Missed') || item.text.includes('Declined');
      return (
        <View style={{ alignItems: 'center', marginVertical: 8, marginHorizontal: 16 }}>
          <View style={{
            backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 12,
            alignItems: 'center',
            minWidth: 200,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isMissed ? '#FEE2E2' : '#D1FAE5',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Icon
                  name={isMissed ? 'call-outline' : 'call-outline'}
                  size={18}
                  color={isMissed ? '#EF4444' : '#10B981'}
                />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937' }}>
                  {isMissed ? (item.text.includes('Missed') ? 'Missed voice call' : 'Declined voice call') : 'Voice call'}
                </Text>
                {!isMissed && item.text.includes('·') && (
                  <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 1 }}>
                    {item.text.split('·')[1]?.trim()}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 2 }}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleStartCall}
              style={{
                marginTop: 10,
                backgroundColor: isDark ? theme.colors.border : '#E5E7EB',
                borderRadius: 20,
                paddingHorizontal: 24,
                paddingVertical: 8,
                width: '100%',
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? theme.colors.text : '#374151' }}>Call again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, r) => {
      acc[r.emoji] = acc[r.emoji] || [];
      acc[r.emoji].push(r.userName);
      return acc;
    }, {});

    return (
      <AnimatedMessage
        isOwn={isMe}
        style={{
          alignItems: isMe ? 'flex-end' : 'flex-start',
          marginVertical: 4,
          marginHorizontal: 16,
        }}>
        {/* Sender name for others */}
        {!isMe && (
          <Text
            style={{
              fontSize: 11,
              color: isDark ? theme.colors.textSecondary : '#6B7280',
              marginBottom: 2,
              marginLeft: 4,
            }}>
            {getSenderDisplayName(item)}
          </Text>
        )}

        {/* Reaction Picker Modal */}
        {showReactionPicker === item.id && (
          <View
            style={{
              position: 'absolute',
              top: -50,
              [isMe ? 'right' : 'left']: 0,
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              borderRadius: 24,
              paddingHorizontal: 8,
              paddingVertical: 6,
              flexDirection: 'row',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
              zIndex: 100,
            }}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleReaction(item.id, emoji)}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => setShowReactionPicker(showReactionPicker === item.id ? null : item.id)}
          onPress={() => showReactionPicker && setShowReactionPicker(null)}
          style={{
            maxWidth: '80%',
            backgroundColor: isMe ? '#00B14F' : isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 20,
            borderTopRightRadius: isMe ? 4 : 20,
            borderTopLeftRadius: isMe ? 20 : 4,
            paddingHorizontal: hasImage ? 4 : 16,
            paddingVertical: hasImage ? 4 : 10,
            paddingBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
            overflow: 'visible',
          }}>
          {/* Image */}
          {hasImage && (
            <TouchableOpacity onPress={() => setImagePreview(item.imageUrl)}>
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 16,
                  marginBottom: 4,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Text (hide if just image placeholder) */}
          {item.text && item.text !== '📷 Image' && (
            <Text
              style={{
                fontSize: 15,
                color: isMe ? '#FFFFFF' : isDark ? theme.colors.text : '#1F2937',
                lineHeight: 20,
                paddingHorizontal: hasImage ? 12 : 0,
              }}>
              {item.text}
            </Text>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 4,
              paddingHorizontal: hasImage ? 8 : 0,
            }}>
            <Text
              style={{
                fontSize: 11,
                color: isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
              }}>
              {formatTime(item.timestamp)}
            </Text>
            {isMe && (
              <Icon
                name={item.read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.read ? '#34D399' : 'rgba(255,255,255,0.5)'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Reactions Display */}
        {Object.keys(groupedReactions).length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              marginTop: 4,
              marginHorizontal: 4,
              flexWrap: 'wrap',
              justifyContent: isMe ? 'flex-end' : 'flex-start',
            }}>
            {Object.entries(groupedReactions).map(([emoji, users]) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleReaction(item.id, emoji)}
                style={{
                  backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
                  borderRadius: 12,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginRight: 4,
                  marginBottom: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? theme.colors.border : '#E5E7EB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                {users.length > 1 && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: isDark ? theme.colors.textSecondary : '#6B7280',
                      marginLeft: 2,
                    }}>
                    {users.length}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Read receipt text for last message */}
        {showReadReceipt && item.read && (
          <Text style={{ fontSize: 10, color: '#10B981', marginTop: 2, marginRight: 4 }}>Read</Text>
        )}
      </AnimatedMessage>
    );
  };

  // Typing indicator component
  const TypingIndicator = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
      }}>
      <View
        style={{
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderRadius: 20,
          borderTopLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}>
        <Text
          style={{
            fontSize: 12,
            color: isDark ? theme.colors.textSecondary : '#6B7280',
            marginRight: 8,
          }}>
          {recipient?.name?.split(' ')[0] || 'User'} is typing
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#9CA3AF',
              marginHorizontal: 2,
              opacity: dot1Anim,
            }}
          />
          <Animated.View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#9CA3AF',
              marginHorizontal: 2,
              opacity: dot2Anim,
            }}
          />
          <Animated.View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#9CA3AF',
              marginHorizontal: 2,
              opacity: dot3Anim,
            }}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, isDark && { backgroundColor: theme.colors.background }]}
        edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={[styles.loadingText, isDark && { color: theme.colors.textSecondary }]}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, isDark && { backgroundColor: theme.colors.background }]}
      edges={['top']}>
      {/* Header */}
      <View
        style={[
          styles.header,
          isDark && { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
        ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>

        {recipient?.profilePhoto ? (
          <Image
            source={{ uri: recipient.profilePhoto }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              marginRight: 12,
              backgroundColor: '#E5E7EB',
            }}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {recipient?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('') || 'U'}
            </Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, isDark && { color: theme.colors.text }]}>
            {recipient?.role?.toUpperCase() === 'ADMIN' ? 'H.E.L.P Support' : (recipient?.name || 'User')}
          </Text>
          {recipient?.role ? (
            <Text style={[styles.headerRole, isDark && { color: theme.colors.textSecondary }]}>
              {recipient.role.toUpperCase() === 'ADMIN' ? 'Support Team' : recipient.role.charAt(0) + recipient.role.slice(1).toLowerCase()}
            </Text>
          ) : (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={[styles.onlineText, isDark && { color: theme.colors.textSecondary }]}>
                Online
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.callButton}
          onPress={handleStartCall}>
          <Icon name="call-outline" size={22} color="#00B14F" />
        </TouchableOpacity>
      </View>

      {/* Call Status Banner - Messenger style */}
      {callStatus && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            // Tapping the banner could show the call UI
          }}
          style={{
            backgroundColor: callStatus === 'incoming' ? '#16A34A' : callStatus === 'ongoing' ? '#00B14F' : '#22C55E',
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          <Icon
            name={callStatus === 'incoming' ? 'videocam' : 'call'}
            size={18}
            color="rgba(255,255,255,0.85)"
          />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' }}>
            {recipient?.name || 'User'} · {callStatus === 'ringing' ? 'Ringing...' : callStatus === 'ongoing' ? 'Ongoing call' : 'Incoming call'}
          </Text>
          {callStatus === 'incoming' && (
            <View style={{ flexDirection: 'row', gap: 12, marginLeft: 'auto' }}>
              <TouchableOpacity
                onPress={async () => {
                  if (incomingCall?.id) {
                    await declineCall(incomingCall.id);
                    setIncomingCall(null);
                    setCallStatus(null);
                    Vibration.cancel();
                  }
                }}
                style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (incomingCall?.id) {
                    await answerCall(incomingCall.id);
                    setActiveCall(incomingCall);
                    setCallStatus('ongoing');
                    setIncomingCall(null);
                    callStartTimeRef.current = Date.now();
                    Vibration.cancel();
                  }
                }}
                style={{
                  backgroundColor: '#FFF',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}>
                <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 12 }}>Answer</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Job Context Banner */}
      {jobId && (
        <View style={[styles.jobBanner, isDark && { backgroundColor: '#1E3A8A' }]}>
          <Icon name="briefcase" size={18} color={isDark ? '#93C5FD' : '#3B82F6'} />
          <Text style={[styles.jobBannerText, isDark && { color: '#93C5FD' }]}>
            Discussing: {jobTitle || `Job #${jobId}`}
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon
              name="chatbubble-ellipses-outline"
              size={50}
              color={isDark ? theme.colors.border : '#D1D5DB'}
            />
            <Text style={[styles.emptyText, isDark && { color: theme.colors.textSecondary }]}>
              Start the conversation
            </Text>
          </View>
        }
        ListFooterComponent={otherUserTyping ? <TypingIndicator /> : null}
      />

      {/* Quick Replies */}
      <View
        style={[
          styles.quickRepliesContainer,
          isDark && { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 4 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          directionalLockEnabled={true}>
          {(user?.role?.toUpperCase() === 'ADMIN'
            ? [
              'Hello! How can I assist you?',
              'Your request is being processed.',
              'Please provide more details.',
              "We'll get back to you shortly.",
              'Thank you for contacting us!',
            ]
            : user?.role?.toUpperCase() === 'PROVIDER'
              ? [
                "Hello! I'm available.",
                'Yes, I have complete tools.',
                'I can start right away.',
                'On my way now!',
                'Job completed. Thank you!',
              ]
              : [
                'Hello! Are you available?',
                'Do you have complete tools?',
                'When can you start?',
                "What's your rate?",
                'Thank you!',
              ]
          ).map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickReplyButton, isDark && { backgroundColor: theme.colors.border }]}
              onPress={() => setMessage(item)}
              activeOpacity={0.7}>
              <Text style={[styles.quickReplyText, isDark && { color: theme.colors.text }]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Image Preview Modal */}
      <Modal visible={!!imagePreview} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
            onPress={() => setImagePreview(null)}>
            <Icon name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {imagePreview && (
            <Image
              source={{ uri: imagePreview }}
              style={{ width: '90%', height: '70%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Input Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Selected Image Preview */}
        {selectedImage && (
          <View
            style={{
              backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: isDark ? theme.colors.border : '#E5E7EB',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  marginRight: 12,
                }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark ? theme.colors.text : '#374151',
                    fontWeight: '500',
                  }}>
                  Image selected
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: isDark ? theme.colors.textSecondary : '#6B7280',
                    marginTop: 2,
                  }}>
                  Add a caption or tap send
                </Text>
              </View>
              <TouchableOpacity
                onPress={clearSelectedImage}
                style={{
                  padding: 8,
                  backgroundColor: '#FEE2E2',
                  borderRadius: 20,
                }}>
                <Icon name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            isDark && { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
          ]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            disabled={uploadingImage || sending}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#00B14F" />
            ) : (
              <Icon name="image-outline" size={26} color="#00B14F" />
            )}
          </TouchableOpacity>

          <View style={[styles.inputWrapper, isDark && { backgroundColor: theme.colors.border }]}>
            <TextInput
              style={[styles.textInput, isDark && { color: theme.colors.text }]}
              placeholder={selectedImage ? 'Add a caption...' : 'Type a message...'}
              placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
              value={message}
              onChangeText={handleTextChange}
              multiline
              editable={!sending && !uploadingImage}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Icon
                name="happy-outline"
                size={22}
                color={isDark ? theme.colors.textSecondary : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (message.trim() || selectedImage) && !sending && !uploadingImage
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
            ]}
            onPress={sendMessage}
            disabled={(!message.trim() && !selectedImage) || sending || uploadingImage}>
            {sending || uploadingImage ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon
                name="send"
                size={20}
                color={message.trim() || selectedImage ? '#FFFFFF' : '#9CA3AF'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Voice Call Overlay */}
      {activeCall && (callStatus === 'ringing' || callStatus === 'ongoing') && (
        <Modal 
          visible={true} 
          transparent={false} 
          animationType="slide"
          statusBarTranslucent
          presentationStyle="fullScreen"
        >
          <VoiceCall
            callId={activeCall.id}
            channelName={activeCall.channelName}
            isIncoming={false}
            callerName={activeCall.callerName || recipient?.name || 'User'}
            onEnd={() => {
              const durationSec = callStartTimeRef.current
                ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
                : 0;
              endCall(activeCall.id, durationSec).catch(() => { });
              if (durationSec > 5) {
                sendCallEventMessage('completed', durationSec);
              } else {
                sendCallEventMessage('missed');
              }
              setActiveCall(null);
              setCallStatus(null);
              callStartTimeRef.current = null;
            }}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default ChatScreen;
