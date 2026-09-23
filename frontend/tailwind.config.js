/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        edu: {
          brand: {
            DEFAULT: '#1e3a8a',
            light: '#3b82f6',
            dark: '#172554',
          },
          primary: {
            50:  '#f5f3ff',
            100: '#ede9fe',
            200: '#ddd6fe',
            300: '#c4b5fd',
            400: '#a78bfa',
            500: '#8b5cf6',
            600: '#7c3aed',
            700: '#6d28d9',
            800: '#5b21b6',
            900: '#4c1d95',
            950: '#2e1065',
          },
          teal: {
            50:  '#f0fdfa',
            100: '#ccfbf1',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
          },
          slate: {
            50:  '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            800: '#1e293b',
            900: '#0f172a',
          },
          // New duotone palette: deep violet + warm amber
          violet: {
            50:  '#f5f3ff',
            100: '#ede9fe',
            200: '#ddd6fe',
            300: '#c4b5fd',
            400: '#a78bfa',
            500: '#8b5cf6',
            600: '#7c3aed',
            700: '#6d28d9',
            800: '#5b21b6',
            900: '#4c1d95',
            950: '#1e0a4a',
          },
          amber: {
            50:  '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
          },
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'premium':        '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 8px -1px rgba(15, 23, 42, 0.04)',
        'premium-hover':  '0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
        'glass':          '0 8px 32px 0 rgba(76, 29, 149, 0.12), 0 2px 8px 0 rgba(76, 29, 149, 0.06)',
        'glass-hover':    '0 20px 60px 0 rgba(76, 29, 149, 0.20), 0 8px 20px 0 rgba(76, 29, 149, 0.10)',
        'violet-glow':    '0 0 24px 4px rgba(124, 58, 237, 0.30)',
        'amber-glow':     '0 0 24px 4px rgba(245, 158, 11, 0.25)',
        'input-focus':    '0 0 0 3px rgba(124, 58, 237, 0.18), inset 0 1px 3px rgba(76, 29, 149, 0.06)',
        'btn-violet':     '0 4px 20px rgba(109, 40, 217, 0.45)',
        'btn-violet-hover':'0 8px 28px rgba(109, 40, 217, 0.60)',
      },
      backgroundImage: {
        'violet-amber':   'linear-gradient(135deg, #6d28d9 0%, #7c3aed 40%, #f59e0b 100%)',
        'violet-deep':    'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)',
        'amber-warm':     'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'glass-surface':  'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
      },
      keyframes: {
        'blob-drift': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%':       { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%':       { transform: 'translate(-20px, 10px) scale(0.97)' },
        },
        'blob-drift-alt': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%':       { transform: 'translate(-25px, 18px) scale(1.04)' },
          '66%':       { transform: 'translate(18px, -12px) scale(0.96)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%':       { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'blob-drift':     'blob-drift 12s ease-in-out infinite',
        'blob-drift-alt': 'blob-drift-alt 9s ease-in-out infinite',
        'pulse-glow':     'pulse-glow 3s ease-in-out infinite',
        'slide-up':       'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow':      'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [],
}
