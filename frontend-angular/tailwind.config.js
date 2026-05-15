/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        vinotinto: '#7B1D2C',
        verde:     '#1A5C3A',
        dorado:    '#C9A84C',
        crema:     '#F8F5F0',
        'gris-its':'#3D3D3D',
        claro:     '#EDF0ED',
      },
      fontFamily: {
        titular: ['"Playfair Display"', 'Georgia', 'serif'],
        cuerpo:  ['"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
