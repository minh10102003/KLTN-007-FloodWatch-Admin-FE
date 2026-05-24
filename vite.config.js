import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
  server: {
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_PROXY_TARGET ||
          'https://api.floodsight.id.vn',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target:
          process.env.VITE_API_PROXY_TARGET ||
          'https://api.floodsight.id.vn',
        changeOrigin: true,
        secure: true,
      },
      /** Socket.IO — chỉ dùng khi VITE_SOCKET_ENABLED=true và BE đã bật socket */
      '/socket.io': {
        target:
          process.env.VITE_API_PROXY_TARGET ||
          process.env.VITE_SOCKET_URL ||
          'https://api.floodsight.id.vn',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
})
