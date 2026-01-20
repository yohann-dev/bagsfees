import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// API credentials
const AUTH_TOKEN = process.env.VITE_AUTH_TOKEN || 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImZiM2ZhMmJhMDkwOGQwOTlkOGY5ZGNhYzQ0ODYifQ.eyJzdWIiOiI3NzdhMGQ5NS1iN2RlLTQwOWItYjU3MS1lZDE2NmQ3MWU0NWYiLCJhdWQiOlsiaHR0cHM6Ly9iYWdzLmZtIl0sImlzcyI6Imh0dHBzOi8vYXBpLmJhZ3MuZm0vYXBpL3YxL2F1dGgiLCJpYXQiOjE3Njg0NzMzNTMsInNpZCI6IkdTZUE1TmVybGphc2ZvNjVVeldwamYwZDZsUExCS0k3IiwiZXhwIjoxNzcwODkyNTUzLCJzY29wZSI6InVzZXIifQ.o0VRa_dWBvOBbB-Z_M1SXXZwttm6wi_W3ITm_6g6s6ezCiK__SfTNbdkf0Vm_mtvSB_vg1H5TU04fpOcA4M3I2wxmOu1AUXb-gClQqghjaHvQB4Ocrd784ykw9L8ZVWDEbwBXcECFBUCPimGJUWVhaSBScVbqbVCvoOk4m0mL2OA37lt-cKfpsxQmQPbGjYqrIHZLJ8OyQcq0FO-Sp5vJkHc5gX3OYQGxHmWQ3VtY3MHICsiodj3656gywd6C3fcSRHqC7KQ4vcrso27r9moM0gGk1GPlBbq15fIHJwz4k7ZFxTKYgB7MLkG_l77xY0ghaYSISGKO9Z1-bbFsBXlzQ';
const PUBLIC_API_KEY = process.env.VITE_PUBLIC_API_KEY || 'bags_prod_xLvj2xL8eoEHCkXZcaybzaFTrBdQl__1TXJQbWvuvs0';

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
  target: 'https://api2.bags.fm/api/v1',
  changeOrigin: true,
  pathRewrite: { '^/api/bags': '' },
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Add auth header
      proxyReq.setHeader('Authorization', `Bearer ${AUTH_TOKEN}`);
      console.log('Proxying to Bags API:', req.method, 'https://api2.bags.fm/api/v1' + proxyReq.path);
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
  target: 'https://public-api-v2.bags.fm/api/v1',
  changeOrigin: true,
  pathRewrite: { '^/api/public': '' },
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Add API key header
      proxyReq.setHeader('x-api-key', PUBLIC_API_KEY);
      console.log('Proxying to Public API:', req.method, 'https://public-api-v2.bags.fm/api/v1' + proxyReq.path);
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

