import { useState } from 'react';
import { createUserAccount } from '../services/firebase-mongodb-adapter';
import { Link } from 'react-router-dom';
import '../App.css';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

function AdminSetup() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const setupAdmin = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await createUserAccount('tahiralmadni@gmail.com', 'admin123');
      setSuccess(true);
    } catch (error) {
      console.error('Error creating admin account:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError(t('pages.adminSetup.errors.alreadyExists', 'Admin account already exists! You can log in using the credentials.'));
      } else if (error.code === 'auth/operation-not-allowed') {
        setError(t('pages.adminSetup.errors.notEnabled', 'Email/Password authentication is not enabled in Firebase Console. Please enable it first.'));
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Helmet>
        <title>{t('pages.adminSetup.title')}</title>
        <meta name="description" content={t('app.subtitle')} />
      </Helmet>
      
      <div className="login-card">
        <div className="login-header">
          <div className="language-nav" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <i className="fas fa-user-shield login-icon"></i>
          <h1>{t('pages.adminSetup.heading')}</h1>
          <p>{t('pages.adminSetup.subtitle', 'Set up your admin account for Hazri System')}</p>
        </div>
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {t('pages.adminSetup.success')}
            <p>{t('pages.adminSetup.loginNow')} <Link to="/login">{t('pages.adminSetup.login')}</Link> {t('pages.adminSetup.withCredentials')}:</p>
            <p><strong>{t('pages.adminSetup.email')}:</strong> tahiralmadni@gmail.com</p>
            <p><strong>{t('pages.adminSetup.password')}:</strong> admin123</p>
          </div>
        )}
        
        <div className="setup-instructions">
          <h3>{t('pages.adminSetup.beforeProceeding')}:</h3>
          <ol>
            <li>{t('pages.adminSetup.steps.step1')}</li>
            <li>{t('pages.adminSetup.steps.step2')}</li>
            <li>{t('pages.adminSetup.steps.step3')}</li>
            <li>{t('pages.adminSetup.steps.step4')}</li>
            <li>{t('pages.adminSetup.steps.step5')}</li>
            <li>{t('pages.adminSetup.steps.step6')}</li>
          </ol>
        </div>
        
        <button 
          onClick={setupAdmin} 
          className="login-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading-spinner-small"></div>
              <span>{t('pages.adminSetup.setupInProgress')}</span>
            </>
          ) : (
            <>
              <i className="fas fa-user-plus"></i>
              <span>{t('pages.adminSetup.btn_create')}</span>
            </>
          )}
        </button>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} - {t('app.title')}</p>
          <p><Link to="/login">{t('pages.adminSetup.backToLogin')}</Link></p>
        </div>
      </div>
    </div>
  );
}

export default AdminSetup; 
            