import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-tiktok-gray via-background to-accent/20 text-foreground relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float opacity-60"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-accent rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-primary/30 rounded-full animate-float opacity-50" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-accent/50 rounded-full animate-pulse opacity-60" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="text-center z-10">
        <h1 className="text-6xl md:text-7xl font-lobster tracking-normal animate-subtle-glow text-foreground mb-2">
          Reel'It
        </h1>
        <p className="text-lg md:text-xl text-accent font-medium animate-float-up opacity-90" style={{animationDelay: '0.3s'}}>
          Feel The Beat
        </p>
      </div>
      
      <div className="absolute bottom-10 text-muted-foreground text-sm animate-fade-in opacity-70" style={{animationDelay: '1s'}}>
        Entering the dance world
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none"></div>
    </div>
  );
};

export default SplashScreen;