/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#14141F',
        primary: '#8948FF',
        secondary: '#48A9FF',
        accent: '#00F5D4',
        success: '#00E676',
        warning: '#FFD600',
        error: '#FF5252',
        'neutral-900': '#0F0F17',
        'neutral-800': '#1A1A27',
        'neutral-700': '#2A2A3A',
        'neutral-600': '#3D3D50',
        'neutral-500': '#565670',
        'neutral-400': '#7E7E9A',
        'neutral-300': '#ACACBE',
        'neutral-200': '#D1D1DC',
        'neutral-100': '#E8E8EE',
      },
      fontFamily: {
        spaceGrotesk: ['"Space Grotesk"', 'sans-serif'],
        orbitron: ['"Orbitron"', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'glow': 'radial-gradient(circle at center, rgba(137, 72, 255, 0.15) 0%, rgba(10, 10, 15, 0) 70%)',
      },
    },
  },
  plugins: [],
};