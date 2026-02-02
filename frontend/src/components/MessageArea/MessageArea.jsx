import { useEffect, useRef, useState } from 'react';
import { FiSmile, FiMic, FiImage, FiPaperclip, FiSend, FiMoreVertical, FiPhone, FiVideo } from 'react-icons/fi';
import './MessageArea.css';
import { formatTime } from '../../utils/dateUtils';
import { useSocket } from '../../context/SocketContext';

const MessageArea = ({ selectedContact, showChat, onBack, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingStatus, setTypingStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();
  const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  const [showActions, setShowActions] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const startVoiceCall = () => { alert('Voice call feature is not implemented yet.'); };
  const startVideoCall = () => { alert('Video call feature is not implemented yet.'); };
  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥', '✨', '👏', '😎', '🤗'];

  // Load chat history
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/messages/${currentUser.id}/${selectedContact.id}`);
        const data = await response.json();
        setMessages(data.map(msg => ({
          id: msg.id,
          sender: msg.senderId === currentUser.id ? 'You' : (selectedContact.username || selectedContact.name),
          text: msg.message,
          type: msg.senderId === currentUser.id ? 'sent' : 'received',
          timestamp: new Date(msg.timestamp),
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          messageType: msg.type
        })));
      } catch (error) {
        console.error('Error loading history:', error);
      }
    };
    loadHistory();
  }, [selectedContact, currentUser, API_URL]);

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Listen for incoming messages and typing
  useEffect(() => {
    if (!socket || !selectedContact) return;
    const handleMessage = (data) => {
      if (data.senderId === selectedContact.id) {
        setMessages(prev => [...prev, {
          id: data.id,
          sender: selectedContact.username || selectedContact.name,
          text: data.message,
          type: 'received',
          timestamp: new Date(data.timestamp),
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          messageType: data.type
        }]);
      }
    };
    const handleTyping = (data) => { if (data.userId === selectedContact.id) setTypingStatus(data.isTyping ? `${data.username} is typing...` : ''); };
    socket.on('receive_message', handleMessage);
    socket.on('user_typing', handleTyping);
    return () => { socket.off('receive_message', handleMessage); socket.off('user_typing', handleTyping); };
  }, [socket, selectedContact]);

  const sendMessage = () => {
    if (!messageInput.trim() || !socket || !selectedContact) return;
    const newMessage = { id: Date.now().toString(), sender: 'You', text: messageInput, type: 'sent', timestamp: new Date(), messageType: 'text' };
    setMessages(prev => [...prev, newMessage]);
    socket.emit('private_message', { senderId: currentUser.id, receiverId: selectedContact.id, message: messageInput, type: 'text' });
    setMessageInput('');
    socket.emit('typing', { senderId: currentUser.id, receiverId: selectedContact.id, isTyping: false });
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleTyping = (e) => {
    const value = e.target.value; setMessageInput(value);
    if (typingTimeout) clearTimeout(typingTimeout);
    if (socket && value.trim()) {
      socket.emit('typing', { senderId: currentUser.id, receiverId: selectedContact.id, isTyping: true });
      const timeout = setTimeout(() => { socket.emit('typing', { senderId: currentUser.id, receiverId: selectedContact.id, isTyping: false }); }, 2000);
      setTypingTimeout(timeout);
    }
  };

  const addEmoji = (emoji) => { setMessageInput(messageInput + emoji); setShowEmojiPicker(false); };
  

  const clearConversation = async () => {
    if (!selectedContact || !currentUser) return;
    const ok = window.confirm('Clear all messages in this conversation?');
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/${currentUser.id}/${selectedContact.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear chat');
      // Re-fetch to ensure UI reflects server state
      try {
        const check = await fetch(`${API_URL}/api/messages/${currentUser.id}/${selectedContact.id}`);
        const data = await check.json();
        setMessages(Array.isArray(data) ? [] : []);
      } catch {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      alert('Could not clear chat');
    } finally {
      setShowActions(false);
    }
  };

  const handleFileUpload = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'photo' ? 'image/*' : '*';
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Use unified uploader (no delay for button-attach)
      uploadAttachment(file, 0);
    };
    
    input.click();
  };

  // Unified upload handler (used by button and drag/drop). Optional delay to show pending state longer on DnD.
  const uploadAttachment = async (file, delayMs = 0) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const tempId = `temp-${Date.now()}`;
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    // Add pending bubble
    setMessages(prev => [...prev, {
      id: tempId,
      sender: 'You',
      text: file.name,
      type: 'sent',
      timestamp: new Date(),
      fileUrl: previewUrl,
      fileName: file.name,
      messageType: isImage ? 'image' : 'file',
      uploading: true,
      error: false
    }]);

    try {
      // Optional delay before starting the actual network upload
      if (delayMs && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      const data = await response.json();
      const fileUrl = `${API_URL}${data.url}`;

      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, uploading: false, fileUrl, fileName: data.filename, messageType: data.mimetype?.startsWith('image/') ? 'image' : 'file' } : m));

      // Emit final message
      socket.emit('private_message', {
        senderId: currentUser.id,
        receiverId: selectedContact.id,
        message: file.name,
        type: data.mimetype?.startsWith('image/') ? 'image' : 'file',
        fileId: data.fileId,
        fileUrl,
        fileName: data.filename
      });
    } catch (err) {
      console.error('Upload error:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, uploading: false, error: true } : m));
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  };

  const renderMessage = (msg) => {
    if (msg.messageType === 'image' && msg.fileUrl) {
      return (
        <div className="message-image">
          <div className={`image-wrap ${msg.uploading ? 'is-uploading' : ''}`}>
            <img src={msg.fileUrl} alt={msg.fileName} />
            {msg.uploading && (
              <div className="uploading-indicator">
                <span className="spinner" />
                <span>Uploading...</span>
              </div>
            )}
            {msg.error && (
              <div className="uploading-indicator error">Upload failed</div>
            )}
          </div>
          <span className="message-time">{formatTime(msg.timestamp)}</span>
        </div>
      );
    } else if (msg.messageType === 'audio' && msg.fileUrl) {
      return (
        <div className="message-audio">
          <audio controls src={msg.fileUrl} />
          <span className="message-time">{formatTime(msg.timestamp)}</span>
        </div>
      );
    } else if (msg.messageType === 'file' && msg.fileUrl) {
      return (
        <div className={`message-file ${msg.uploading ? 'is-uploading' : ''}`}>
          {msg.uploading ? (
            <div className="file-uploading">
              <span className="spinner" />
              <span>Uploading {msg.text}...</span>
            </div>
          ) : (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
              📎 {msg.text}
            </a>
          )}
          {msg.error && <div className="file-error">Upload failed</div>}
          <span className="message-time">{formatTime(msg.timestamp)}</span>
        </div>
      );
    } else {
      return (
        <div className="message-content">
          <p className="message-text">{msg.text}</p>
          <span className="message-time">{formatTime(msg.timestamp)}</span>
        </div>
      );
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          const fileUrl = `${API_URL}${data.url}`;

          const newMessage = {
            id: Date.now().toString(),
            sender: 'You',
            text: file.name,
            type: 'sent',
            timestamp: new Date(),
            fileUrl: fileUrl,
            fileName: data.filename,
            messageType: 'audio'
          };

          setMessages(prev => [...prev, newMessage]);

          socket.emit('private_message', {
            senderId: currentUser.id,
            receiverId: selectedContact.id,
            message: file.name,
            type: 'audio',
            fileId: data.fileId,
            fileUrl: fileUrl,
            fileName: data.filename
          });
        } catch (err) {
          console.error('Audio upload failed', err);
          alert('Audio upload failed');
        } finally {
          stream.getTracks().forEach(t => t.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic permission error', err);
      alert('Microphone permission denied');
    }
  };

  if (!selectedContact) {
    return (
      <div className="message-area empty">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h2>Select a chat to start messaging</h2>
          <p>Choose a contact from the list</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-area ${showChat ? 'active' : ''}`}>
      <div className="message-header">
        <div className="contact-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="contact-avatar-small">
            <span>{(selectedContact.avatar) || (selectedContact.username?.[0]?.toUpperCase())}</span>
            <div className={`status-indicator ${selectedContact.isOnline ? 'online' : 'offline'}`}></div>
          </div>
          <div className="contact-details">
            <h3>{selectedContact.username || selectedContact.name}</h3>
            <p className="status">{selectedContact.isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-icon" title="Voice call" aria-label="Voice call" onClick={startVoiceCall}>
            <FiPhone />
          </button>
          <button className="header-icon" title="Video call" aria-label="Video call" onClick={startVideoCall}>
            <FiVideo />
          </button>
          <button className="menu-trigger" title="More options" aria-label="More options" onClick={() => setShowActions(v => !v)}>
            <FiMoreVertical />
          </button>
          {showActions && (
            <div className="header-menu">
              <button className="menu-item" onClick={clearConversation}>Clear Chat</button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`messages-container ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); const files = Array.from(e.dataTransfer?.files || []); if (files.length) uploadAttachment(files[0], 1200); }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type}`}>
            {renderMessage(msg)}
          </div>
        ))}
        {isDragActive && (
          <div className="drop-overlay"><div className="drop-inner">Drop file to upload</div></div>
        )}
        {typingStatus && <div className="typing-indicator">{typingStatus}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-area">
        <div className="input-wrapper">
          <button className="emoji-btn" title="Emoji" aria-label="Emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <FiSmile />
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {emojis.map((emoji) => (
                <button key={emoji} className="emoji-option" onClick={() => addEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <textarea
            className="message-input"
            placeholder="Type a message..."
            value={messageInput}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            rows="1"
          />
          <button
            className={`action-btn ${isRecording ? 'recording' : ''}`}
            title={isRecording ? 'Stop recording' : 'Record voice'}
            aria-label={isRecording ? 'Stop recording' : 'Record voice'}
            onClick={toggleRecording}
          >
            <FiMic />
          </button>
          <button className="action-btn" title="Attach image" aria-label="Attach image" onClick={() => handleFileUpload('photo')}>
            <FiImage />
          </button>
          <button className="action-btn" title="Attach file" aria-label="Attach file" onClick={() => handleFileUpload('file')}>
            <FiPaperclip />
          </button>
          <button className="send-btn" title="Send" aria-label="Send" onClick={sendMessage}>
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;
