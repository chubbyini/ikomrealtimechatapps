import User from "../models/user.models.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSideBar = async (req,res) =>{
    try {
        const  loggedInUserId= req.user._id;
        const filteredUsers= await User.find({_id: {$ne: loggedInUserId}}).select("-password")
        res.status(200).json(filteredUsers)
    } catch (error) {
        console.error("Error in getUsersForSideBar controller :",error)
        res.status(500).json({message:"Internal server error"})
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        await Message.updateMany(
            { senderId: userToChatId, receiverId: myId, isRead: false },
            { $set: { isRead: true, isDelivered: true } }
        );

        const senderSocketId = getReceiverSocketId(userToChatId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", {
                senderId: userToChatId,
                receiverId: myId,
            });
        }

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getMessages controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const markMessagesAsRead = async (req, res) => {
    try {
        const { id: senderId } = req.params;
        const myId = req.user._id;

        await Message.updateMany(
            { senderId, receiverId: myId, isRead: false },
            { $set: { isRead: true, isDelivered: true } }
        );

        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", {
                senderId,
                receiverId: myId,
            });
        }

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error in markMessagesAsRead controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            // Upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const receiverSocketId = getReceiverSocketId(receiverId);
        const isOnline = !!receiverSocketId;

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            isDelivered: isOnline,
        });

        await newMessage.save();

        if (isOnline) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
