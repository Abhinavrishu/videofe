import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 8001;
const server = createServer();

const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = {}; // roomId: [socketId, ...]

io.on("connection", (socket) => {
  socket.on("join", ({ roomId }) => {
    socket.join(roomId);
    rooms[roomId] = rooms[roomId] || [];
    rooms[roomId].push(socket.id);

    const otherUsers = rooms[roomId].filter(id => id !== socket.id);
    socket.emit("all-users", otherUsers);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ target, sdp }) => {
    io.to(target).emit("offer", { sdp, sender: socket.id });
  });

  socket.on("answer", ({ target, sdp }) => {
    io.to(target).emit("answer", { sdp, sender: socket.id });
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    io.to(target).emit("ice-candidate", { candidate, sender: socket.id });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
