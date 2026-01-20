import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting server...');
console.log('__dirname:', __dirname);
console.log('PORT:', PORT);

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Proxy for Bags API
const bagsProxy = createProxyMiddleware({
  target: 'https://api2.bags.fm',
  changeOrigin: true,
  pathRewrite: { '^/api/bags': '/api/v1' },
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log('Proxying to Bags API:', req.method, req.url);
    },
    proxyRes: (proxyRes, req, res) => {
      console.log('Bags API response:', proxyRes.statusCode);
    },
    error: (err, req, res) => {
      console.error('Bags Proxy error:', err.message);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  }
});
app.use('/api/bags', bagsProxy);

// Proxy for Public API
const publicProxy = createProxyMiddleware({
  target: 'https://public-api-v2.bags.fm',
  changeOrigin: true,
  pathRewrite: { '^/api/public': '/api/v1' },
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log('Proxying to Public API:', req.method, req.url);
    },
    proxyRes: (proxyRes, req, res) => {
      console.log('Public API response:', proxyRes.statusCode);
    },
    error: (err, req, res) => {
      console.error('Public Proxy error:', err.message);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  }
});
app.use('/api/public', publicProxy);

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});

