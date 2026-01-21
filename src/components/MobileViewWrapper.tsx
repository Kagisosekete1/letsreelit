import React from 'react';

interface MobileViewWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Wraps content in a mobile-phone-sized container when on desktop.
 * Creates a TikTok-like experience with black sidebars on larger screens.
 * Content fits perfectly edge-to-edge like the home screen.
 */
const MobileViewWrapper: React.FC<MobileViewWrapperProps> = ({ 
  children, 
  enabled = true 
}) => {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center">
      {/* Mobile container - simulates phone screen on desktop, full height fit */}
      <div className="w-full h-[100dvh] lg:w-[420px] lg:h-[100dvh] relative bg-background flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default MobileViewWrapper;
