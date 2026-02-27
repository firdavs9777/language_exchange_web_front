import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { BASE_URL } from '../../../constants';

interface UseSocketOptions {
  onMessage?: (message: any) => void;
  onTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onMessageRead?: (data: { conversationId: string; messageId: string; readBy: string }) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
  onReaction?: (data: { messageId: string; userId: string; emoji: string }) => void;
  onMessageUpdated?: (message: any) => void;
  onMessageDeleted?: (messageId: string) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  useEffect(() => {
    if (!userInfo?.token) return;

    // Initialize socket connection
    socketRef.current = io(BASE_URL, {
      auth: { token: userInfo.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('online');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Message events
    if (options.onMessage) {
      socket.on('message', options.onMessage);
      socket.on('newMessage', options.onMessage);
    }

    if (options.onTyping) {
      socket.on('typing', options.onTyping);
      socket.on('userTyping', options.onTyping);
    }

    if (options.onMessageRead) {
      socket.on('messageRead', options.onMessageRead);
      socket.on('messagesRead', options.onMessageRead);
    }

    if (options.onUserOnline) {
      socket.on('userOnline', (data) => {
        const userId = typeof data === 'string' ? data : data.userId;
        options.onUserOnline!(userId);
      });
    }

    if (options.onUserOffline) {
      socket.on('userOffline', (data) => {
        const userId = typeof data === 'string' ? data : data.userId;
        options.onUserOffline!(userId);
      });
    }

    if (options.onReaction) {
      socket.on('reaction', options.onReaction);
    }

    if (options.onMessageUpdated) {
      socket.on('messageUpdated', options.onMessageUpdated);
    }

    if (options.onMessageDeleted) {
      socket.on('messageDeleted', options.onMessageDeleted);
    }

    // Cleanup
    return () => {
      socket.emit('offline');
      socket.off();
      socket.disconnect();
    };
  }, [userInfo?.token, options]);

  // Emit functions
  const joinRoom = useCallback((conversationId: string) => {
    socketRef.current?.emit('joinRoom', conversationId);
  }, []);

  const leaveRoom = useCallback((conversationId: string) => {
    socketRef.current?.emit('leaveRoom', conversationId);
  }, []);

  const sendMessage = useCallback((data: {
    conversationId?: string;
    receiver?: string;
    receiverId?: string;
    content?: string;
    message?: string;
    type?: string;
    replyTo?: string;
  }) => {
    socketRef.current?.emit('sendMessage', {
      receiver: data.receiver || data.receiverId,
      message: data.message || data.content,
      type: data.type || 'text',
      replyTo: data.replyTo,
    });
  }, []);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (isTyping) {
      socketRef.current?.emit('typing', { conversationId });
    } else {
      socketRef.current?.emit('stopTyping', { conversationId });
    }
  }, []);

  const markRead = useCallback((conversationId: string, messageId?: string) => {
    socketRef.current?.emit('markAsRead', {
      conversationId,
      messageId,
      senderId: conversationId
    });
  }, []);

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendTyping,
    markRead,
    isConnected,
  };
};

export default useSocket;
