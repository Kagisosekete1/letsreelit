import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LAST_ROUTE_KEY = 'muvit_last_route';

// Routes that should not be remembered (auth, etc.)
const EXCLUDED_ROUTES = ['/auth', '/terms', '/privacy', '/about'];

/**
 * Hook that persists the current route to localStorage and restores on app launch.
 * Call once in App.tsx to enable cross-restart route memory.
 */
export const useRouteMemory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // On mount, restore last route (only once)
  useEffect(() => {
    const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
    
    // Only restore if we're at root and have a saved route
    if (lastRoute && location.pathname === '/' && !EXCLUDED_ROUTES.includes(lastRoute)) {
      // Small delay to ensure router is ready
      const timeout = setTimeout(() => {
        navigate(lastRoute, { replace: true });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, []); // Only run once on mount

  // Save current route whenever it changes
  useEffect(() => {
    if (!EXCLUDED_ROUTES.includes(location.pathname)) {
      localStorage.setItem(LAST_ROUTE_KEY, location.pathname);
    }
  }, [location.pathname]);
};
