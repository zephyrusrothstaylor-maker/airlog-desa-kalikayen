/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        water: {
          navy: '#091F5C',
          royal: '#334DAF',
          steel: '#7096D1',
          periwinkle: '#D0E4FE',
          ice: '#E8F2FE',
          snow: '#F9FBFF',
        },
      },
      boxShadow: {
        card: '0 10px 28px -6px rgba(9, 31, 92, 0.08), 0 4px 12px -2px rgba(51, 77, 175, 0.05)',
        float: '0 16px 36px -8px rgba(9, 31, 92, 0.18)',
      },
    },
  },
  plugins: [],
};
