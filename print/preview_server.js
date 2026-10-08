#!/usr/bin/env node
/**
 * preview_server.js -- look at anything in print/ in a browser, live.
 *
 *   node print/preview_server.js            # http://localhost:3003
 *
 *   http://localhost:3003/instructions/                       the updated performance instructions
 *   http://localhost:3003/cover/cover-score-landscape.pdf     the cover
 *   http://localhost:3003/score/                              the assembled print score, once built
 *
 * It serves this folder and nothing else, on this machine only. It is not part of the
 * website: scripts/performance_server.js (the live site's server) is not touched and
 * knows nothing of print/.
 */
const express = require('express');
const path = require('path');
const PORT = 3003;
const app = express();
app.use(function (req, res, next) { res.set('Cache-Control', 'no-store'); next(); });   // always the file as it is now
app.use(express.static(__dirname));
app.listen(PORT, '127.0.0.1', function () { console.log('print preview: http://localhost:' + PORT + '/instructions/'); });
