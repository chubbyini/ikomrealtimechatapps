import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSideBar, getMessages, sendMessage, markMessagesAsRead } from "../controllers/message.controllers.js";

const router = express.Router()

router.get("/users",protectRoute, getUsersForSideBar)
router.get("/:id",protectRoute, getMessages)
router.post("/send/:id",protectRoute, sendMessage)
router.put("/read/:id",protectRoute, markMessagesAsRead)

export  default router