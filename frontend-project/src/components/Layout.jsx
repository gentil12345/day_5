import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/cars', label: 'Car', icon: '🚗' },
  { path: '/slots', label: 'ParkingSlot', icon: '🅿️' },
  { path: '/records', label: 'ParkingRecord', icon: '📋' },
  { path: '/payments', label: 'Payment', icon: '💳' },
  { path: '/reports', label: 'Reports', icon: '📈' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-1.5">
                <span className="text-2xl">🅿️</span>
              </div>
              <div>
                <span className="font-bold text-xl tracking-wide">SmartPark</span>
                <p className="text-blue-200 text-xs leading-none">Parking Management System</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* User + Logout */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-blue-200 text-sm">
                👤 {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🚪 Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-blue-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-blue-800 px-4 pb-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium mb-1 transition-colors ${
                    isActive
                      ? 'bg-white text-blue-700'
                      : 'text-blue-100 hover:bg-blue-600'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <div className="border-t border-blue-600 mt-2 pt-2 flex items-center justify-between">
              <span className="text-blue-200 text-sm">👤 {user?.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Page Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-blue-800 text-blue-200 text-center py-3 text-sm">
        © 2025 SmartPark — Parking Space Sales Management System | Rubavu District, Western Province, Rwanda
      </footer>
    </div>
  );
}
