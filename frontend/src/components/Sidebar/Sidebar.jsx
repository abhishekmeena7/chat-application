import './Sidebar.css';
import { FiLogOut } from 'react-icons/fi';

const Sidebar = ({ activeMenu, setActiveMenu, user, onLogout }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'apps', label: 'Apps', icon: '📱' },
    { id: 'chats', label: 'Chats', icon: '💬' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'users', label: 'Users', icon: '👥' }
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">💬</div>
        <h3>Chat App</h3>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => setActiveMenu(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">{user?.avatar || 'U'}</div>
        <div className="user-info">
          <p className="user-name">{user?.username || 'User'}</p>
          <p className="user-role">Online</p>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
          <FiLogOut />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
