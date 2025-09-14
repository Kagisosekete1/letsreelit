import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0e307399f618441f97e8f5e125d8d23f',
  appName: 'A Lovable project',
  webDir: 'dist',
  server: {
    url: 'https://0e307399-f618-441f-97e8-f5e125d8d23f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;