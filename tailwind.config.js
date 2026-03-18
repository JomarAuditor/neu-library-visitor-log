/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'neu-blue':   '#003087',
        'neu-mid':    '#0046BD',
        'neu-navy':   '#001A5E',
        'neu-light':  '#E8EFF8',
        'neu-gray':   '#F5F7FB',
        'neu-border': '#E2E8F0',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        'card-md': '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
        'card-lg': '0 8px 32px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06)',
      },
      keyframes: {
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(.97) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1)   translateY(0)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'scale-in': 'scale-in .22s ease both',
        'fade-up':  'fade-up  .28s ease both',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};