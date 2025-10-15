/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_includes/**/*.html",
    "./_layouts/**/*.html", 
    "./_posts/**/*.{html,md,markdown}",
    "./index.html",
    "./index.markdown",
    "./about.markdown",
    "./*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2c3e50',
        secondary: '#3498db',
        accent: '#e74c3c',
        dark: '#2c3e50',
        light: '#ecf0f1'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#2c3e50',
            a: {
              color: '#3498db',
              '&:hover': {
                color: '#2980b9',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}