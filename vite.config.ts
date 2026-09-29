import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    // Vite's watcher doesn't consult .gitignore, so without this it also
    // watches src-tauri/target - a multi-GB directory Cargo writes to
    // continuously while `tauri dev` builds. That race caused a real crash:
    // Vite's fs.watch hit a file Cargo had mid-write and threw EBUSY.
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
})
