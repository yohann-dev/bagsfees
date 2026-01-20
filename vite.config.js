import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/bags': {
        target: 'https://api2.bags.fm',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bags/, '/api/v1'),
      },
      '/api/public': {
        target: 'https://public-api-v2.bags.fm',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/public/, '/api/v1'),
      },
    },
  },
})

