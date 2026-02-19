# Install Accessibility Dependencies

## Quick Start

Run these commands to install the required dependency for voice instructions:

```bash
# Install react-native-tts
npm install react-native-tts

# For iOS, install pods
cd ios && pod install && cd ..

# For Android, rebuild
cd android && ./gradlew clean && cd ..
```

## Detailed Instructions

### 1. Install react-native-tts

```bash
npm install react-native-tts
```

This package provides Text-to-Speech functionality for both iOS and Android.

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

No additional configuration needed - auto-linked.

### 3. Android Setup

The package is auto-linked for Android. No additional setup required.

However, ensure your `android/build.gradle` has:

```gradle
minSdkVersion = 21
```

### 4. Rebuild the App

#### iOS
```bash
npx react-native run-ios
```

#### Android
```bash
npx react-native run-android
```

## Testing Voice Instructions

After installation, test the voice instructions:

1. Open the booking screen
2. Tap the "🔊 Hear Instructions" button
3. You should hear voice guidance

### Troubleshooting

#### iOS: No sound
- Check device volume
- Check silent mode switch
- Restart the app

#### Android: No sound
- Ensure Google TTS engine is installed
- Go to Settings > Language & Input > Text-to-Speech
- Select Google Text-to-Speech Engine
- Test voice output

#### Both platforms: TTS not working
- Check console for errors
- Verify `react-native-tts` is installed: `npm list react-native-tts`
- Try reinstalling: `npm uninstall react-native-tts && npm install react-native-tts`

## Package Information

### react-native-tts
- **Version**: ^4.1.0 (or latest)
- **Purpose**: Text-to-Speech for accessibility
- **Platforms**: iOS, Android
- **License**: MIT
- **Repository**: https://github.com/ak1394/react-native-tts

### Features Used
- `Tts.speak(text)` - Speak text
- `Tts.stop()` - Stop speaking
- `Tts.setDefaultRate(rate)` - Set speech rate (0.4 for elderly)
- `Tts.setDefaultPitch(pitch)` - Set pitch
- `Tts.setDefaultLanguage(lang)` - Set language

## Verification

After installation, verify the files exist:

```bash
# Check if files were created
ls -la src/utils/voiceInstructions.js
ls -la src/components/PhotoGuideModal.jsx

# Check if dependency is installed
npm list react-native-tts
```

Expected output:
```
react-native-tts@4.1.0
```

## Next Steps

1. ✅ Install dependencies (above)
2. ✅ Rebuild app
3. ✅ Test voice instructions
4. ✅ Test photo guide modal
5. ✅ Test on real devices with elderly users

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the package documentation: https://github.com/ak1394/react-native-tts
3. Check React Native version compatibility
4. Ensure you're using React Native 0.60+ (auto-linking)

## Alternative: Manual Testing Without TTS

If you want to test the UI without installing TTS:

1. Comment out the voice instructions import:
```javascript
// import voiceInstructions from '../../utils/voiceInstructions';
```

2. Comment out the voice button onPress:
```javascript
// onPress={() => voiceInstructions.speakUploadInstructions()}
onPress={() => console.log('Voice instructions would play here')}
```

3. All other accessibility features will still work:
   - Large buttons
   - Photo guide modal
   - Help button
   - Progress indicator
   - Simplified interface

## Complete Installation Script

Copy and paste this entire script:

```bash
#!/bin/bash

echo "Installing accessibility dependencies..."

# Install npm package
npm install react-native-tts

# iOS setup
if [ -d "ios" ]; then
  echo "Setting up iOS..."
  cd ios
  pod install
  cd ..
  echo "iOS setup complete!"
fi

# Android clean build
if [ -d "android" ]; then
  echo "Cleaning Android build..."
  cd android
  ./gradlew clean
  cd ..
  echo "Android clean complete!"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Rebuild your app: npx react-native run-ios or npx react-native run-android"
echo "2. Test voice instructions in the booking screen"
echo "3. Test photo guide modal"
echo ""
```

Save as `install-accessibility.sh` and run:
```bash
chmod +x install-accessibility.sh
./install-accessibility.sh
```
