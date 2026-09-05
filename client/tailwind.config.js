/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        brutal: '4px 4px 0 #111827'
      },
      colors: {
        paper: '#f7f4ee',
        ink: '#111827',
        accent: '#facc15',
        success: '#22c55e',
        info: '#3b82f6',
        warn: '#f97316'
      }
    }
  },
  plugins: []
}
