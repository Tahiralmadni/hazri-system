import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useTouchGestures from '../hooks/useTouchGestures';

/**
 * Mobile-optimized navigation bar that appears at the bottom of the screen on small devices
 */
const MobileNavbar = ({ userRole = 'teacher' }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide navbar on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle swipe up to show navbar
  useTouchGestures({
    onSwipeDown: () => setIsVisible(true)
  });

  const adminLinks = [
    { path: '/admin', icon: 'fa-tachometer-alt', label: t('components.nav.dashboard') },
    { path: '/admin/attendance-records', icon: 'fa-clipboard-list', label: t('components.nav.attendance') },
    { path: '/admin/teachers', icon: 'fa-user-graduate', label: t('components.nav.teachers') },
    { path: '/admin/settings', icon: 'fa-cog', label: t('components.nav.settings') }
  ];

  const teacherLinks = [
    { path: '/teacher', icon: 'fa-tachometer-alt', label: t('components.nav.dashboard') },
    { path: '/teacher/attendance', icon: 'fa-clipboard-list', label: t('components.nav.attendance') },
    { path: '/teacher/profile', icon: 'fa-user', label: t('components.nav.profile') }
  ];

  const links = userRole === 'admin' ? adminLinks : teacherLinks;

  return (
    <nav className={`mobile-navbar ${isVisible ? 'visible' : 'hidden'}`}>
      {links.map((link) => (
        <Link 
          key={link.path}
          to={link.path} 
          className={`mobile-nav-item ${location.pathname === link.path ? 'active' : ''}`}
        >
          <i className={`fas ${link.icon}`}></i>
          <span className="mobile-nav-label">{link.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default MobileNavbar; 