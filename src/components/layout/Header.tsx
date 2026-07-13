import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Archive, Menu, X, Shield, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Вы вышли из системы');
  };

  return (
    <header
      className="flex items-center justify-between px-4 py-2.5 no-print"
      style={{
        background: 'hsl(215 35% 12%)',
        borderBottom: '1px solid hsl(215 22% 22%)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded"
          style={{ background: 'hsl(38 92% 50%)' }}
        >
          <FileText size={16} style={{ color: 'hsl(215 28% 12%)' }} />
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'hsl(210 20% 95%)', letterSpacing: '0.02em' }}>
            LOGITRANS
          </div>
          <div className="text-xs" style={{ color: 'hsl(215 15% 55%)', marginTop: '-2px' }}>
            Contract Manager
          </div>
        </div>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
          style={{
            background: location.pathname === '/' ? 'hsl(215 25% 22%)' : 'transparent',
            color: location.pathname === '/' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 60%)',
          }}
        >
          <FileText size={13} />
          Новый договор
        </Link>
        <Link
          to="/contracts"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
          style={{
            background: location.pathname === '/contracts' ? 'hsl(215 25% 22%)' : 'transparent',
            color: location.pathname === '/contracts' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 60%)',
          }}
        >
          <Archive size={13} />
          Архив
        </Link>
        {currentUser?.role === 'admin' && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: location.pathname === '/admin' ? 'hsl(215 25% 22%)' : 'transparent',
              color: location.pathname === '/admin' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 60%)',
            }}
          >
            <Shield size={13} />
            Админ
          </Link>
        )}
      </nav>

      {/* User + Logout */}
      <div className="hidden md:flex items-center gap-2">
        {currentUser && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ background: 'hsl(215 25% 20%)' }}
            >
              <User size={12} style={{ color: 'hsl(38 92% 50%)' }} />
              <span className="text-xs" style={{ color: 'hsl(210 20% 75%)' }}>
                {currentUser.name.length > 20 ? currentUser.name.slice(0, 20) + '…' : currentUser.name}
              </span>
              {currentUser.role === 'admin' && (
                <span
                  className="text-xs px-1 rounded"
                  style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)', fontSize: '9px', fontWeight: 700 }}
                >
                  ADMIN
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 p-1.5 rounded transition-all hover:bg-white/10"
              style={{ color: 'hsl(215 15% 55%)' }}
              title="Выйти"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden p-1.5 rounded"
        style={{ color: 'hsl(215 15% 60%)' }}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="absolute top-full left-0 right-0 md:hidden flex flex-col gap-1 p-3"
          style={{ background: 'hsl(215 35% 12%)', borderBottom: '1px solid hsl(215 22% 22%)', zIndex: 99 }}
        >
          {currentUser && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded mb-1"
              style={{ background: 'hsl(215 25% 18%)' }}
            >
              <User size={13} style={{ color: 'hsl(38 92% 50%)' }} />
              <span className="text-xs" style={{ color: 'hsl(210 20% 80%)' }}>{currentUser.name}</span>
            </div>
          )}
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={{ color: 'hsl(210 20% 85%)' }} onClick={() => setMobileMenuOpen(false)}>
            <FileText size={15} /> Новый договор
          </Link>
          <Link to="/contracts" className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={{ color: 'hsl(210 20% 85%)' }} onClick={() => setMobileMenuOpen(false)}>
            <Archive size={15} /> Архив
          </Link>
          {currentUser?.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={{ color: 'hsl(38 92% 50%)' }} onClick={() => setMobileMenuOpen(false)}>
              <Shield size={15} /> Админ панель
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm mt-1"
            style={{ color: 'hsl(215 15% 55%)' }}
          >
            <LogOut size={15} /> Выйти
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
