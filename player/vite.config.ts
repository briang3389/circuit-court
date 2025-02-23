import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,  // Allow access from external network (not just localhost)
        port: 80,  // Specify the port you want (default is 3000)
        strictPort: true,  // Ensure Vite uses the specified port and fails if it's already in use
        allowedHosts: true
    },
});