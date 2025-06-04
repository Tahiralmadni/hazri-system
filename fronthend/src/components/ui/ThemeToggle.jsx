import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export const ThemeToggle = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleDarkMode}
      className="theme-toggle-button"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <i className={darkMode ? 'fas fa-sun' : 'fas fa-moon'}></i>
      <span>{darkMode ? t('components.themeToggle.light') : t('components.themeToggle.dark')}</span>
    </button>
  );
}; 