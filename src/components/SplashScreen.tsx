import React from 'react';
import logo from '@/assets/logo.jpg';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50 animate-fade-in">
      <div className="text-center space-y-3 px-8 animate-scale-in">
        <div className="mx-auto w-14 h-14 rounded-2xl overflow-hidden shadow-md">
          <img
            src={logo}
            alt="Reel'it logo"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-foreground">
            Let’s Reel'it
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Your Stage, Your Story
          </p>
        </div>
        <div className="w-14 h-1 mx-auto bg-primary rounded-full" />
      </div>
    </div>
  );
};

export default SplashScreen;