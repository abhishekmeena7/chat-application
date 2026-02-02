import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { getTimeAgo } from '../../utils/dateUtils';
import './ChatPanel.css';

const ChatPanel = ({ currentUserId, onSelectUser, selectedContactId }) => {
  const [users, setUsers] = useState([]);
  const { socket } = useSocket();
  const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

  // Fetch all users except current user
  useEffect(() => {
    if (!currentUserId) return;
    fetch(`${API_URL}/api/users?currentUserId=${currentUserId}`)
      .then(res => res.json())
      .then(async (list) => {
        // Enrich with last message preview
        const enriched = await Promise.all(
          list.map(async (u) => {
            try {
              const res = await fetch(`${API_URL}/api/messages/${currentUserId}/${u.id}`);
              const msgs = await res.json();
              const last = msgs[msgs.length - 1];
              const preview = last
                ? (last.type === 'image' ? 'Photo' : last.type === 'file' ? (last.fileName || 'File') : last.type === 'audio' ? 'Voice message' : last.message)
                : 'No messages yet';
              const t = last ? last.timestamp : null;
              return { ...u, lastMessage: preview, lastMessageTime: t, unread: 0 };
            } catch (e) {
              return { ...u, lastMessage: 'No messages yet', lastMessageTime: null, unread: 0 };
            }
          })
        );
        // Remove the first four empty chats (no last message/time or unknown username)
        let removed = 0;
        const cleaned = enriched.filter(u => {
          const name = typeof u.username === 'string' ? u.username.trim() : '';
          const isUnknown = !name || name.toLowerCase() === 'unknown';
          const isEmptyChat = (!u.lastMessageTime) && (!u.lastMessage || u.lastMessage === 'No messages yet');
          if ((isUnknown || isEmptyChat) && removed < 4) {
            removed++;
            return false;
          }
          return true;
        });
        setUsers(cleaned);
      });
  }, [currentUserId, API_URL]);

  // Listen for real-time online/offline updates
  useEffect(() => {
    if (!socket) return;
    const handleUserOnline = ({ userId }) => {
      setUsers(users => users.map(u => u.id === userId ? { ...u, isOnline: true } : u));
    };
    const handleUserOffline = ({ userId }) => {
      setUsers(users => users.map(u => u.id === userId ? { ...u, isOnline: false } : u));
    };
    const handleOnlineUsers = (list) => {
      const ids = list.map(u => u.id);
      setUsers(users => users.map(u => ({ ...u, isOnline: ids.includes(u.id) })));
    };
    const handleReceiveMessage = (msg) => {
      // Only handle messages where current user is the receiver
      if (!msg.senderId || !msg.receiverId || msg.receiverId !== currentUserId) return;
      const otherId = msg.senderId;
      const preview = msg.type === 'image' ? 'Photo' : msg.type === 'file' ? (msg.fileName || 'File') : msg.type === 'audio' ? 'Voice message' : msg.message;
      setUsers(prev => prev.map(u => {
        if (u.id !== otherId) return u;
        const inc = selectedContactId === otherId ? 0 : 1;
        return { ...u, lastMessage: preview, lastMessageTime: msg.timestamp, unread: (u.unread || 0) + inc };
      }));
    };

    const handleMessageSent = (msg) => {
      // Update preview when current user is the sender
      if (!msg.senderId || !msg.receiverId || msg.senderId !== currentUserId) return;
      const otherId = msg.receiverId;
      const preview = msg.type === 'image' ? 'Photo' : msg.type === 'file' ? (msg.fileName || 'File') : msg.type === 'audio' ? 'Voice message' : msg.message;
      setUsers(prev => prev.map(u => u.id === otherId ? { ...u, lastMessage: preview, lastMessageTime: msg.timestamp } : u));
    };
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('online_users', handleOnlineUsers);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('online_users', handleOnlineUsers);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
    };
  }, [socket, selectedContactId, currentUserId]);

  // Clear unread when a conversation becomes selected
  useEffect(() => {
    if (!selectedContactId) return;
    setUsers(prev => prev.map(u => u.id === selectedContactId ? { ...u, unread: 0 } : u));
  }, [selectedContactId]);

  return (
    <div className="chat-panel">
      <h3>Chats</h3>
      <ul>
        {users.map(user => (
          <li
            key={user.id}
            className={`user-item ${user.isOnline ? 'online' : 'offline'}`}
            onClick={() => {
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, unread: 0 } : u));
              onSelectUser(user);
            }}
          >
            <div className="avatar-wrap">
              <span className="avatar">{user.avatar}</span>
              <span className={`status-dot ${user.isOnline ? 'online' : 'offline'}`}></span>
              {user.unread > 0 && (
                <span className="unread-badge">{user.unread}</span>
              )}
            </div>
            <div className="user-main">
              <div className="top-row">
                <span className="username">{user.username}</span>
                <span className="time">{user.lastMessageTime ? getTimeAgo(user.lastMessageTime) : ''}</span>
              </div>
              <div className="bottom-row">
                <span className="last-message">{user.lastMessage || 'No messages yet'}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatPanel;
