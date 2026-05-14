/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:  '#0A0E14',
        foreground:  '#F5F7FA',
        card: {
          DEFAULT:    '#111827',
          foreground: '#F5F7FA',
        },
        primary: {
          DEFAULT:    '#1F4AA8',
          foreground: '#FFFFFF',
          600:        '#2554BF',
          700:        '#1A3F94',
        },
        secondary: {
          DEFAULT:    '#1B2433',
          foreground: '#E5ECF6',
        },
        muted: {
          DEFAULT:    '#202938',
          foreground: '#9AA6B2',
        },
        accent: {
          DEFAULT:    '#C61C1C',
          foreground: '#FFFFFF',
          600:        '#A81818',
        },
        destructive: {
          DEFAULT:    '#991B1B',
          foreground: '#FFFFFF',
        },
        border: '#273449',
        input:  '#162030',
        ring:   '#2F5FC1',
      },
    },
  },
  plugins: [],
}
