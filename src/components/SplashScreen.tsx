import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50 animate-fade-in">
      <div className="text-center space-y-8 px-8 animate-scale-in">
        <div className="relative">
          <div className="w-24 h-24 mx-auto bg-primary rounded-3xl flex items-center justify-center font-bold text-white text-5xl shadow-lg" 
               style={{fontFamily: "'Inter', sans-serif"}}>
            R
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground" 
              style={{fontFamily: "'Inter', sans-serif", fontWeight: 800}}>
            Reel'It
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Your Stage, Your Story
          </p>
        </div>
        <div className="w-16 h-1 mx-auto bg-primary rounded-full" />
      </div>
    </div>
  );
};

export default SplashScreen;