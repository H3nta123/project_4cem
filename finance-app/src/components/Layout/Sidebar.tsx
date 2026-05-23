import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, ArrowLeftRight, PieChart, Wallet, Download, HelpCircle, Settings, Bell } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  {
    group: 'ОСНОВНЫЕ', items: [
      { path: '/', icon: BarChart3, label: 'Бюджет' },
      { path: '/operations', icon: ArrowLeftRight, label: 'Операции' },
      { path: '/analytics', icon: PieChart, label: 'Аналитика' },
    ]
  },
  {
    group: 'УПРАВЛЕНИЕ', items: [
      { path: '/finances', icon: Wallet, label: 'Финансы', badge: true },
    ]
  },
  {
    group: 'ИНСТРУМЕНТЫ', items: [
      { path: '/import', icon: Download, label: 'Импорт' },
      { path: '/whatif', icon: HelpCircle, label: 'Что если' },
      { path: '/settings', icon: Settings, label: 'Настройки' },
    ]
  },
];

export default function Sidebar() {
  const location = useLocation();
  const unreadCount = 0; // Notifications not yet implemented

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Wallet size={20} />
        </div>
        <span className="sidebar-logo-text">ФинансПро</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(group => (
          <div key={group.group} className="sidebar-group">
            <span className="sidebar-group-label">{group.group}</span>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {('badge' in item && item.badge) && unreadCount > 0 && (
                    <span className="sidebar-badge">{unreadCount}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-notif-btn" title="Уведомления">
          <Bell size={18} />
          {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
        </button>
      </div>
    </aside>
  );
}
