# Backend API Starter Guide

## 🎯 Quick Backend Setup Options

### Option 1: Node.js + Express + MongoDB (Recommended)

#### 1. Create Backend Project
```bash
mkdir gss-maasin-backend
cd gss-maasin-backend
npm init -y
```

#### 2. Install Dependencies
```bash
npm install express mongoose dotenv bcryptjs jsonwebtoken cors express-validator multer socket.io
npm install nodemailer twilio firebase-admin @google-cloud/storage
npm install -D nodemon
```

#### 3. Basic Server Structure
```
gss-maasin-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── firebase.js
│   │   └── storage.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── providerController.js
│   │   ├── jobController.js
│   │   └── adminController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Provider.js
│   │   ├── Job.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   └── Review.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── providerRoutes.js
│   │   ├── jobRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── validationMiddleware.js
│   ├── socket/
│   │   ├── socketHandler.js
│   │   └── socketEvents.js
│   ├── services/
│   │   ├── emailService.js
│   │   ├── smsService.js
│   │   ├── notificationService.js
│   │   └── paymentService.js
│   └── utils/
│       ├── validators.js
│       ├── helpers.js
│       └── constants.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

#### 4. Sample server.js
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/providers', require('./src/routes/providerRoutes'));
app.use('/api/jobs', require('./src/routes/jobRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Socket.IO
const socketHandler = require('./src/socket/socketHandler');
socketHandler(io);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'GSS Maasin API is running' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

#### 5. Sample .env
```env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/gss-maasin

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Firebase Admin
FIREBASE_PROJECT_ID=gss-maasin-service
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@gss-maasin-service.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Cloud Storage
GCS_BUCKET_NAME=gss-maasin-uploads

# Payment (Optional)
PAYMONGO_SECRET_KEY=your-paymongo-key
```

#### 6. Sample User Model (src/models/User.js)
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  suffix: String,
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  phoneNumber: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true,
    select: false 
  },
  role: { 
    type: String, 
    enum: ['CLIENT', 'PROVIDER', 'ADMIN'],
    default: 'CLIENT'
  },
  barangay: { 
    type: String, 
    required: true 
  },
  profilePhoto: String,
  phoneVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerified: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  fcmToken: String,
  lastLogin: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

#### 7. Sample Auth Controller (src/controllers/authController.js)
```javascript
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Register Client
exports.registerClient = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, barangay } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      barangay,
      role: 'CLIENT'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          barangay: user.barangay
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          barangay: user.barangay,
          profilePhoto: user.profilePhoto
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};
```

#### 8. Sample Auth Middleware (src/middleware/authMiddleware.js)
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};
```

#### 9. Sample Socket Handler (src/socket/socketHandler.js)
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const connectedUsers = new Map();

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error'));
      }

      socket.userId = user._id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);
    
    connectedUsers.set(socket.userId.toString(), socket.id);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Handle provider location updates
    socket.on('update_location', async (data) => {
      if (socket.userRole === 'PROVIDER') {
        // Broadcast to admin and relevant clients
        io.to('admin').emit('location_update', {
          providerId: socket.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date()
        });
      }
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      const { recipientId, message, jobId } = data;
      
      // Emit to recipient
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_message', {
          senderId: socket.userId,
          message,
          jobId,
          timestamp: new Date()
        });
      }
    });

    // Handle job updates
    socket.on('join_job', (jobId) => {
      socket.join(`job:${jobId}`);
    });

    socket.on('leave_job', (jobId) => {
      socket.leave(`job:${jobId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId.toString());
    });
  });
};
```

### Option 2: Firebase (Serverless)

Use Firebase Functions + Firestore for a fully serverless backend:

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### Option 3: NestJS (Enterprise)

For larger scale with TypeScript:

```bash
npm i -g @nestjs/cli
nest new gss-maasin-backend
```

---

## 🗄️ MongoDB Schema Examples

### Barangays Collection
```javascript
// Pre-populate with all 70 Maasin City barangays
const barangays = [
  "Abgao", "Acasia", "Asuncion", "Baliw", "Basak", "Bato",
  "Baugo", "Bogo", "Cabadiangan", "Cabangcalan", "Cambaye",
  "Candavid", "Canturing", "Combado", "Dagsa", "Dawahon",
  "Ibarra", "Ichon", "Isagani", "Laboon", "Lanao", "Libas",
  "Liberty", "Luy-a", "Mabicay", "Mainit", "Malibago", "Mambajao",
  "Mambajao-Talisay", "Mantahan", "Mawacat", "Monte", "Nava", "Nonok",
  "Pani-an", "Panguiao", "Pasanon", "Pinagawanan", "Poblacion",
  "Pook", "Santa Cruz", "Santa Rosa", "Santo Niño", "Santa Paz",
  "Sib-ayon", "Tagnipa", "Tamayo", "Tawid", "Tawiogan",
  "Tigbawan", "Tomoy-tomoy", "Tunga-tunga", "Upper Santa Cruz",
  // ... (Add all 70 barangays as per constants.js)
];
```

---

## 📱 API Testing with Postman

Create Postman collection with these requests:

1. **Register Client** - POST http://localhost:3000/api/auth/register/client
2. **Login** - POST http://localhost:3000/api/auth/login
3. **Get Profile** - GET http://localhost:3000/api/users/me (with Bearer token)
4. **Get Nearby Providers** - GET http://localhost:3000/api/providers/nearby?lat=10.1302&lng=124.8462
5. **Create Job** - POST http://localhost:3000/api/jobs (with Bearer token)

---

## 🚀 Deployment Options

1. **Heroku** - Free tier available, easy deployment
2. **Railway** - Modern alternative to Heroku
3. **DigitalOcean** - $5/month droplet
4. **AWS EC2** - Scalable, more complex
5. **Render** - Free tier available

---

## 📞 SMS OTP Integration (Twilio)

```javascript
const twilio = require('twilio');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendOTP(phoneNumber, otp) {
  await client.messages.create({
    body: `Your GSS Maasin verification code is: ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
}
```

---

## ✅ Backend Development Checklist

- [ ] Set up Node.js + Express server
- [ ] Connect MongoDB database
- [ ] Implement authentication endpoints
- [ ] Implement provider CRUD operations
- [ ] Implement job management endpoints
- [ ] Set up Socket.IO for real-time features
- [ ] Configure file uploads (Multer + Cloud Storage)
- [ ] Integrate Twilio for SMS OTP
- [ ] Set up Firebase Admin for push notifications
- [ ] Implement payment gateway (PayMongo/PayPal)
- [ ] Add rate limiting and security middleware
- [ ] Write API tests
- [ ] Deploy to production server
- [ ] Configure domain and SSL

---

**Ready to build the backend! The mobile app is waiting. 🚀**
