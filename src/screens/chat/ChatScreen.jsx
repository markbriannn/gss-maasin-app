import React, {useState, useRef, useEffect, useCallback} from 'react';
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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {chatStyles as styles} from '../../css/chatStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {uploadChatImage} from '../../services/imageUploadService';
import {AnimatedMessage} from '../../components/animations';
import {
  getOrCreateConversation,
  sendMessage as sendFirebaseMessage,
  subscribeToMessages,
  markConversationAsRead,
  setTypingStatus,
  subscribeToTypingStatus,
  toggleReaction,
} from '../../services/messageService';
import {attemptMessage} from '../../utils/rateLimiter';

const ChatScreen = ({route, navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const {recipient, jobId, jobTitle, conversationId: existingConversationId} = route.params || {};

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
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Handle image attachment
  const handleAttachment = () => {
    Alert.alert('Send Image', 'Choose an option', [
      {text: 'Take Photo', onPress: handleTakePhoto},
      {text: 'Choose from Gallery', onPress: handleChooseFromGallery},
      {text: 'Cancel', style: 'cancel'},
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
            Animated.timing(dot1Anim, {toValue: 1, duration: 200, useNativeDriver: true}),
          ]),
          Animated.parallel([
            Animated.timing(dot1Anim, {toValue: 0, duration: 200, useNativeDriver: true}),
            Animated.timing(dot2Anim, {toValue: 1, duration: 200, useNativeDriver: true}),
          ]),
          Animated.parallel([
            Animated.timing(dot2Anim, {toValue: 0, duration: 200, useNativeDriver: true}),
            Animated.timing(dot3Anim, {toValue: 1, duration: 200, useNativeDriver: true}),
          ]),
          Animated.timing(dot3Anim, {toValue: 0, duration: 200, useNativeDriver: true}),
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
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(conversationId, (updatedMessages) => {
      setMessages(updatedMessages);
      // Mark as read when viewing
      if (user?.uid) {
        markConversationAsRead(conversationId, user.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, user?.uid]);

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
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
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

  const renderMessage = ({item, index}) => {
    const isMe = item.senderId === user?.uid;
    const showReadReceipt = isMe && index === messages.length - 1;
    const hasImage = item.imageUrl;
    const reactions = item.reactions || [];

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
            {item.senderName || 'User'}
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
              shadowOffset: {width: 0, height: 2},
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
                <Text style={{fontSize: 22}}>{emoji}</Text>
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
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
            overflow: 'visible',
          }}>
          {/* Image */}
          {hasImage && (
            <TouchableOpacity onPress={() => setImagePreview(item.imageUrl)}>
              <Image
                source={{uri: item.imageUrl}}
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
                style={{marginLeft: 4}}
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
                  shadowOffset: {width: 0, height: 1},
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                <Text style={{fontSize: 14}}>{emoji}</Text>
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
          <Text style={{fontSize: 10, color: '#10B981', marginTop: 2, marginRight: 4}}>Read</Text>
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
          shadowOffset: {width: 0, height: 1},
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
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
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
        style={[styles.container, isDark && {backgroundColor: theme.colors.background}]}
        edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={[styles.loadingText, isDark && {color: theme.colors.textSecondary}]}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, isDark && {backgroundColor: theme.colors.background}]}
      edges={['top']}>
      {/* Header */}
      <View
        style={[
          styles.header,
          isDark && {backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border},
        ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>

        {recipient?.profilePhoto ? (
          <Image
            source={{uri: recipient.profilePhoto}}
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
          <Text style={[styles.headerName, isDark && {color: theme.colors.text}]}>
            {recipient?.role?.toUpperCase() === 'ADMIN' ? 'GSS Support' : (recipient?.name || 'User')}
          </Text>
          {recipient?.role ? (
            <Text style={[styles.headerRole, isDark && {color: theme.colors.textSecondary}]}>
              {recipient.role.toUpperCase() === 'ADMIN' ? 'Support Team' : recipient.role.charAt(0) + recipient.role.slice(1).toLowerCase()}
            </Text>
          ) : (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={[styles.onlineText, isDark && {color: theme.colors.textSecondary}]}>
                Online
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.callButton}
          onPress={() => {
            // Could add call functionality here
          }}>
          <Icon name="call-outline" size={22} color="#00B14F" />
        </TouchableOpacity>
      </View>

      {/* Job Context Banner */}
      {jobId && (
        <View style={[styles.jobBanner, isDark && {backgroundColor: '#1E3A8A'}]}>
          <Icon name="briefcase" size={18} color={isDark ? '#93C5FD' : '#3B82F6'} />
          <Text style={[styles.jobBannerText, isDark && {color: '#93C5FD'}]}>
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
        contentContainerStyle={{paddingVertical: 16, flexGrow: 1}}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: true})}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon
              name="chatbubble-ellipses-outline"
              size={50}
              color={isDark ? theme.colors.border : '#D1D5DB'}
            />
            <Text style={[styles.emptyText, isDark && {color: theme.colors.textSecondary}]}>
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
          isDark && {backgroundColor: theme.colors.card, borderTopColor: theme.colors.border},
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 12, paddingVertical: 4}}
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
              style={[styles.quickReplyButton, isDark && {backgroundColor: theme.colors.border}]}
              onPress={() => setMessage(item)}
              activeOpacity={0.7}>
              <Text style={[styles.quickReplyText, isDark && {color: theme.colors.text}]}>
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
            style={{position: 'absolute', top: 50, right: 20, zIndex: 10}}
            onPress={() => setImagePreview(null)}>
            <Icon name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {imagePreview && (
            <Image
              source={{uri: imagePreview}}
              style={{width: '90%', height: '70%'}}
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
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Image
                source={{uri: selectedImage.uri}}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  marginRight: 12,
                }}
                resizeMode="cover"
              />
              <View style={{flex: 1}}>
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
            isDark && {backgroundColor: theme.colors.card, borderTopColor: theme.colors.border},
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

          <View style={[styles.inputWrapper, isDark && {backgroundColor: theme.colors.border}]}>
            <TextInput
              style={[styles.textInput, isDark && {color: theme.colors.text}]}
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
    </SafeAreaView>
  );
};

export default ChatScreen;
