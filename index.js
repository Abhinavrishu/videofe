import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://videobe-abhinavs-projects-5c325c75.vercel.app";

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));

// Handle preflight requests
const API_ROUTE_REGEX = /^\/api\/.*/;

// CORS Preflight only for routes matching /api/*
app.options(API_ROUTE_REGEX, (req, res) => {
  res.header("Access-Control-Allow-Origin", FRONTEND_URL);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// Debug request origins only for /api/* routes
app.use(API_ROUTE_REGEX, (req, res, next) => {
  console.log("🌐 API Request Origin:", req.headers.origin);
  next();
});


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('join', ({ roomId }) => {
    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) rooms[roomId] = [];
    if (!rooms[roomId].includes(socket.id)) rooms[roomId].push(socket.id);

    const otherUsers = rooms[roomId].filter(id => id !== socket.id);
    socket.emit('all-users', otherUsers);
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('offer', ({ target, sdp }) => {
    io.to(target).emit('offer', { sdp, sender: socket.id });
  });

  socket.on('answer', ({ target, sdp }) => {
    io.to(target).emit('answer', { sdp, sender: socket.id });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', { candidate, sender: socket.id });
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${socket.id} disconnected`);

    for (const roomId in rooms) {
      if (rooms[roomId].includes(socket.id)) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
