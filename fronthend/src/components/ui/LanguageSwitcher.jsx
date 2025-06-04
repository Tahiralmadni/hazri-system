import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    // Set document direction when component mounts and when language changes
    document.documentElement.dir = currentLanguage === 'ur' ? 'rtl' : 'ltr';
  }, [currentLanguage]);

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'ur' ? 'en' : 'ur';
    i18n.changeLanguage(newLanguage);
    setCurrentLanguage(newLanguage);
    
    // Store language preference in localStorage
    localStorage.setItem('i18nextLng', newLanguage);
    
    // Set document direction based on language
    document.documentElement.dir = newLanguage === 'ur' ? 'rtl' : 'ltr';
  };

  return (
    <button
      onClick={toggleLanguage}
      className="language-switcher"
      aria-label="Change language"
    >
      <i className="fas fa-language"></i>
      <span>{currentLanguage === 'ur' ? 'English' : 'اردو'}</span>
    </button>
  );
}; 
    
