import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {db} from '../../config/firebase';
import {collection, query, where, getDocs, doc, getDoc, deleteDoc} from 'firebase/firestore';

const FavoritesScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const userId = user?.uid || user?.id;
      if (!userId) {
        setFavorites([]);
        return;
      }

      // Fetch favorites from user's favorites subcollection or favorites collection
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(favoritesQuery);
      const favoritesList = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Get provider info
        let providerInfo = null;
        if (data.providerId) {
          try {
            const providerDoc = await getDoc(doc(db, 'users', data.providerId));
            if (providerDoc.exists()) {
              const providerData = providerDoc.data();
              providerInfo = {
                id: docSnap.id,
                providerId: data.providerId,
                name: `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Provider',
                service: providerData.serviceCategory || providerData.category || 'Service Provider',
                rating: providerData.rating || 0,
                totalJobs: providerData.completedJobs || 0,
                image: providerData.profileImage || null,
              };
            }
          } catch (e) {
            console.error('Error fetching provider:', e);
          }
        }
        
        if (providerInfo) {
          favoritesList.push(providerInfo);
        }
      }
      
      setFavorites(favoritesList);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = (id) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this provider from favorites?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'favorites', id));
              setFavorites(favorites.filter(fav => fav.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove from favorites');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 16}}>
          Favorite Providers
        </Text>
      </View>

      <ScrollView style={{flex: 1, padding: 16}}>
        {isLoading ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <ActivityIndicator size="large" color="#00B14F" />
            <Text style={{marginTop: 16, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Loading favorites...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <Icon name="heart-outline" size={64} color={isDark ? theme.colors.border : '#D1D5DB'} />
            <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 16}}>
              No Favorites Yet
            </Text>
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 8, textAlign: 'center'}}>
              Save your favorite providers for quick access
            </Text>
          </View>
        ) : (
          favorites.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
              }}
              onPress={() => navigation.navigate('ProviderProfile', {providerId: item.providerId})}>
              <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? theme.colors.border : '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
                <Icon name="person" size={30} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
              </View>
              <View style={{flex: 1}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                  {item.name}
                </Text>
                <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 2}}>
                  {item.service}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                  <Icon name="star" size={14} color="#FBBF24" />
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.text : '#1F2937', marginLeft: 4}}>
                    {item.rating.toFixed(1)}
                  </Text>
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginLeft: 8}}>
                    • {item.totalJobs} jobs
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemoveFavorite(item.id)}>
                <Icon name="heart" size={24} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FavoritesScreen;
