import { Toaster, toast as hotToast } from 'react-hot-toast';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';

// Toast wrapper with dark mode support
export const Toast = ({ position = 'top-right' }) => {
  return (
    <Toaster
      position={position}
      toastOptions={{
        className: 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        duration: 5000,
        style: {
          borderRadius: '0.375rem',
          padding: '1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      }}
    />
  );
};

// Custom toast functions

  