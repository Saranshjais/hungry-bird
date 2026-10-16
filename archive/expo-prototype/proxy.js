const http = require('http');

const PORT = 8082;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 5000;

http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${TARGET_HOST}:${TARGET_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });

  proxyReq.on('error', (err) => {
    console.error('Proxy Error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Firewall Bypass Proxy is running!`);
  console.log(`Phone is connecting to Node.js on port ${PORT}`);
  console.log(`Proxying to Python on port ${TARGET_PORT}`);
});
