import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/ThemeContext';

// Initialize i18n
import './i18n';

// Add Font Awesome
import '@fortawesome/fontawesome-free/css/all.min.css';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.1,
  easing: 'ease',
  speed: 500
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
