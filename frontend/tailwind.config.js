/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F5F8F7',
          sidebar: '#104C47',
          sidebarHover: '#0D3F3B',
          sidebarActive: '#165D57',
          teal: '#16A394',
          tealDark: '#0E766B',
          tealLight: '#E8F6F4',
          text: '#172B2A',
          textMuted: '#647875',
          border: '#E3ECE9',
          card: '#FFFFFF',
          coral: '#E65B65',
          coralLight: '#FDECEE',
          amber: '#F59E0B',
          amberLight: '#FEF6E7',
          blue: '#3B82F6',
          blueLight: '#EEF4FF',
          green: '#10B981',
          greenLight: '#ECFDF5'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
