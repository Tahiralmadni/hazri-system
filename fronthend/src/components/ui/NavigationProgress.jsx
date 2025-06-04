import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';

const NavigationProgress = () => {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();

    return () => {
      NProgress.done();
    };
  }, [location.pathname]);

  return null; // This is a side-effect-only component, no rendering
};

export default NavigationProgress; 