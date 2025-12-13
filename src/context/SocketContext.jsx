import React, {createContext, useState, useContext, useEffect, useRef} from 'react';
import io from 'socket.io-client';
import {API_CONFIG} from '../config/config';
import {useAuth} from './AuthContext';

const SocketContext = createContext({});

export const SocketProvider = ({children}) => {
  const {authToken, user} = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (authToken && user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [authToken, user]);

  const connectSocket = () => {
    if (socketRef.current?.connected) {
      return;
    }

    const newSocket = io(API_CONFIG.SOCKET_URL, {
      auth: {
        token: authToken,
        userId: user?.id,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for real-time events
    newSocket.on('newMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('notification', (notification) => {
      setNotifications((prev) => [...prev, notification]);
    });

    newSocket.on('locationUpdate', (data) => {
      // Handle location updates for tracking
      console.log('Location update:', data);
    });

    newSocket.on('jobStatusUpdate', (data) => {
      // Handle job status updates
      console.log('Job status update:', data);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  };

  const sendMessage = (conversationId, message) => {
    if (socket?.connected) {
      socket.emit('sendMessage', {
        conversationId,
        message,
        senderId: user?.id,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const updateLocation = (location) => {
    if (socket?.connected && user?.role === 'PROVIDER') {
      socket.emit('updateLocation', {
        userId: user?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const joinJobRoom = (jobId) => {
    if (socket?.connected) {
      socket.emit('joinJobRoom', jobId);
    }
  };

  const leaveJobRoom = (jobId) => {
    if (socket?.connected) {
      socket.emit('leaveJobRoom', jobId);
    }
  };

  const emitTyping = (conversationId, isTyping) => {
    if (socket?.connected) {
      socket.emit('typing', {
        conversationId,
        userId: user?.id,
        isTyping,
      });
    }
  };

  const value = {
    socket,
    isConnected,
    messages,
    notifications,
    sendMessage,
    updateLocation,
    joinJobRoom,
    leaveJobRoom,
    emitTyping,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
