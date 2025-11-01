/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/popup.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
        },
        success: '#43A047',
        warning: '#FB8C00',
        error: '#E53935',
      },
    },
  },
  plugins: [],
};
