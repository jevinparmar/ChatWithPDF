/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5', // Primary indigo
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        dark: {
          bg: '#0B0D12',
          card: '#161920',
          hover: '#1E232C',
          border: '#1F232B',
          muted: '#8B949E',
        },
        light: {
          bg: '#F7F7F8',
          card: '#FFFFFF',
          hover: '#F0F1F3',
          border: '#E5E7EB',
          muted: '#6B7280',
        }
      },
      borderRadius: {
        xl: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
