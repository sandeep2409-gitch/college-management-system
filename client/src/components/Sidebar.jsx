import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layout,
  Calendar,
  Camera,
  BookOpen,
  Star,
  AlertCircle,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Sun,
  Moon,
  Clock,
  User,
  QrCode,
  UserPlus,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Overview' },
    { path: '/dashboard', icon: Layout, label: 'Dashboard', adminOnly: true },
    { path: '/manage-students', icon: Users, label: 'Students', adminOnly: true },
    { path: '/calendar', icon: Calendar, label: 'Events' },
    { path: '/timetable', icon: Clock, label: 'Time Table' },
    { path: '/attendance', icon: QrCode, label: 'Attendance' },
    { path: '/resources', icon: BookOpen, label: 'Resources' },
    { path: '/visitors', icon: UserPlus, label: 'Visitors' },
    { path: '/outpass', icon: Send, label: 'Out Pass' },
    { path: '/feedback', icon: Star, label: 'Faculty' },
    { path: '/complaints', icon: AlertCircle, label: 'Complaints' },
    { path: '/profile', icon: User, label: 'My Grid' },
  ];

  const filteredNav = navItems.filter(item => !item.adminOnly || (user?.role === 'admin'));

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div style={{
          width: '40px',
          height: '40px',
          background: 'var(--primary)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 12px var(--primary-glow)'
        }}>
          <Layout size={24} />
        </div>
        {!isCollapsed && (
          <h2 style={{ fontSize: '1.25rem', whiteSpace: 'nowrap' }}>College 360</h2>
        )}
      </div>

      <nav className="sidebar-nav">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} style={{ minWidth: '20px' }} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={toggleTheme}
          className="nav-item"
          style={{ background: 'transparent', width: '100%', border: 'none', cursor: 'pointer' }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {!isCollapsed && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {user ? (
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="nav-item"
            style={{ background: 'transparent', width: '100%', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        ) : (
          <Link
            to="/login"
            className="nav-item"
            style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', width: '100%' }}
          >
            <Users size={20} />
            {!isCollapsed && <span>Sign In</span>}
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="nav-item"
          style={{ background: 'var(--bg-card)', marginTop: '8px', justifyContent: 'center' }}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {!isCollapsed && user && (
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', margin: '16px', borderRadius: '16px' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
            <Users size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
