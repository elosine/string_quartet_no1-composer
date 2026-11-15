// PM2 process file for the box. From the stand's folder:  pm2 start server/ecosystem.config.js
// One running server per piece: this one is `sq1-stand` (String Quartet No. 1, the film stand), beside
// `sq1-server` (the quartet's first performance system), `bcb-server` (the tubas) and `ss-server` (the septet).
module.exports = {
  apps: [{
    name: 'sq1-stand',
    script: 'server/server.js',
    cwd: __dirname + '/..',
    // TRUST_PROXY: behind nginx, read the real address and scheme from the forwarded headers (the rate
    // limiter, the printed links). The admin key is generated into server/data/admin.key on first start.
    env: { NODE_ENV: 'production', PORT: 5302, TRUST_PROXY: '1' },
    max_memory_restart: '300M',
    autorestart: true,
    restart_delay: 1000,
  }],
};
