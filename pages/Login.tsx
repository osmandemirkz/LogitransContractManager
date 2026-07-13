import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, getStoredManagers, StoredManager } from '@/hooks/useAuth';
import { FileText, LogIn, Eye, EyeOff, User, Lock, Loader2 } from 'lucide-react';
import { COMPANIES } from '@/constants/companies';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { loginAsAdmin, loginAsManager } = useAuth();
  const [mode, setMode] = useState<'select' | 'admin' | 'manager'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [selectedMgrId, setSelectedMgrId] = useState('');
  const [mgrPassword, setMgrPassword] = useState('');
  const [showMgrPass, setShowMgrPass] = useState(false);
  const [managers, setManagers] = useState<StoredManager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    getStoredManagers().then(list => {
      setManagers(list);
      setLoadingManagers(false);
    });
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginAsAdmin(email, password);
    if (ok) {
      toast.success('Добро пожаловать, Админ!');
      onLogin();
    } else {
      toast.error('Неверный email или пароль');
    }
  };

  const handleManagerSelect = async (managerId: string) => {
    const mgr = managers.find(m => m.id === managerId);
    if (!mgr) return;
    if (!mgr.password || mgr.password.trim() === '') {
      setLoggingIn(true);
      const ok = await loginAsManager(managerId);
      setLoggingIn(false);
      if (ok) {
        toast.success(`Добро пожаловать, ${mgr.name}!`);
        onLogin();
      }
    } else {
      setSelectedMgrId(managerId);
      setMode('manager');
    }
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    const ok = await loginAsManager(selectedMgrId, mgrPassword);
    setLoggingIn(false);
    if (ok) {
      const mgr = managers.find(m => m.id === selectedMgrId);
      toast.success(`Добро пожаловать, ${mgr?.name}!`);
      onLogin();
    } else {
      toast.error('Неверный пароль');
    }
  };

  const selectedMgr = managers.find(m => m.id === selectedMgrId);
  const selectedMgrCompany = COMPANIES.find(c => c.id === (selectedMgr?.company_id || selectedMgr?.companyId));

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'hsl(215 35% 10%)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ border: '1px solid hsl(215 22% 22%)' }}
      >
        {/* Header */}
        <div className="px-8 py-6 text-center" style={{ background: 'hsl(215 35% 13%)' }}>
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
            style={{ background: 'hsl(38 92% 50%)' }}
          >
            <FileText size={28} style={{ color: 'hsl(215 28% 12%)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(210 20% 95%)' }}>
            LOGITRANS
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(215 15% 55%)' }}>
            Contract Manager
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6" style={{ background: 'hsl(215 28% 15%)' }}>
          {/* SELECT MODE */}
          {mode === 'select' && (
            <div className="space-y-4">
              <p className="text-sm font-medium mb-4 text-center" style={{ color: 'hsl(210 20% 80%)' }}>
                Выберите пользователя для входа
              </p>

              {loadingManagers ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(38 92% 50%)' }} />
                </div>
              ) : managers.length > 0 ? (
                <div className="space-y-2">
                  <p className="form-label-style mb-2">Менеджеры</p>
                  {managers.map(mgr => {
                    const company = COMPANIES.find(c => c.id === (mgr.company_id || mgr.companyId));
                    const hasPassword = mgr.password && mgr.password.trim() !== '';
                    return (
                      <button
                        key={mgr.id}
                        onClick={() => handleManagerSelect(mgr.id)}
                        disabled={loggingIn}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:opacity-90 disabled:opacity-60"
                        style={{ background: 'hsl(215 25% 20%)', border: '1px solid hsl(215 22% 28%)' }}
                      >
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                          style={{ background: 'hsl(220 70% 32%)' }}
                        >
                          <User size={16} style={{ color: 'white' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 90%)' }}>
                            {mgr.name}
                          </p>
                          <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>
                            {company?.nameRu || mgr.company_id}
                          </p>
                        </div>
                        {hasPassword && (
                          <Lock size={13} style={{ color: 'hsl(38 92% 50%)', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="text-center py-4 rounded-lg"
                  style={{ background: 'hsl(215 25% 18%)', border: '1px solid hsl(215 22% 26%)' }}
                >
                  <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>
                    Менеджеры не добавлены — войдите как Админ
                  </p>
                </div>
              )}

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'hsl(215 22% 26%)' }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs" style={{ background: 'hsl(215 28% 15%)', color: 'hsl(215 15% 45%)' }}>
                    или
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMode('admin')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}
              >
                <LogIn size={16} />
                Войти как Администратор
              </button>
            </div>
          )}

          {/* ADMIN LOGIN */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-xs flex items-center gap-1 mb-2"
                style={{ color: 'hsl(38 92% 50%)' }}
              >
                ← Назад
              </button>
              <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 85%)' }}>
                Вход для администратора
              </p>
              <div>
                <label className="form-label-style block mb-1">Email</label>
                <input
                  type="email"
                  className="form-input-style"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="osmandemir@gmail.com"
                  required
                />
              </div>
              <div>
                <label className="form-label-style block mb-1">Пароль</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input-style pr-9"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'hsl(215 15% 50%)' }}
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}
              >
                Войти
              </button>
            </form>
          )}

          {/* MANAGER PASSWORD LOGIN */}
          {mode === 'manager' && selectedMgr && (
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setMode('select'); setMgrPassword(''); }}
                className="text-xs flex items-center gap-1 mb-2"
                style={{ color: 'hsl(38 92% 50%)' }}
              >
                ← Назад
              </button>
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'hsl(215 25% 20%)' }}
              >
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                  style={{ background: 'hsl(220 70% 32%)' }}
                >
                  <User size={18} style={{ color: 'white' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 90%)' }}>
                    {selectedMgr.name}
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>
                    {selectedMgrCompany?.nameRu}
                  </p>
                </div>
              </div>
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1">
                  <Lock size={11} /> Пароль
                </label>
                <div className="relative">
                  <input
                    type={showMgrPass ? 'text' : 'password'}
                    className="form-input-style pr-9"
                    value={mgrPassword}
                    onChange={e => setMgrPassword(e.target.value)}
                    placeholder="••••"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'hsl(215 15% 50%)' }}
                    onClick={() => setShowMgrPass(v => !v)}
                  >
                    {showMgrPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}
              >
                {loggingIn && <Loader2 size={15} className="animate-spin" />}
                Войти
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
