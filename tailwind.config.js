/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neu: {
          blue:      '#003087',
          mid:       '#0050C8',
          navy:      '#001A5E',
          gold:      '#C8A951',
          light:     '#EEF2FF',
          gray:      '#F8FAFC',
          border:    '#E2E8F0',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md':  '0 4px 12px rgba(0,48,135,0.09)',
        'card-lg':  '0 8px 30px rgba(0,48,135,0.14)',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease-out both',
        'scale-in':   'scaleIn 0.3s ease-out both',
        'pulse-dot':  'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:   { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(0.95)' },      to: { opacity: '1', transform: 'scale(1)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
}
