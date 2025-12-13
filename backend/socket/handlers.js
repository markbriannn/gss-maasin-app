const { getDb } = require('../config/firebase');

const connectedUsers = new Map();

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} registered with socket ${socket.id}`);
      }
    });

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('send-message', async (data) => {
      const { conversationId, senderId, recipientId, message } = data;

      try {
        const db = getDb();
        const messageDoc = await db.collection('messages').add({
          conversationId,
          senderId,
          recipientId,
          text: message,
          read: false,
          createdAt: new Date(),
        });

        await db.collection('conversations').doc(conversationId).update({
          lastMessage: message,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        });

        const messageData = {
          id: messageDoc.id,
          conversationId,
          senderId,
          recipientId,
          text: message,
          createdAt: new Date().toISOString(),
        };

        io.to(conversationId).emit('new-message', messageData);

        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message-notification', {
            conversationId,
            senderId,
            message,
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const { conversationId, userId, isTyping } = data;
      socket.to(conversationId).emit('user-typing', { userId, isTyping });
    });

    socket.on('location-update', async (data) => {
      const { jobId, providerId, latitude, longitude } = data;

      try {
        const db = getDb();
        await db.collection('bookings').doc(jobId).update({
          providerLocation: { latitude, longitude },
          locationUpdatedAt: new Date(),
        });

        io.to(`job-${jobId}`).emit('provider-location', {
          jobId,
          providerId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    socket.on('job-status-update', async (data) => {
      const { jobId, status, updatedBy } = data;

      try {
        io.to(`job-${jobId}`).emit('job-status-changed', {
          jobId,
          status,
          updatedBy,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error broadcasting job status:', error);
      }
    });

    socket.on('provider-online', async (data) => {
      const { providerId, isOnline, latitude, longitude } = data;

      try {
        const db = getDb();
        await db.collection('users').doc(providerId).update({
          isOnline,
          lastLocation: latitude && longitude ? { latitude, longitude } : null,
          lastOnline: new Date(),
        });

        io.emit('provider-status', {
          providerId,
          isOnline,
          latitude,
          longitude,
        });
      } catch (error) {
        console.error('Error updating provider status:', error);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
      console.log('Client disconnected:', socket.id);
    });
  });
};

const notifyUser = (io, userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const notifyRoom = (io, roomId, event, data) => {
  io.to(roomId).emit(event, data);
};

module.exports = {
  setupSocketHandlers,
  notifyUser,
  notifyRoom,
  connectedUsers,
};
