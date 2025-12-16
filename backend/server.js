require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const emailRoutes = require('./routes/email');
const authRoutes = require('./routes/auth');
const { initializeFirebase } = require('./config/firebase');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

initializeFirebase();

app.use(cors());
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Payment redirect pages (for GCash/Maya after payment)
app.get('/payment/success', (req, res) => {
  const { bookingId } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #00B14F 0%, #008F3F 100%); }
        .container { text-align: center; padding: 40px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px; margin: 20px; }
        .icon { font-size: 80px; margin-bottom: 20px; }
        h1 { color: #00B14F; margin-bottom: 10px; }
        p { color: #666; margin-bottom: 30px; }
        .btn { background: #00B14F; color: white; padding: 15px 40px; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your payment has been processed successfully. You can now close this page and return to the app.</p>
        <a href="gss-maasin://payment-success?bookingId=${bookingId || ''}" class="btn">Return to App</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/payment/failed', (req, res) => {
  const { bookingId } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Failed</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); }
        .container { text-align: center; padding: 40px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px; margin: 20px; }
        .icon { font-size: 80px; margin-bottom: 20px; }
        h1 { color: #EF4444; margin-bottom: 10px; }
        p { color: #666; margin-bottom: 30px; }
        .btn { background: #EF4444; color: white; padding: 15px 40px; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h1>Payment Failed</h1>
        <p>Your payment could not be processed. Please return to the app and try again.</p>
        <a href="gss-maasin://payment-failed?bookingId=${bookingId || ''}" class="btn">Return to App</a>
      </div>
    </body>
    </html>
  `);
});

setupSocketHandlers(io);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

module.exports = { app, io };
