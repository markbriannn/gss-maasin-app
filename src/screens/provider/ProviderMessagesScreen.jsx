import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Swipeable} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {subscribeToConversations, deleteConversation, archiveConversation, unarchiveConversation} from '../../services/messageService';

const ProviderMessagesScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToConversations(user.uid, (updatedConversations) => {
      // Filter out deleted conversations
      const nonDeleted = updatedConversations.filter(c => !c.deleted?.[user.uid]);
      // Separate active and archived
      const active = nonDeleted.filter(c => !c.archived?.[user.uid]);
      const archived = nonDeleted.filter(c => c.archived?.[user.uid]);
      setConversations(active);
      setArchivedConversations(archived);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDelete = (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
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
      ]
    );
  };

  const handleArchive = async (conversationId) => {
    try {
      await archiveConversation(conversationId, user.uid);
    } catch (error) {
      Alert.alert('Error', 'Failed to archive conversation');
    }
  };

  const handleUnarchive = async (conversationId) => {
    try {
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return '#8B5CF6';
      case 'CLIENT':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const renderRightActions = (progress, dragX, conversationId, isArchived = false) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{flexDirection: 'row', transform: [{translateX}]}}>
        <TouchableOpacity
          style={{
            backgroundColor: isArchived ? '#10B981' : '#F59E0B',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
          }}
          onPress={() => isArchived ? handleUnarchive(conversationId) : handleArchive(conversationId)}>
          <Icon name={isArchived ? 'arrow-undo' : 'archive'} size={24} color="#FFFFFF" />
          <Text style={{color: '#FFFFFF', fontSize: 12, marginTop: 4}}>{isArchived ? 'Restore' : 'Archive'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: '#EF4444',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
          }}
          onPress={() => handleDelete(conversationId)}>
          <Icon name="trash" size={24} color="#FFFFFF" />
          <Text style={{color: '#FFFFFF', fontSize: 12, marginTop: 4}}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderConversation = ({item: conversation, isArchived = false}) => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, conversation.id, isArchived)}
      overshootRight={false}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          padding: 16,
          backgroundColor: conversation.unreadCount > 0 
            ? (isDark ? '#064E3B' : '#F0FDF4') 
            : (isDark ? theme.colors.card : '#FFFFFF'),
          borderBottomWidth: 1,
          borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
        }}
        onPress={() => navigation.navigate('Chat', {
          conversationId: conversation.id,
          recipient: conversation.otherUser,
          jobId: conversation.jobId,
        })}>
        {/* Avatar */}
        <View style={{
          width: 56, 
          height: 56, 
          borderRadius: 28, 
          backgroundColor: getRoleBadgeColor(conversation.otherUser?.role),
          justifyContent: 'center', 
          alignItems: 'center', 
          marginRight: 12
        }}>
          <Text style={{color: '#FFFFFF', fontSize: 18, fontWeight: '600'}}>
            {getInitials(conversation.otherUser?.name)}
          </Text>
        </View>

        <View style={{flex: 1}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <Text style={{
                fontSize: 16, 
                fontWeight: conversation.unreadCount > 0 ? '700' : '600', 
                color: isDark ? theme.colors.text : '#1F2937'
              }}>
                {conversation.otherUser?.name || 'Unknown'}
              </Text>
              {conversation.otherUser?.role && (
                <View style={{
                  marginLeft: 8,
                  backgroundColor: getRoleBadgeColor(conversation.otherUser?.role) + '20',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: getRoleBadgeColor(conversation.otherUser?.role),
                  }}>
                    {conversation.otherUser?.role}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{fontSize: 12, color: conversation.unreadCount > 0 ? '#00B14F' : (isDark ? theme.colors.textSecondary : '#9CA3AF')}}>
              {formatTimestamp(conversation.lastMessageTime)}
            </Text>
          </View>

          {/* Job reference */}
          {conversation.jobId && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
              <Icon name="briefcase-outline" size={12} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              <Text style={{fontSize: 11, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 4}}>
                Job #{conversation.jobId.slice(-6)}
              </Text>
            </View>
          )}

          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text 
              style={{
                fontSize: 14, 
                color: conversation.unreadCount > 0 
                  ? (isDark ? theme.colors.text : '#1F2937') 
                  : (isDark ? theme.colors.textSecondary : '#6B7280'),
                fontWeight: conversation.unreadCount > 0 ? '500' : 'normal',
                flex: 1
              }} 
              numberOfLines={1}>
              {conversation.lastSenderId === user?.uid ? 'You: ' : ''}
              {conversation.lastMessage || 'No messages yet'}
            </Text>
            
            {conversation.unreadCount > 0 && (
              <View style={{
                minWidth: 22, 
                height: 22, 
                borderRadius: 11, 
                backgroundColor: '#00B14F', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginLeft: 8,
                paddingHorizontal: 6,
              }}>
                <Text style={{fontSize: 11, fontWeight: '700', color: '#FFFFFF'}}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
        <View style={{padding: 20, backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB'}}>
          <Text style={[globalStyles.heading2, isDark && {color: theme.colors.text}]}>Messages</Text>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={{marginTop: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedConversations = showArchived ? archivedConversations : conversations;

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={{padding: 20, backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB'}}>
        <Text style={[globalStyles.heading2, isDark && {color: theme.colors.text}]}>Messages</Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 4}}>
          Swipe left for options
        </Text>
      </View>

      {/* Tabs */}
      <View style={{flexDirection: 'row', backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB'}}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: !showArchived ? '#00B14F' : 'transparent',
          }}
          onPress={() => setShowArchived(false)}>
          <Text style={{fontWeight: '600', color: !showArchived ? '#00B14F' : (isDark ? theme.colors.textSecondary : '#6B7280')}}>
            Active ({conversations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: showArchived ? '#F59E0B' : 'transparent',
          }}
          onPress={() => setShowArchived(true)}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Icon name="archive" size={16} color={showArchived ? '#F59E0B' : (isDark ? theme.colors.textSecondary : '#6B7280')} style={{marginRight: 4}} />
            <Text style={{fontWeight: '600', color: showArchived ? '#F59E0B' : (isDark ? theme.colors.textSecondary : '#6B7280')}}>
              Archived ({archivedConversations.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {displayedConversations.length > 0 ? (
        <FlatList
          data={displayedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => renderConversation({item, isArchived: showArchived})}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
          }
        />
      ) : (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80}}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isDark ? theme.colors.border : '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <Icon name={showArchived ? 'archive-outline' : 'chatbubbles-outline'} size={50} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          </View>
          <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
            {showArchived ? 'No archived messages' : 'No messages yet'}
          </Text>
          <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', textAlign: 'center', paddingHorizontal: 40}}>
            {showArchived ? 'Archived conversations will appear here' : 'When clients or admin message you, conversations will appear here'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProviderMessagesScreen;
