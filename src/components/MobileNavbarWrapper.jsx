import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MobileNavbar from './MobileNavbar';

/**
 * Wrapper component that conditionally renders the mobile navbar
 * based on authentication state and current route
 */
const MobileNavbarWrapper = () => {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  
  // Don't show on login or admin setup pages
  const publicRoutes = ['/login', '/admin-setup'];
  if (!currentUser || publicRoutes.includes(pathname)) {
    return null;
  }
  
  return <MobileNavbar userRole={userRole} />;
};

export default MobileNavbarWrapper; 