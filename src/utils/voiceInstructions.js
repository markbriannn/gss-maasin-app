import Tts from 'react-native-tts';

class VoiceInstructions {
  constructor() {
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      // Initialize TTS
      await Tts.setDefaultRate(0.4); // Slower for elderly (0.4 = 40% speed)
      await Tts.setDefaultPitch(1.0); // Normal pitch
      await Tts.setDefaultLanguage('en-US');
      this.initialized = true;
    } catch (error) {
      console.log('TTS initialization error:', error);
      this.initialized = false;
    }
  }

  async speak(text) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      // Stop any ongoing speech
      await Tts.stop();
      
      // Speak the text
      await Tts.speak(text);
    } catch (error) {
      console.log('TTS speak error:', error);
    }
  }

  async stop() {
    try {
      await Tts.stop();
    } catch (error) {
      console.log('TTS stop error:', error);
    }
  }

  // Predefined instructions for common scenarios
  async speakUploadInstructions() {
    const text = "Tap the green button to add photos of the problem. You can take a new photo or choose from your gallery. Make sure the photo is clear and well-lit so the provider can see what needs to be fixed.";
    await this.speak(text);
  }

  async speakPhotoGuideInstructions() {
    const text = "Follow these three simple steps. Step 1: Get close to the problem area. Step 2: Make sure there is good lighting. Step 3: Show the whole problem clearly in the photo.";
    await this.speak(text);
  }

  async speakSubmitInstructions() {
    const text = "Review your booking details. Make sure all information is correct. Then tap the green button at the bottom to proceed to payment.";
    await this.speak(text);
  }

  async speakAddressInstructions() {
    const text = "Set your service address. You can use your current location or enter your address manually. Make sure to select your barangay and street address.";
    await this.speak(text);
  }
}

// Export singleton instance
export default new VoiceInstructions();
