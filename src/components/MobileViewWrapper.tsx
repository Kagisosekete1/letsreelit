import React from 'react';

interface MobileViewWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Wraps content in a mobile-phone-sized container when on desktop.
 * Creates a TikTok-like experience with black sidebars on larger screens.
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
      {/* Mobile container - simulates phone screen on desktop */}
      <div className="w-full h-screen lg:w-[420px] lg:h-[90vh] lg:max-h-[900px] lg:rounded-3xl lg:overflow-hidden lg:shadow-2xl lg:border lg:border-border/20 relative bg-background">
        {children}
      </div>
    </div>
  );
};

export default MobileViewWrapper;
