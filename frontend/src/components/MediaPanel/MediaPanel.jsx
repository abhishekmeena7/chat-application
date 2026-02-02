import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import './MediaPanel.css';

const MediaPanel = ({ selectedContact, currentUser }) => {
  const [images, setImages] = useState([]);
  const [attachments, setAttachments] = useState([]); // includes files and audio
  const { socket } = useSocket();
  const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

  // Load media from history when chat changes
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    const loadMedia = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/${currentUser.id}/${selectedContact.id}`);
        const data = await res.json();
        const imgs = [];
        const files = [];
        for (const msg of data) {
          if (msg.type === 'image' && msg.fileUrl) {
            imgs.push({ id: msg.id, url: msg.fileUrl, name: msg.fileName || msg.message });
          } else if (msg.type === 'file' && msg.fileUrl) {
            files.push({ id: msg.id, name: msg.fileName || msg.message, url: msg.fileUrl, type: 'file', icon: '📄' });
          } else if (msg.type === 'audio' && msg.fileUrl) {
            files.push({ id: msg.id, name: msg.fileName || msg.message, url: msg.fileUrl, type: 'audio', icon: '🎵' });
          }
        }
        setImages(imgs);
        setAttachments(files);
      } catch (err) {
        console.error('Media load error:', err);
      }
    };
    loadMedia();
  }, [selectedContact, currentUser, API_URL]);

  // Live updates on new media
  useEffect(() => {
    if (!socket || !selectedContact || !currentUser) return;
    const onReceive = (msg) => {
      // Only update for current chat
      const isIncoming = msg.senderId === selectedContact.id && msg.receiverId === currentUser.id;
      const isOutgoing = msg.senderId === currentUser.id && msg.receiverId === selectedContact.id;
      if (!isIncoming && !isOutgoing) return;

      if (msg.type === 'image' && msg.fileUrl) {
        setImages(prev => [{ id: msg.id, url: msg.fileUrl, name: msg.fileName || msg.message }, ...prev]);
      } else if ((msg.type === 'file' || msg.type === 'audio') && msg.fileUrl) {
        setAttachments(prev => [{ id: msg.id, name: msg.fileName || msg.message, url: msg.fileUrl, type: msg.type, icon: msg.type === 'audio' ? '🎵' : '📄' }, ...prev]);
      }
    };

    socket.on('receive_message', onReceive);
    socket.on('message_sent', onReceive);
    return () => {
      socket.off('receive_message', onReceive);
      socket.off('message_sent', onReceive);
    };
  }, [socket, selectedContact, currentUser]);

  if (!selectedContact) {
    return (
      <div className="media-panel empty">
        <p>Select a chat to view media</p>
      </div>
    );
  }

  return (
    <div className="media-panel">
      <h3 className="panel-title">Media & Attachments</h3>

      <div className="media-section">
        <h4 className="section-title">Media ({images.length})</h4>
        <div className="media-grid">
          {images.map((img) => (
            <div key={img.id} className="media-item">
              <div className="media-thumbnail">
                <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="attachments-section">
        <h4 className="section-title">Attachments ({attachments.length})</h4>
        <div className="attachments-list">
          {attachments.map((file) => (
            <div key={file.id} className="attachment-item">
              <span className="attachment-icon">{file.icon}</span>
              <span className="attachment-name">{file.name}</span>
              <a className="download-btn" href={file.url} target="_blank" rel="noopener noreferrer" title="Download">⬇️</a>
            </div>
          ))}
        </div>
      </div>

      <div className="actions-section">
        <button className="action-link">📷 View All Media</button>
        <button className="action-link">🔍 Search in Chat</button>
        <button className="action-link">ℹ️ Chat Details</button>
      </div>
    </div>
  );
};

export default MediaPanel;
