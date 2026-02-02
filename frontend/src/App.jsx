import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPanel from './components/ChatPanel/ChatPanel';
import MessageArea from './components/MessageArea/MessageArea';
import MediaPanel from './components/MediaPanel/MediaPanel';
import Login from './components/Auth/Login';
import { SocketProvider } from './context/SocketContext';


function App() {
  const [activeMenu, setActiveMenu] = useState('chats');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setSelectedContact(null);
    setShowChat(false);
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setShowChat(true);
  };

  const handleBackToContacts = () => {
    setShowChat(false);
  };

  // Show login screen if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <SocketProvider user={user}>
      <div className="app-container">
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu}
          user={user}
          onLogout={handleLogout}
        />
        
        {activeMenu === 'chats' && (
          <div className="chat-layout">
            <ChatPanel 
              currentUserId={user.id}
              onSelectUser={handleContactSelect}
              selectedContactId={selectedContact?.id}
              showChat={showChat}
            />
            <MessageArea 
              selectedContact={selectedContact}
              showChat={showChat}
              onBack={handleBackToContacts}
              currentUser={user}
            />
            <MediaPanel selectedContact={selectedContact} currentUser={user} />
          </div>
        )}

        {activeMenu === 'home' && (
          <div className="content-area">
            <div className="page-container">
              <h1>Welcome {user.username}!</h1>
              <p>Select "Chats" from the sidebar to start messaging</p>
            </div>
          </div>


          
        )}

        {activeMenu === 'apps' && (
          <div className="content-area">
            <div className="page-container">
              <h1>Apps</h1>
              <p>Your applications will appear here</p>
            </div>
          </div>
        )}

        {activeMenu === 'calendar' && (
          <div className="content-area">
            <div className="page-container">
              <h1>Calendar</h1>
              <p>View and manage your events here</p>
            </div>
          </div>
        )}

        {activeMenu === 'users' && (
          <div className="content-area">
            <div className="page-container">
              <h1>Users</h1>
              <p>Browse and manage users here</p>
            </div>
          </div>
        )}
      </div>
    </SocketProvider>
  );
}

export default App;
