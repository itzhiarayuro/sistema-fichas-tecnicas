import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa según Requirements 8.2
        primary: {
          DEFAULT: '#1F4E79',
          50: '#E8F0F7',
          100: '#D1E1EF',
          200: '#A3C3DF',
          300: '#75A5CF',
          400: '#4787BF',
          500: '#1F4E79',
          600: '#1A4267',
          700: '#153655',
          800: '#102A43',
          900: '#0B1E31',
        },
        // Verde ambiental
        environmental: {
          DEFAULT: '#2E7D32',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#2E7D32',
          600: '#27692A',
          700: '#205522',
          800: '#19411A',
          900: '#122D12',
        },
        // Estados
        success: '#2E7D32',
        warning: '#F59E0B',
        error: '#DC2626',
        info: '#1F4E79',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
