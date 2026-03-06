import React from 'react';
import muvitLogo from '@/assets/muvit-logo.png';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
      <div className="animate-fade-in">
        <img 
          src={muvitLogo} 
          alt="Muv'it Logo" 
          className="w-28 h-28 rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
