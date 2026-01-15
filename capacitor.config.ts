import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0e307399f618441f97e8f5e125d8d23f',
  appName: "Reel'It",
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
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    }
  },
  android: {
    icon: 'public/android-chrome-512x512.png',
    adaptiveIcon: {
      foreground: 'public/android-chrome-512x512.png',
      backgroundColor: '#3B82F6'
    }
  },
  ios: {
    icon: 'public/android-chrome-512x512.png'
  }
};

export default config;