import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User, UserRole } from '../types/skybook';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: Omit<User, 'user_id' | 'password_hash'>) => User;
  onLogout: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  users,
  onLogin,
  onRegister,
  onLogout,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('shihab@skybook.com');
  const [password, setPassword] = useState('skybook123');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const matched = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!matched) {
      setError('No account found with this email address.');
      return;
    }
    if (password.trim().length < 4) {
      setError('Please enter your password (minimum 4 characters).');
      return;
    }
    onLogin(matched);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || password.length < 4) {
      setError('Please complete all fields with a valid password.');
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setError('An account with this email already exists.');
      return;
    }
    const created = onRegister({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
    });
    onLogin(created);
    onClose();
  };

  const quickFill = (targetEmail: string) => {
    setMode('login');
    setEmail(targetEmail);
    setPassword('skybook123');
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="auth-modal-title" className="font-display text-lg font-bold text-slate-900">
            {currentUser ? 'Account & Session' : mode === 'login' ? 'Sign in to SkyBook' : 'Create SkyBook Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {currentUser ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Signed in as</p>
                <p className="text-lg font-bold text-slate-900">{currentUser.full_name}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{currentUser.email}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentUser.phone}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-900 capitalize">{currentUser.role}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <p className="text-xs font-medium text-slate-500">Switch Demo Role</p>
                <div className="grid grid-cols-1 gap-2">
                  {users.map((u) => {
                    const isCurrent = u.user_id === currentUser.user_id;
                    return (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => {
                          onLogin(u);
                          onClose();
                        }}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left text-sm transition-colors cursor-pointer ${
                          isCurrent
                            ? 'border-[#1D4ED8] bg-[#1D4ED8]/5 text-slate-900 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>{u.full_name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                        <span className="text-xs font-mono text-slate-600 capitalize">{u.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Segmented mode selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                  {error}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="auth-email" className="block text-xs font-medium text-slate-600">
                      Email Address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                      placeholder="name@skybook.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="auth-password" className="block text-xs font-medium text-slate-600">
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>

                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500">Quick-fill demo accounts</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => quickFill('shihab@skybook.com')}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Customer Account
                      </button>
                      <button
                        type="button"
                        onClick={() => quickFill('admin@skybook.com')}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Admin Account
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reg-name" className="block text-xs font-medium text-slate-600">
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                      placeholder="MD Shihab Ahmmed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="reg-email" className="block text-xs font-medium text-slate-600">
                        Email
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-600">
                        Phone
                      </label>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                        placeholder="+880 17XX-XXXXXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="reg-pass" className="block text-xs font-medium text-slate-600">
                        Password
                      </label>
                      <input
                        id="reg-pass"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-role" className="block text-xs font-medium text-slate-600">
                        Account Role
                      </label>
                      <select
                        id="reg-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#1D4ED8]"
                      >
                        <option value="customer">Customer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
