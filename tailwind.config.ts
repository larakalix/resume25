import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class", // ✅ This is the fix!
    content: ["./src/**/*.{vue,js,ts}"],
    theme: {},
    plugins: [],
};

export default config;
