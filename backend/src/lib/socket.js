import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Map to store online users: { userId: socketId }
const userSocketMap = {};

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;

    // Mark undelivered messages to this user as delivered
    try {
      const undelivered = await Message.find({ receiverId: userId, isDelivered: false });
      if (undelivered.length > 0) {
        const senderIds = [...new Set(undelivered.map((m) => m.senderId.toString()))];
        await Message.updateMany(
          { receiverId: userId, isDelivered: false },
          { $set: { isDelivered: true } }
        );

        senderIds.forEach((senderId) => {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            io.to(senderSocketId).emit("messagesDelivered", {
              senderId,
              receiverId: userId,
            });
          }
        });
      }
    } catch (error) {
      console.error("Error marking messages as delivered on connection:", error);
    }
  }

  // Broadcast the list of active user IDs to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
