/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ["Baskerville SC", ...fontFamily.serif],
                big: ["Anton SC", ...fontFamily.sans],
            },
        },
    },
    plugins: [],
};
