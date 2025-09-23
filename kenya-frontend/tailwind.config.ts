import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kenyan flag colors
        kenya: {
          black: '#000000',
          red: '#BB0000',
          green: '#006600',
          white: '#FFFFFF',
          // Extended palette for the app
          darkGreen: '#004d00',
          lightGreen: '#00cc00',
          darkRed: '#990000',
          lightRed: '#ff3333',
          gold: '#FFD700',
          accent: '#FFA500',
        },
        // Food system theme colors
        food: {
          agriculture: '#228B22',
          security: '#FF6B6B',
          resilience: '#4ECDC4',
          optimization: '#95E1D3',
          vulnerable: '#FFB6C1',
        }
      },
      backgroundImage: {
        'kenya-gradient': 'linear-gradient(135deg, #006600 0%, #BB0000 50%, #000000 100%)',
        'kenya-subtle': 'linear-gradient(135deg, rgba(0,102,0,0.1) 0%, rgba(187,0,0,0.1) 50%, rgba(0,0,0,0.1) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;