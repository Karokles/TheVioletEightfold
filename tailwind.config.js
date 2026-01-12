/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          950: '#0f0720',
          900: '#1e1b4b',
          800: '#312e81',
          700: '#4338ca',
          600: '#4f46e5',
          500: '#6366f1',
          400: '#818cf8',
          300: '#a5b4fc',
          200: '#c7d2fe',
          100: '#e0e7ff',
          50: '#eef2ff',
        },
        mystic: {
          dark: '#0a0510',
          glow: '#d8b4fe',
        }
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-subtle': 'pulse-subtle 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'spin-slow-reverse': 'spin 25s linear infinite reverse',
        'float': 'float 6s ease-in-out infinite',
        'spectral': 'spectral 15s linear infinite',
        'tumble-slow': 'tumble 20s linear infinite',
        'tumble-medium': 'tumble 12s linear infinite reverse',
        'tumble-fast': 'tumble 8s linear infinite',
        'warp': 'warp 10s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        spectral: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        tumble: {
          '0%': { transform: 'rotate3d(0, 0, 0, 0deg)' },
          '100%': { transform: 'rotate3d(1, 1, 1, 360deg)' },
        },
        warp: {
          '0%, 100%': { transform: 'scale(1) perspective(500px) rotateX(0deg)' },
          '50%': { transform: 'scale(1.1) perspective(500px) rotateX(5deg)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '0.05' },
          '50%': { opacity: '0.2' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'brightness(1)' },
          '50%': { opacity: '1', filter: 'brightness(1.3)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}




