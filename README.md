# GSS - Gig Service Solutions
### TaskRabbit and Grab-Style Service Marketplace for Maasin City, Southern Leyte

Complete React Native mobile application for connecting clients with service providers.

---

## 📱 Features
- **Client App**: Browse providers, book services, real-time tracking, payments, reviews
- **Provider App**: Accept jobs, travel tracking, earnings management, online/offline status
- **Admin Dashboard**: Provider verification, job monitoring, real-time location tracking, analytics
- **Google Maps Integration**: Real-time tracking with all 70 barangays of Maasin City
- **Socket.IO**: Real-time chat, notifications, location updates
- **Firebase**: Push notifications and cloud messaging

## 🚀 Tech Stack
- React Native 0.73.2
- React Navigation 6.x
- React Native Maps (Google Maps)
- Socket.IO Client
- Firebase Cloud Messaging
- AsyncStorage & Keychain
- Formik + Yup

**Google Maps API Key**: AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4

---

## 🏗️ Project Structure

```
Project/
├── App.jsx                          # Main app component
├── index.js                         # App entry point
├── package.json                     # Dependencies
├── app.json                         # App configuration
├── .env                            # Environment variables
├── babel.config.js                 # Babel configuration
├── metro.config.js                 # Metro bundler config
├── tailwind.config.js              # Tailwind CSS config
│
├── android/                        # Android native code
│   └── app/
│       └── src/
│           └── main/
│               └── AndroidManifest.xml
│
├── ios/                            # iOS native code
│   └── GSSMaasin/
│       └── Info.plist
│
├── assets/                         # Static assets
│   ├── images/
│   │   ├── icon.png
│   │   ├── splash.png
│   │   ├── logo.png
│   │   └── onboarding/
│   ├── fonts/
│   └── animations/
│
└── src/                            # Source code
    │
    ├── config/                     # Configuration files
    │   ├── config.js              # API, Maps, Firebase config
    │   └── constants.js           # App constants, enums, barangays
    │
    ├── context/                    # React Context providers
    │   ├── AuthContext.jsx        # Authentication state
    │   ├── ThemeContext.jsx       # Theme (light/dark mode)
    │   └── SocketContext.jsx      # Real-time Socket.IO
    │
    ├── navigation/                 # Navigation structure
    │   ├── AppNavigator.jsx       # Main navigator
    │   ├── ClientRegistrationNavigator.jsx
    │   └── ProviderRegistrationNavigator.jsx
    │
    ├── screens/                    # All app screens
    │   │
    │   ├── splash/
    │   │   └── SplashScreen.jsx
    │   │
    │   ├── onboarding/
    │   │   └── OnboardingScreen.jsx
    │   │
    │   ├── auth/
    │   │   ├── LoginScreen.jsx
    │   │   ├── RoleSelectionScreen.jsx
    │   │   ├── ForgotPasswordScreen.jsx
    │   │   └── ResetPasswordScreen.jsx
    │   │
    │   ├── client/                # Client role screens
    │   │   ├── registration/
    │   │   │   ├── PersonalInfoScreen.jsx
    │   │   │   ├── ContactInfoScreen.jsx
    │   │   │   ├── LocationScreen.jsx
    │   │   │   ├── PhoneVerificationScreen.jsx
    │   │   │   ├── PasswordScreen.jsx
    │   │   │   ├── ProfilePhotoScreen.jsx
    │   │   │   └── CompletionScreen.jsx
    │   │   │
    │   │   ├── ClientHomeScreen.jsx
    │   │   ├── ClientBookingsScreen.jsx
    │   │   ├── ClientMessagesScreen.jsx
    │   │   ├── ClientProfileScreen.jsx
    │   │   ├── ProviderProfileScreen.jsx
    │   │   ├── HireProviderScreen.jsx
    │   │   ├── JobDetailsScreen.jsx
    │   │   ├── TrackingScreen.jsx
    │   │   ├── PaymentScreen.jsx
    │   │   └── ReviewScreen.jsx
    │   │
    │   ├── provider/              # Provider role screens
    │   │   ├── registration/
    │   │   │   ├── [Same as client +]
    │   │   │   ├── DateOfBirthScreen.jsx
    │   │   │   ├── ServiceCategoriesScreen.jsx
    │   │   │   ├── AboutServiceScreen.jsx
    │   │   │   ├── DocumentsScreen.jsx
    │   │   │   └── PendingApprovalScreen.jsx
    │   │   │
    │   │   ├── ProviderDashboardScreen.jsx
    │   │   ├── ProviderJobsScreen.jsx
    │   │   ├── ProviderEarningsScreen.jsx
    │   │   ├── ProviderProfileScreen.jsx
    │   │   ├── ProviderJobDetailsScreen.jsx
    │   │   ├── ProviderTrackingScreen.jsx
    │   │   └── WithdrawalScreen.jsx
    │   │
    │   └── admin/                 # Admin role screens
    │       ├── AdminDashboardScreen.jsx
    │       ├── AdminProvidersScreen.jsx
    │       ├── AdminProviderDetailsScreen.jsx
    │       ├── AdminJobsScreen.jsx
    │       ├── AdminJobDetailsScreen.jsx
    │       ├── AdminMapScreen.jsx         # Track all providers
    │       ├── AdminAnalyticsScreen.jsx
    │       └── AdminSettingsScreen.jsx
    │
    ├── components/                 # Reusable components
    │   ├── common/
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Card.jsx
    │   │   ├── Badge.jsx
    │   │   ├── Avatar.jsx
    │   │   ├── Modal.jsx
    │   │   ├── LoadingOverlay.jsx
    │   │   ├── EmptyState.jsx
    │   │   └── ErrorBoundary.jsx
    │   │
    │   ├── map/
    │   │   ├── MapView.jsx
    │   │   ├── ProviderMarker.jsx
    │   │   ├── RoutePolyline.jsx
    │   │   └── LocationPicker.jsx
    │   │
    │   ├── job/
    │   │   ├── JobCard.jsx
    │   │   ├── JobStatusBadge.jsx
    │   │   └── JobTimeline.jsx
    │   │
    │   ├── provider/
    │   │   ├── ProviderCard.jsx
    │   │   ├── ProviderRating.jsx
    │   │   └── ServiceCategoryChip.jsx
    │   │
    │   ├── chat/
    │   │   ├── ChatBubble.jsx
    │   │   ├── ChatInput.jsx
    │   │   └── TypingIndicator.jsx
    │   │
    │   └── payment/
    │       ├── PaymentMethodCard.jsx
    │       └── PaymentSummary.jsx
    │
    ├── css/                        # Styling (separated from JSX)
    │   ├── globalStyles.js
    │   ├── authStyles.js
    │   ├── mapStyles.js
    │   ├── dashboardStyles.js
    │   ├── jobStyles.js
    │   ├── chatStyles.js
    │   ├── profileStyles.js
    │   └── adminStyles.js
    │
    ├── js/                         # JavaScript utilities
    │   ├── validation.js
    │   ├── formatters.js
    │   ├── dateUtils.js
    │   ├── imageUtils.js
    │   └── mapUtils.js
    │
    ├── services/                   # API and external services
    │   ├── api.js                 # Axios instance
    │   ├── authService.js
    │   ├── providerService.js
    │   ├── jobService.js
    │   ├── chatService.js
    │   ├── paymentService.js
    │   ├── notificationService.js
    │   ├── locationService.js
    │   └── uploadService.js
    │
    └── utils/                      # Helper functions
        ├── storage.js             # AsyncStorage helpers
        ├── permissions.js         # Permission handling
        ├── biometric.js           # Biometric auth
        └── errorHandler.js        # Error handling
```

---

## 🎨 Design System

### Color Palette
- **Primary**: #00B14F (Grab Green)
- **Secondary**: #1E3A8A (Deep Blue)
- **Accent**: #F59E0B (Amber)
- **Success**: #10B981
- **Warning**: #F59E0B
- **Danger**: #EF4444
- **Dark**: #1F2937
- **Gray Shades**: 50-900

### Typography
- **Headings**: 700 weight (Bold)
- **Body**: 400-600 weight (Regular-Semibold)
- **Font Sizes**: 12px - 36px
- **Line Heights**: 1.5 - 1.75

---

## 🔑 Key Features by Role

### CLIENT Features
- Browse nearby service providers on interactive map
- Filter by service category and ratings
- View detailed provider profiles with reviews
- Hire providers through structured job request form
- Real-time GPS tracking of provider arrival
- In-app chat communication
- Multiple payment methods (Cash, GCash, Bank Transfer)
- Rate and review completed jobs
- Booking history and status tracking

### PROVIDER Features
- Accept/decline job requests
- Real-time GPS navigation to client location
- Job status management (Traveling → Arrived → Working → Completed)
- Earnings dashboard with analytics
- Withdrawal requests
- Client ratings and reviews
- Verification badge system
- Multi-category service offerings

### ADMIN Features
- Provider application review and approval
- Job request moderation
- **Real-time map showing all active provider locations**
- Analytics dashboard (revenue, jobs, users)
- User management
- Payment and withdrawal approval
- System configuration

---

## 📍 Maasin City Coverage

**All 70 Barangays Supported:**
Abgao, Acasia, Asuncion, Bactul I, Bactul II, Badiang, Bagtican, Basak, Bato I, Bato II, Batuan, Baugo, Bilibol, Bogo, Cabadiangan, Cabulihan, Cagnituan, Cambooc, Cansirong, Canturing, Canyuom, Combado, Dongon, Gawisan, Guadalupe, Hanginan, Hantag, Hinapu Daku, Hinapu Gamay, Ibarra, Isagani (Pugaling), Laboon, Lanao, Libertad, Libhu, Lib-og, Lonoy, Lunas, Mahayahay, Malapoc Norte, Malapoc Sur, Mambajao, Manhilo, Mantahan, Maria Clara, Matin-ao, Nasaug, Nati, Nonok Norte, Nonok Sur, Panan-awan, Pansaan, Pasay, Pinaskohan, Rizal, San Agustin (Lundag), San Isidro, San Jose, San Rafael, Santa Cruz, Santo Niño, Santa Rosa, Santo Rosario, Soro-soro, Tagnipa, Tam-is, Tawid, Tigbawan, Tomoy-tomoy, Tunga-tunga

**Default Center**: Lat 10.1301, Lng 124.8447

---

## 🛠️ Technology Stack

### Core
- **React Native** 0.73.2
- **React** 18.2.0
- **React Navigation** 6.x

### UI & Styling
- **NativeWind** (Tailwind for RN)
- **React Native Vector Icons**
- **React Native Linear Gradient**
- **React Native Fast Image**
- **Lottie React Native**

### Maps & Location
- **React Native Maps**
- **React Native Geolocation Service**
- **Google Maps API**

### Real-time & Communication
- **Socket.IO Client**
- **React Native Firebase** (FCM)
- **Axios**

### Authentication & Security
- **React Native Keychain**
- **React Native Biometrics**
- **React Native Permissions**

### Media & Files
- **React Native Image Picker**
- **React Native Video**
- **React Native Document Picker**

### State & Storage
- **React Context API**
- **AsyncStorage**
- **React Native NetInfo**

### Forms & Validation
- **Formik**
- **Yup**

---

## 🚀 Installation & Setup

### Prerequisites
```bash
Node.js >= 18
React Native CLI
Xcode (for iOS)
Android Studio (for Android)
```

### Installation
```bash
# Clone repository
cd "c:\Users\Mark Brian Lloyd\Desktop\Project"

# Install dependencies
npm install

# iOS specific
cd ios && pod install && cd ..

# Android specific
# Configure google-services.json in android/app/
```

### Environment Setup
Edit `.env` file with your credentials:
```env
API_BASE_URL=your_api_url
GOOGLE_MAPS_API_KEY=AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4
FIREBASE_API_KEY=your_firebase_key
# ... other credentials
```

### Running the App
```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

---

## 📦 Build for Production

### Android
```bash
cd android
./gradlew assembleRelease
# APK located in: android/app/build/outputs/apk/release/
```

### iOS
```bash
# Open Xcode
open ios/GSSMaasin.xcworkspace

# Select "Any iOS Device"
# Product → Archive
# Upload to App Store Connect
```

---

## 🔐 Security Features

- JWT token authentication
- Biometric login (Face ID / Fingerprint)
- Secure keychain storage
- HTTPS API communication
- Certificate pinning
- Data encryption
- Session management
- Permission handling

---

## 📱 Platform-Specific Notes

### iOS
- Minimum iOS 13.0
- Face ID / Touch ID support
- Apple Maps integration
- Push notification certificates required

### Android
- Minimum API 24 (Android 7.0)
- Fingerprint authentication
- Google Maps
- Google Play Services required

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests (Detox)
npm run test:e2e

# Lint code
npm run lint
```

---

## 📈 Performance Optimization

- Image lazy loading with Fast Image
- FlatList with windowSize optimization
- React.memo for component memoization
- useMemo and useCallback hooks
- Bundle size optimization
- Map marker clustering
- Offline data caching

---

## 🌐 API Endpoints Structure

```
BASE_URL/api/v1/

Auth:
POST /auth/login
POST /auth/register/client
POST /auth/register/provider
POST /auth/verify-otp
POST /auth/logout

Providers:
GET /providers/nearby
GET /providers/:id
GET /providers/:id/reviews
PUT /providers/:id/location

Jobs:
POST /jobs
GET /jobs/:id
POST /jobs/:id/accept
POST /jobs/:id/complete
POST /jobs/:id/payment

Chat:
GET /conversations
POST /conversations/:id/messages
WS /socket.io (real-time)
```

---

## 🎯 Next Steps for Development

1. ✅ **Core Structure Created**
   - Package configuration
   - Navigation setup
   - Context providers
   - Service layer
   - Style system

2. **Remaining Implementation**
   - Complete all screen components
   - Implement map integration
   - Build chat system
   - Payment integration
   - Push notifications
   - Testing suite

3. **Backend Requirements**
   - REST API server
   - Socket.IO server
   - Database (PostgreSQL/MongoDB)
   - File storage (AWS S3/Cloudinary)
   - Payment gateway integration

---

## 📝 License

Proprietary - GSS Maasin City © 2025

---

## 👥 Contact & Support

**Project**: GSS - General Service System  
**Location**: Maasin City, Southern Leyte  
**Developer**: [Your Name]  
**Email**: support@gss-maasin.com

---

## 📊 Project Status

**Current Phase**: Development  
**Version**: 1.0.0  
**Last Updated**: December 10, 2025

**Progress**:
- [x] Project structure
- [x] Configuration files
- [x] Navigation setup
- [x] Context providers
- [x] Service layer
- [x] Style system
- [ ] Screen components (In Progress)
- [ ] Real-time features
- [ ] Testing
- [ ] Deployment

---

**Note**: This is a comprehensive React Native mobile application. The file structure separates CSS (styling) from JSX (components) as requested, with all styles in the `src/css/` folder and utility JavaScript in `src/js/` folder. The design follows a professional, Grab-inspired aesthetic without kid-style emojis. Admin can track all provider locations on the map in real-time.
