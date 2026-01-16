import React from 'react';
import { Music } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 z-50">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-6 px-8 animate-fade-in">
        {/* Animated logo container */}
        <div className="relative mx-auto">
          {/* Pulsing ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-2xl bg-primary/30 animate-ping-slow" />
          
          {/* Main logo */}
          <div className="relative mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center animate-bounce-gentle">
            <Music className="w-12 h-12 text-primary-foreground animate-pulse" />
          </div>
        </div>

        {/* Brand name with staggered animation */}
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent animate-scale-in">
            Muv'it
          </h1>
          <p className="text-muted-foreground text-base font-medium animate-fade-in-delayed">
            Don't scroll it. Muv'it.
          </p>
        </div>

        {/* Animated loading bar */}
        <div className="w-32 h-1.5 mx-auto bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-loading-bar" />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        .animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
        
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-gentle { animation: bounce-gentle 2s ease-in-out infinite; }
        
        @keyframes fade-in-delayed {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-delayed { animation: fade-in-delayed 0.5s ease-out 0.3s forwards; opacity: 0; }
        
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar { animation: loading-bar 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default SplashScreen;
