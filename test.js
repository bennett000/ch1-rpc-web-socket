#!/usr/bin/env node

require('./spec/server');
const { spawn } = require('child_process');
const { join } = require('path');

const karma = spawn(
  join(__dirname, 'node_modules', '.bin', 'karma'),
  ['start', './karma.conf.js'],
  {
    env: process.env,
    stdio: 'inherit',
  },
);

karma.on('close', code => {
  process.exit(code);
});
