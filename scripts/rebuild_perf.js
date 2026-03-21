#!/usr/bin/env node
/**
 * Quick rebuild + serve for Performance Score.
 * Usage:  node scripts/rebuild_perf.js
 * Kills any existing server on port 3001, rebuilds, and starts a new one.
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. Kill existing server on port 3001
console.log('Killing port 3001...');
try {
    execSync(
        `powershell -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { cwd: ROOT, stdio: 'inherit' }
    );
} catch (e) { /* nothing listening — fine */ }

// 2. Rebuild
console.log('\nRebuilding...');
execSync('node scripts/build_performance_app.js', { cwd: ROOT, stdio: 'inherit' });

// 3. Serve
console.log('\nStarting server on http://localhost:3001 ...');
const server = spawn('node', ['-e', [
    "const h=require('http'),f=require('fs'),p=require('path'),d='builds/performance',",
    "m={'.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};",
    "h.createServer((q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';",
    "const fp=p.join(d,decodeURIComponent(u)),e=p.extname(fp);",
    "if(!f.existsSync(fp)){r.writeHead(404);r.end('Not found');return}",
    "r.writeHead(200,{'Content-Type':m[e]||'application/octet-stream'});",
    "f.createReadStream(fp).pipe(r)}).listen(3001,()=>console.log('Serving at http://localhost:3001'));"
].join('')], { cwd: ROOT, stdio: 'ignore', detached: true });

server.unref();
console.log('Server started (PID ' + server.pid + '). Done.');
