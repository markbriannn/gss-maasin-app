import React, {createContext, useState, useContext, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../services/authService';
import {SyncManager} from '../services/syncManager';
import {isOnline} from '../services/offlineService';

const AuthContext = createContext({});

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkAuthStatus();
    // Auto-sync when app comes online
    setupOnlineSync();
  }, []);

  const setupOnlineSync = () => {
    const interval = setInterval(async () => {
      const online = await isOnline();
      if (online && isAuthenticated) {
        // Sync pending operations
        const result = await SyncManager.syncAll();
        if (result.success && result.synced > 0) {
          console.log(`✅ Synced ${result.synced} pending operations`);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  };

  const setSession = async (token, userData) => {
    const role = (userData?.role || 'CLIENT').toUpperCase();
    console.log('[AuthContext] ========================================');
    console.log('[AuthContext] setSession called');
    console.log('[AuthContext] userData:', JSON.stringify(userData, null, 2));
    console.log('[AuthContext] userData.uid:', userData?.uid);
    console.log('[AuthContext] role:', role);
    console.log('[AuthContext] ========================================');
    
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify({...userData, role}));
    await AsyncStorage.setItem('userRole', role);

    setAuthToken(token);
    setUser({...userData, role});
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataRaw = await AsyncStorage.getItem('userData');
      const storedRole = await AsyncStorage.getItem('userRole');

      console.log('[AuthContext] ========================================');
      console.log('[AuthContext] checkAuthStatus called');
      console.log('[AuthContext] token exists:', !!token);
      console.log('[AuthContext] userDataRaw:', userDataRaw);
      console.log('[AuthContext] storedRole:', storedRole);
      
      if (token && userDataRaw) {
        const parsed = JSON.parse(userDataRaw);
        const role = (storedRole || parsed?.role || 'CLIENT').toUpperCase();

        console.log('[AuthContext] parsed user:', JSON.stringify(parsed, null, 2));
        console.log('[AuthContext] parsed.uid:', parsed?.uid);
        console.log('[AuthContext] final role:', role);
        console.log('[AuthContext] ========================================');

        setAuthToken(token);
        setUser({...parsed, role});
        setUserRole(role);
        setIsAuthenticated(true);
      } else {
        console.log('[AuthContext] No token or userData found');
        console.log('[AuthContext] ========================================');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password, expectedRole = null) => {
    try {
      const response = await authService.login(email, password);

      // Validate role if expectedRole is provided
      if (expectedRole) {
        const userRole = (response.user?.role || 'CLIENT').toUpperCase();
        const expected = expectedRole.toUpperCase();
        
        if (userRole !== expected) {
          const roleLabels = {
            CLIENT: 'Client',
            PROVIDER: 'Provider',
            ADMIN: 'Admin',
          };
          return {
            success: false,
            error: `This account is registered as a ${roleLabels[userRole] || userRole}. Please select the correct login option.`,
            errorType: 'ROLE_MISMATCH',
            actualRole: userRole,
          };
        }
      }

      await setSession(response.token, response.user);

      return {success: true, user: response.user};
    } catch (error) {
      // Handle suspended account with details
      if (error.message === 'ACCOUNT_SUSPENDED' && error.suspensionDetails) {
        return {
          success: false,
          error: 'ACCOUNT_SUSPENDED',
          suspensionDetails: error.suspensionDetails,
        };
      }
      return {success: false, error: error.message};
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      await setSession(response.token, response.user);

      return {success: true, data: response};
    } catch (error) {
      return {success: false, error: error.message};
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      await AsyncStorage.multiRemove(['authToken', 'userData', 'userRole']);
      setAuthToken(null);
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const updatedUser = {...user, ...updatedData};
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return {success: true};
    } catch (error) {
      return {success: false, error: error.message};
    }
  };

  const value = {
    user,
    userRole,
    isAuthenticated,
    isLoading,
    authToken,
    login,
    register,
    logout,
    updateUser,
    setSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
