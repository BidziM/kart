const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ffmpeg = require('fluent-ffmpeg');
const spawn = require('child_process').spawn;

// Create Express server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve the client HTML page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
// Function to start FFmpeg streaming
function startFFmpegStream(socket) {
  const ffmpegProcess = spawn('ffmpeg', [
    '-f', 'dshow',      // Input format for Linux (adjust for Mac/Windows)
    '-i', 'video=USB Camera', 
    '-framerate', '30',        // Set the framerate to 30fps (or '15' if you prefer)
    '-s', '1280x720',          // Set the resolution to 1280x720 (or another supported resolution)
    '-c:v', 'libx264',         // Use H.264 codec for video encoding
    '-preset', 'ultrafast',     // Minimize encoding latency
    '-f', 'mp4',               // Use MP4 container format
    '-movflags', 'frag_keyframe+empty_moov', // Necessary flags for streaming fragmented MP4
    '-b:v', '1000k',           // Bitrate
    '-'
  ]);

  // Stream FFmpeg output to the WebSocket
  ffmpegProcess.stdout.on('data', (data) => {
    socket.send(data);
  });

  // Handle FFmpeg errors
  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  // Handle FFmpeg process close
  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });

  // When socket is closed, kill the FFmpeg process
  socket.on('close', () => {
    ffmpegProcess.kill();
  });
}

// WebSocket connection
wss.on('connection', (socket) => {
  console.log('Client connected');
  startFFmpegStream(socket);
});

// Start the server
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});