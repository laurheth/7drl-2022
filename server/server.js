'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;

const server = express()
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
  ws.on('message',(data, isBinary) => {
    const message = isBinary ? data : data.toString();
      wss.clients.forEach(client => {
          client.send(message);
      })
  })
});