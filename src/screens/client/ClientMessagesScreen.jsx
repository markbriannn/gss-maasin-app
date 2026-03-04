import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../../css/globalStyles';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  subscribeToConversations,
  deleteConversation,
  archiveConversation,
  unarchiveConversation,
  scanAndFixBrokenConversations,
} from '../../services/messageService';

const ClientMessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isDark, theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    scanAndFixBrokenConversations(user.uid).then((fixedCount) => {
      if (fixedCount > 0) {
        console.log('[ClientMessages] Fixed', fixedCount, 'broken conversations');
      }
    });

    const unsubscribe = subscribeToConversations(user.uid, (updatedConversations) => {
      const nonDeleted = updatedConversations.filter((c) => !c.deleted?.[user.uid]);
      const active = nonDeleted.filter((c) => !c.archived?.[user.uid]);
      const archived = nonDeleted.filter((c) => c.archived?.[user.uid]);
      setConversations(active);
      setArchivedConversations(archived);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.uid) {
      const fixedCount = await scanAndFixBrokenConversations(user.uid);
      if (fixedCount > 0) {
        console.log('[ClientMessages] Fixed', fixedCount, 'broken conversations on refresh');
      }
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDelete = (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(conversationId, user.uid);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ],
    );
  };

  const handleArchive = async (conversationId, swipeableRef) => {
    try {
      swipeableRef?.current?.close();
      await archiveConversation(conversationId, user.uid);
    } catch (error) {
      Alert.alert('Error', 'Failed to archive conversation');
    }
  };

  const handleUnarchive = async (conversationId, swipeableRef) => {
    try {
      swipeableRef?.current?.close();
      await unarchiveConversation(conversationId, user.uid);
    } catch (error) {
      Alert.alert('Error', 'Failed to unarchive conversation');
    }
  };

  const formatTimestamp = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderRightActions = (progress, dragX, conversationId, isArchived = false, swipeableRef) => {
    const scale = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1, 0.9, 0.8],
      extrapolate: 'clamp',
    });
    const opacity = dragX.interpolate({
      inputRange: [-160, -40, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ flexDirection: 'row', opacity }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            style={{
              backgroundColor: isArchived ? '#10B981' : '#F59E0B',
              justifyContent: 'center',
              alignItems: 'center',
              width: 80,
              height: '100%',
              borderRadius: 16,
              marginLeft: 4,
            }}
            onPress={() =>
              isArchived ? handleUnarchive(conversationId, swipeableRef) : handleArchive(conversationId, swipeableRef)
            }>
            <Icon name={isArchived ? 'arrow-undo' : 'archive'} size={22} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
              {isArchived ? 'Restore' : 'Archive'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#EF4444',
              justifyContent: 'center',
              alignItems: 'center',
              width: 80,
              height: '100%',
              borderRadius: 16,
              marginLeft: 4,
            }}
            onPress={() => handleDelete(conversationId)}>
            <Icon name="trash" size={22} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11, marginTop: 4, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  const swipeableRefs = useRef({});

  const renderConversation = ({ item: conversation, isArchived = false }) => {
    if (!swipeableRefs.current[conversation.id]) {
      swipeableRefs.current[conversation.id] = React.createRef();
    }
    const swipeableRef = swipeableRefs.current[conversation.id];
    const hasUnread = conversation.unreadCount > 0;

    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(progress, dragX) =>
          renderRightActions(progress, dragX, conversation.id, isArchived, swipeableRef)
        }
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        overshootFriction={8}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            padding: 16,
            marginHorizontal: 16,
            marginVertical: 4,
            backgroundColor: hasUnread
              ? isDark ? '#064E3B' : '#F0FDF4'
              : isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: hasUnread
              ? isDark ? '#065F46' : '#D1FAE5'
              : isDark ? theme.colors.border : '#F3F4F6',
            ...Platform.select({
              ios: {
                shadowColor: hasUnread ? '#00B14F' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: hasUnread ? 0.1 : 0.05,
                shadowRadius: 8,
              },
              android: { elevation: hasUnread ? 4 : 2 },
            }),
          }}
          onPress={() =>
            navigation.navigate('Chat', {
              conversationId: conversation.id,
              recipient: conversation.otherUser,
              jobId: conversation.jobId,
            })
          }>
          {/* Accent bar for unread */}
          {hasUnread && (
            <View style={{
              position: 'absolute',
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              backgroundColor: '#00B14F',
              borderRadius: 2,
            }} />
          )}

          {conversation.otherUser?.profilePhoto ? (
            <Image
              source={{ uri: conversation.otherUser.profilePhoto }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                marginRight: 14,
                backgroundColor: '#E5E7EB',
                borderWidth: hasUnread ? 2 : 0,
                borderColor: '#00B14F',
              }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#00B14F',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
                borderWidth: hasUnread ? 2 : 0,
                borderColor: hasUnread ? '#065F46' : 'transparent',
              }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                {getInitials(conversation.otherUser?.name)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: hasUnread ? '700' : '600',
                    color: isDark ? theme.colors.text : '#111827',
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={1}>
                  {conversation.otherUser?.role === 'ADMIN' ? 'H.E.L.P Support' : (conversation.otherUser?.name || 'Unknown')}
                </Text>
                {conversation.otherUser?.role &&
                  (conversation.otherUser.role === 'ADMIN' ||
                    conversation.otherUser.role === 'PROVIDER') && (
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor:
                          conversation.otherUser.role === 'ADMIN' ? '#8B5CF6' : '#3B82F6',
                      }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                        {conversation.otherUser.role === 'ADMIN' ? 'SUPPORT' : conversation.otherUser.role}
                      </Text>
                    </View>
                  )}
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: hasUnread ? '600' : '400',
                  color: hasUnread
                    ? '#00B14F'
                    : isDark ? theme.colors.textSecondary : '#9CA3AF',
                }}>
                {formatTimestamp(conversation.lastMessageTime)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 14,
                  color: hasUnread
                    ? isDark ? theme.colors.text : '#374151'
                    : isDark ? theme.colors.textSecondary : '#6B7280',
                  fontWeight: hasUnread ? '500' : 'normal',
                  flex: 1,
                  lineHeight: 20,
                }}
                numberOfLines={1}>
                {conversation.lastSenderId === user?.uid ? 'You: ' : ''}
                {conversation.lastMessage || 'No messages yet'}
              </Text>
              {hasUnread && (
                <View
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#00B14F',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 10,
                    paddingHorizontal: 7,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#00B14F',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                      },
                      android: { elevation: 2 },
                    }),
                  }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]}
        edges={['top']}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 24,
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
          }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? theme.colors.text : '#111827', letterSpacing: -0.5 }}>
            Messages
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={{ marginTop: 16, color: isDark ? theme.colors.textSecondary : '#6B7280', fontWeight: '500' }}>
            Loading messages...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedConversations = showArchived ? archivedConversations : conversations;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <SafeAreaView
      style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]}
      edges={['top']}>
      {/* Premium Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 20,
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
          }),
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? theme.colors.text : '#111827', letterSpacing: -0.5 }}>
            Messages
          </Text>
          {totalUnread > 0 && (
            <View style={{
              backgroundColor: '#00B14F',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                {totalUnread} new
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontSize: 14,
            color: isDark ? theme.colors.textSecondary : '#9CA3AF',
          }}>
          Swipe left for options
        </Text>
      </View>

      {/* Pill-style Tabs */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 8,
          backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
          borderRadius: 16,
          padding: 4,
        }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: !showArchived ? '#00B14F' : 'transparent',
            ...(!showArchived && Platform.select({
              ios: {
                shadowColor: '#00B14F',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              },
              android: { elevation: 3 },
            })),
          }}
          onPress={() => setShowArchived(false)}>
          <Text
            style={{
              fontWeight: '700',
              fontSize: 14,
              color: !showArchived ? '#FFFFFF' : isDark ? theme.colors.textSecondary : '#6B7280',
            }}>
            Active ({conversations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: showArchived ? '#F59E0B' : 'transparent',
            flexDirection: 'row',
            justifyContent: 'center',
            ...(showArchived && Platform.select({
              ios: {
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              },
              android: { elevation: 3 },
            })),
          }}
          onPress={() => setShowArchived(true)}>
          <Icon
            name="archive"
            size={16}
            color={showArchived ? '#FFFFFF' : isDark ? theme.colors.textSecondary : '#6B7280'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontWeight: '700',
              fontSize: 14,
              color: showArchived ? '#FFFFFF' : isDark ? theme.colors.textSecondary : '#6B7280',
            }}>
            Archived ({archivedConversations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {displayedConversations.length > 0 ? (
        <FlatList
          data={displayedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderConversation({ item, isArchived: showArchived })}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
          }
        />
      ) : (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isDark ? theme.colors.card : '#F0FDF4',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <Icon
              name={showArchived ? 'archive-outline' : 'chatbubbles-outline'}
              size={36}
              color={showArchived ? '#F59E0B' : '#00B14F'}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: isDark ? theme.colors.text : '#111827',
              marginBottom: 8,
              letterSpacing: -0.3,
            }}>
            {showArchived ? 'No archived messages' : 'No messages yet'}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: isDark ? theme.colors.textSecondary : '#9CA3AF',
              textAlign: 'center',
              lineHeight: 22,
            }}>
            {showArchived
              ? 'Archived conversations will appear here'
              : 'Your conversations will appear here'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ClientMessagesScreen;
