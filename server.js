import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Proxy for Bags API
app.use('/api/bags', createProxyMiddleware({
  target: 'https://api2.bags.fm',
  changeOrigin: true,
  pathRewrite: { '^/api/bags': '/api/v1' },
}));

// Proxy for Public API
app.use('/api/public', createProxyMiddleware({
  target: 'https://public-api-v2.bags.fm',
  changeOrigin: true,
  pathRewrite: { '^/api/public': '/api/v1' },
}));

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

