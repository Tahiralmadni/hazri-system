/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // dark mode via class
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-border': 'rgb(var(--border) / <alpha-value>)',
      },
      backgroundColor: {
        background: 'rgb(var(--background) / <alpha-value>)',
      },
      textColor: {
        'foreground': 'rgb(var(--foreground) / <alpha-value>)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar'),
  ],
}
