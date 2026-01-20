import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0e307399f618441f97e8f5e125d8d23f',
  appName: "Muv'it",
  webDir: 'dist',
  server: {
    url: 'https://0e307399-f618-441f-97e8-f5e125d8d23f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      // Hide native splash immediately - React SplashScreen handles the animation
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    }
  },
  android: {
    // Use the generated icons from public/icons/android/
    icon: 'public/icons/android/icon-512x512.png',
    adaptiveIcon: {
      foreground: 'public/icons/android/icon-512x512.png',
      backgroundColor: '#000000'
    },
    // FCM Configuration - place google-services.json in android/app/
    googleServicesFile: 'google-services.json',
    // Start with black background to match React splash
    backgroundColor: '#000000'
  },
  ios: {
    // Use the generated icons from public/icons/ios/
    icon: 'public/icons/ios/icon-1024x1024.png',
    backgroundColor: '#000000',
    // FCM Configuration - place GoogleService-Info.plist in ios/App/App/
    // Enable push notification capability in Xcode
  }
};

export default config;