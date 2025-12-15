import React from 'react';
import {View, Text, FlatList, Image, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../context/ThemeContext';
import {TierBadge} from './TierDisplay';
import {BadgeList} from './BadgeDisplay';
import {formatPoints} from '../../utils/gamification';

const LeaderboardItem = ({item, rank, isProvider = true}) => {
  const {isDark, theme} = useTheme();
  
  const getRankStyle = () => {
    switch (rank) {
      case 1: return {bg: '#FFD700', icon: 'trophy', color: '#B8860B'};
      case 2: return {bg: '#C0C0C0', icon: 'medal', color: '#6B7280'};
      case 3: return {bg: '#CD7F32', icon: 'medal-outline', color: '#8B4513'};
      default: return {bg: isDark ? theme.colors.border : '#E5E7EB', icon: null, color: isDark ? theme.colors.text : '#374151'};
    }
  };
  
  const rankStyle = getRankStyle();

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: rank <= 3 ? 2 : 1,
      borderColor: rank <= 3 ? rankStyle.bg : (isDark ? theme.colors.border : '#E5E7EB'),
    }}>
      {/* Rank */}
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: rankStyle.bg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        {rankStyle.icon ? (
          <Icon name={rankStyle.icon} size={18} color={rank === 1 ? '#FFFFFF' : rankStyle.color} />
        ) : (
          <Text style={{fontSize: 14, fontWeight: '700', color: rankStyle.color}}>
            {rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: isDark ? theme.colors.border : '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
      }}>
        {item.photoURL ? (
          <Image source={{uri: item.photoURL}} style={{width: 44, height: 44}} />
        ) : (
          <Icon name="person" size={22} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
        )}
      </View>

      {/* Info */}
      <View style={{flex: 1}}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
          <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginRight: 8}} numberOfLines={1}>
            {item.name}
          </Text>
          {item.tier && <TierBadge tier={item.tier} size="small" />}
        </View>
        {isProvider && item.service && (
          <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}} numberOfLines={1}>
            {item.service}
          </Text>
        )}
        {item.badges && item.badges.length > 0 && (
          <View style={{marginTop: 4}}>
            <BadgeList badges={item.badges} maxDisplay={3} size="small" />
          </View>
        )}
      </View>

      {/* Points & Rating */}
      <View style={{alignItems: 'flex-end'}}>
        <Text style={{fontSize: 16, fontWeight: '700', color: '#00B14F'}}>
          {formatPoints(item.points)}
        </Text>
        <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
          points
        </Text>
        {isProvider && item.rating > 0 && (
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
            <Icon name="star" size={12} color="#F59E0B" />
            <Text style={{fontSize: 11, color: '#F59E0B', marginLeft: 2}}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const Leaderboard = ({data = [], loading = false, isProvider = true, title = 'Leaderboard'}) => {
  const {isDark, theme} = useTheme();

  if (loading) {
    return (
      <View style={{padding: 40, alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#00B14F" />
        <Text style={{marginTop: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
          Loading leaderboard...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={{padding: 40, alignItems: 'center'}}>
        <Icon name="trophy-outline" size={48} color={isDark ? theme.colors.border : '#D1D5DB'} />
        <Text style={{marginTop: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', textAlign: 'center'}}>
          No leaderboard data yet
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Header */}
      <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12}}>
        <Icon name="trophy" size={20} color="#F59E0B" />
        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 8}}>
          {title}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({item, index}) => (
          <LeaderboardItem item={item} rank={index + 1} isProvider={isProvider} />
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

export default Leaderboard;
