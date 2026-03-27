import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        card: '#1a1a2e',
        accent: '#e50914',
        'text-muted': '#a0a0a0',
        border: '#2a2a3e',
      },
      borderRadius: {
        card: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
