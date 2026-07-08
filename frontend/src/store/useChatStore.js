import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", async (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });

      // Since the user has this conversation active, mark it as read
      try {
        await axiosInstance.put(`/messages/read/${selectedUser._id}`);
      } catch (error) {
        console.error("Error marking incoming message as read:", error);
      }
    });

    socket.on("messagesRead", ({ senderId, receiverId }) => {
      // If the chat with the receiver is active
      if (selectedUser?._id === receiverId) {
        set({
          messages: get().messages.map((m) =>
            m.senderId === senderId && m.receiverId === receiverId
              ? { ...m, isRead: true }
              : m
          ),
        });
      }
    });

    socket.on("messagesDelivered", ({ senderId, receiverId }) => {
      // If the chat with the receiver is active
      if (selectedUser?._id === receiverId) {
        set({
          messages: get().messages.map((m) =>
            m.senderId === senderId && m.receiverId === receiverId
              ? { ...m, isDelivered: true }
              : m
          ),
        });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messagesDelivered");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
