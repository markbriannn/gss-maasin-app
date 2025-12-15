/**
 * Network Context
 * Provides network status throughout the app
 */

import React, {createContext, useContext, useState, useEffect} from 'react';
import {View, Text, Animated, StyleSheet} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';

const NetworkContext = createContext({
  isOnline: true,
  isConnected: true,
  connectionType: null,
});

export const useNetwork = () => useContext(NetworkContext);

// Offline Banner Component
const OfflineBanner = ({visible}) => {
  const translateY = React.useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, {transform: [{translateY}]}]}>
      <Icon name="cloud-offline" size={18} color="#FFFFFF" />
      <Text style={styles.bannerText}>You're offline. Some features may be limited.</Text>
    </Animated.View>
  );
};

// Back Online Toast
const BackOnlineToast = ({visible, onHide}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.delay(2000),
        Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, {opacity}]}>
      <Icon name="cloud-done" size={18} color="#FFFFFF" />
      <Text style={styles.toastText}>Back online!</Text>
    </Animated.View>
  );
};

export const NetworkProvider = ({children}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState(null);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = React.useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      
      // Show "back online" toast when coming back online
      if (online && wasOffline.current) {
        setShowBackOnline(true);
      }
      
      wasOffline.current = !online;
      setIsOnline(online);
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
    });

    // Initial check
    NetInfo.fetch().then(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      wasOffline.current = !online;
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{isOnline, isConnected, connectionType}}>
      {children}
      <OfflineBanner visible={!isOnline} />
      <BackOnlineToast 
        visible={showBackOnline} 
        onHide={() => setShowBackOnline(false)} 
      />
    </NetworkContext.Provider>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingTop: 40, // Account for status bar
    zIndex: 9999,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NetworkContext;
