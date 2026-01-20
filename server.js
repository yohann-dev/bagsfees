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

// Proxy for Bags API
app.use('/api/bags', createProxyMiddleware({
  target: 'https://api2.bags.fm',
  changeOrigin: true,
  pathRewrite: { '^/api/bags': '/api/v1' },
  onProxyReq: (proxyReq, req) => {
    console.log('Proxying to Bags API:', req.url);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}));

// Proxy for Public API
app.use('/api/public', createProxyMiddleware({
  target: 'https://public-api-v2.bags.fm',
  changeOrigin: true,
  pathRewrite: { '^/api/public': '/api/v1' },
  onProxyReq: (proxyReq, req) => {
    console.log('Proxying to Public API:', req.url);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}));

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});

