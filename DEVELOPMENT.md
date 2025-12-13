# GSS Maasin Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)
- Google Maps API Key configured

### Installation
```bash
# Clone repository
git clone <repository-url>
cd Project

# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📦 Dependencies Overview

### Core
- **react-native**: 0.73.2
- **react**: 18.2.0
- **react-navigation**: 6.x (Stack, Bottom Tabs, Drawer)

### Maps & Location
- **react-native-maps**: Google Maps integration
- **@react-native-community/geolocation**: GPS tracking
- **react-native-permissions**: Location permissions

### Real-time & Networking
- **socket.io-client**: Real-time bidirectional communication
- **axios**: HTTP client with interceptors
- **@react-native-firebase/messaging**: Push notifications

### UI & Styling
- **nativewind**: Tailwind CSS for React Native
- **react-native-vector-icons**: Icon library
- **react-native-linear-gradient**: Gradient backgrounds
- **react-native-safe-area-context**: Safe area handling

### Forms & Validation
- **formik**: Form management
- **yup**: Schema validation

### Storage & Security
- **@react-native-async-storage/async-storage**: Local storage
- **react-native-keychain**: Secure credential storage
- **react-native-biometrics**: Biometric authentication

### Media
- **react-native-image-picker**: Image selection

## 🏗️ Architecture

### State Management
- **React Context API** for global state
- **AuthContext**: Authentication state
- **ThemeContext**: Light/dark theme
- **SocketContext**: Real-time connections
- **NotificationContext**: Push notifications

### Navigation Structure
```
AuthStack (Not authenticated)
├── Splash
├── Onboarding
├── RoleSelection
├── Login
├── ForgotPassword
├── ClientRegistration (7 steps)
└── ProviderRegistration (9 steps)

ClientTabs (Client role)
├── Home (Map with providers)
├── Bookings (Job history)
├── Messages (Chat list)
└── Profile

ProviderTabs (Provider role)
├── Dashboard (Earnings, jobs)
├── Jobs (Available work)
├── Earnings (Financial history)
└── Profile

AdminTabs (Admin role)
├── Dashboard (Overview)
├── Providers (Verification)
├── Jobs (Monitoring)
└── Map (Real-time tracking)
```

### Service Layer
- **authService**: Login, registration, password reset
- **providerService**: Provider operations, location updates
- **jobService**: Job lifecycle management
- **locationService**: GPS, geocoding, distance calculations
- **notificationService**: FCM integration
- **storageService**: Local/secure storage wrapper

### Styling Philosophy
All styles separated from JSX in `src/css/` folder:
- `globalStyles.js`: Reusable global styles
- `authStyles.js`: Authentication screens
- `mapStyles.js`: Map interface
- `dashboardStyles.js`: Dashboard layouts
- `componentStyles.js`: Reusable components

## 🔑 Key Features Implementation

### Real-time Location Tracking
```javascript
// Watch provider location
locationService.watchLocation((position) => {
  socketContext.updateLocation({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
});
```

### Push Notifications
```javascript
// Initialize notifications
await notificationService.requestPermission();
await notificationService.registerDeviceToken(user.id);
notificationService.onNotificationReceived((message) => {
  // Handle foreground notification
});
```

### Socket.IO Integration
```javascript
// Join job room for real-time updates
socketContext.joinJobRoom(jobId);
socketContext.on('job:status_updated', (data) => {
  // Update UI
});
```

## 🗺️ Google Maps Configuration

API Key: `AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4`

### iOS Setup (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby providers</string>
```

### Android Setup (AndroidManifest.xml)
```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4"/>
```

## 🎨 Design System

### Colors
- Primary: `#00B14F` (Grab green)
- Secondary: `#3B82F6`
- Danger: `#EF4444`
- Warning: `#F59E0B`
- Success: `#10B981`

### Typography
- Heading1: 32px, bold
- Heading2: 28px, bold
- Heading3: 24px, semibold
- Heading4: 20px, semibold
- Body: 16px, regular
- Caption: 14px, regular

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## 🔐 Security Best Practices

1. **Token Storage**: Use Keychain for auth tokens
2. **API Interceptors**: Auto-inject tokens, handle 401
3. **Input Validation**: Use Yup schemas
4. **Secure Communication**: HTTPS only
5. **Biometric Auth**: Face ID/Touch ID support

## 🧪 Testing

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npx prettier --write "src/**/*.{js,jsx}"
```

## 📱 Build & Release

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
```bash
cd ios
xcodebuild -workspace GSSMaasin.xcworkspace -scheme GSSMaasin -configuration Release
```

## 🐛 Common Issues

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### iOS Pod Install Issues
```bash
cd ios
pod deintegrate
pod install
```

### Android Build Issues
```bash
cd android
./gradlew clean
```

## 📚 Additional Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)
- [Firebase Cloud Messaging](https://rnfirebase.io/messaging/usage)

## 🤝 Contributing

1. Follow existing code style
2. Keep CSS/JS separated
3. Write descriptive commit messages
4. Test on both iOS and Android
5. Update documentation

## 📄 License

Proprietary - GSS Maasin City © 2024
