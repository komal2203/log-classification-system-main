// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  safelist: [
    {
      pattern: /bg-(indigo|pink|green|blue|yellow|red|purple)-(50|100|200)/,
    },
    {
      pattern: /text-(indigo|pink|green|blue|yellow|red|purple)-(700|800)/,
    },
    {
      pattern: /border-(indigo|pink|green|blue|yellow|red|purple)-(200)/,
    },
    'rounded-full',
    'rounded',
    'shadow',
    'font-semibold',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
