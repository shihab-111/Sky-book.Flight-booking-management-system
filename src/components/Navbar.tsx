import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppView, User } from '../types/skybook';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'flights', label: 'Flights' },
  { id: 'bookings', label: 'My Bookings' },
  { id: 'admin', label: 'Admin' },
];

export function Navbar({ activeView, onNavigate, currentUser, onOpenAuth }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (view: AppView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('flights')}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
        >
          SkyBook
        </button>

        {/* Zone 2: Clean single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute inset-x-0 -bottom-[21px] h-[2px] bg-[#1D4ED8]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAuth}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
              currentUser
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
            }`}
          >
            {currentUser ? currentUser.full_name.split(' ').slice(0, 2).join(' ') : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive mobile drawer */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1"
          aria-label="Mobile Navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
