import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../atoms/Button/Button';

type SidebarProps = {
  className?: string;
}

export const UserSidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m5.5-13.5l-4.2 4.2m-2.6 2.6L6.5 16.5M1 12h6m6 0h6M6.5 7.5l4.2 4.2m2.6 2.6l4.2 4.2"></path>
        </svg>
      ),
      path: '/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`bg-white border-r border-gray-200 h-full ${className}`}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Navigation</h2>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={isActive(item.path) ? 'text-blue-600' : 'text-gray-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Button>
          ))}

          <Button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-all mt-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </Button>
        </nav>
      </div>
    </div>
  );
};
