import { useState, useEffect } from 'react';
import './ContactList.css';
import { getTimeAgo } from '../../utils/dateUtils';
import { useSocket } from '../../context/SocketContext';

const ContactList = ({ selectedContact, setSelectedContact, showChat, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const { socket } = useSocket();
  const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users?currentUserId=${currentUser.id}`);
        const users = await response.json();
        
        setContacts(users.map(user => ({
          id: user.id,
          name: user.username,
          label: 'user',
          lastMessage: 'Start a conversation',
          lastMessageTime: null,
          avatar: user.avatar,
          isOnline: user.isOnline
        })));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser, API_URL]);

  // Listen for online/offline events
  useEffect(() => {
    if (!socket) return;

    socket.on('user_online', (data) => {
      setContacts(prev => prev.map(contact => 
        contact.id === data.userId 
          ? { ...contact, isOnline: true }
          : contact
      ));
    });

    socket.on('user_offline', (data) => {
      setContacts(prev => prev.map(contact => 
        contact.id === data.userId 
          ? { ...contact, isOnline: false }
          : contact
      ));
    });

    socket.on('online_users', (users) => {
      const onlineUserIds = users.map(u => u.id);
      setContacts(prev => prev.map(contact => ({
        ...contact,
        isOnline: onlineUserIds.includes(contact.id)
      })));
    });

    return () => {
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('online_users');
    };
  }, [socket]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`contact-list ${showChat ? 'hide-on-mobile' : ''}`}>
      <div className="contact-list-header">
        <h2>Chats</h2>
        <input
          type="text"
          className="search-input"
          placeholder="Search contacts"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="contacts">
        {filteredContacts.length === 0 ? (
          <div className="no-contacts">
            <p>No users available</p>
            <small>Ask others to register!</small>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
              onClick={() => setSelectedContact(contact)}
            >
              <div className="contact-avatar">
                <span>{contact.avatar}</span>
                <div className={`status-indicator ${contact.isOnline ? 'online' : 'offline'}`}></div>
              </div>

              <div className="contact-info">
                <p className="contact-name">{contact.name}</p>
                <p className="last-message">{contact.lastMessage}</p>
              </div>

              {contact.lastMessageTime && (
                <span className="message-time">{getTimeAgo(contact.lastMessageTime)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;
