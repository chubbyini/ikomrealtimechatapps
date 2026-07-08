import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import  Path  from "path";

import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const _dirname = Path.resolve();
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
}))


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes)
if (process.env.NODE_ENV === "production") {
    app.use(express.static(Path.join(_dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(Path.resolve(_dirname, "../frontend", "dist", "index.html"));
    })
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});
