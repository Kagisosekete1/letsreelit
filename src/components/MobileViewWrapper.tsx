import React from 'react';

interface MobileViewWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Wraps content in a mobile-phone-sized container when on desktop.
 * Creates a TikTok-like experience with black sidebars on larger screens.
 * Content fits perfectly with rounded corners on desktop.
 */
const MobileViewWrapper: React.FC<MobileViewWrapperProps> = ({ 
  children, 
  enabled = true 
}) => {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Mobile container - simulates phone screen on desktop with perfect edge fitting */}
      <div className="w-full h-[100dvh] lg:w-[420px] lg:h-[92vh] lg:max-h-[920px] lg:rounded-[2.5rem] lg:overflow-hidden lg:shadow-2xl lg:border lg:border-border/20 relative bg-background flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default MobileViewWrapper;
