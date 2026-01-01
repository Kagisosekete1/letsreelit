import React from 'react';
import logo from '@/assets/logo.jpg';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50 animate-fade-in">
      <div className="text-center space-y-5 px-8 animate-scale-in">
        <img
          src={logo}
          alt="Reel'it logo"
          className="mx-auto w-16 h-16 rounded-2xl object-cover"
          loading="eager"
        />
        <div className="space-y-1">
          <h1
            className="text-4xl font-bold text-foreground"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }}
          >
            Let’s Reel'it
          </h1>
          <p className="text-muted-foreground text-base font-medium">
            Your Stage, Your Story
          </p>
        </div>
        <div className="w-14 h-1 mx-auto bg-primary rounded-full" />
      </div>
    </div>
  );
};

export default SplashScreen;