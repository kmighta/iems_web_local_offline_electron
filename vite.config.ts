import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    // drop: ["console", "debugger"], // console.log 제거
  },
  define: {
    global: "window",
  },
  base: "./", // Electron에서 상대 경로 사용
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5868,
    allowedHosts: ['localhost:8082', 'iems.store', 'localhost', 'iems.kr'],
    hmr: {
      //host: 'iems2.store',
      // 로컬 개발 환경에서는 localhost 사용
      host: 'localhost',
      port: 5868,
      protocol: 'ws',
      clientPort: 5868
    },
    proxy: {
      '/api': {
        target: 'http://iems-gateway:8081',
        // target: 'http://iems.kr:8082',
        // target: 'http://175.114.130.5:8082',
        changeOrigin: true,
        secure: false,
        // rewrite 제거 - API 경로를 그대로 유지
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, _req, _res) => {
            console.log('Sending Request to the Target:', _req.method, _req.url);
          });
          proxy.on('proxyRes', (_proxyRes, _req, _res) => {
            console.log('Received Response from the Target:', _proxyRes.statusCode, _req.url);
          });
        },
      }
    }
  },
  preview: {
    allowedHosts: ['iems2.store', 'localhost', 'iems.kr'],
  }
})
