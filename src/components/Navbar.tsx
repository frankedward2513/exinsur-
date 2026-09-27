import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  LayoutDashboard,
  Boxes,
  DollarSign,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Barcode,
  Store,
  Sun,
  Moon,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  UserCheck,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'inventory'
  | 'finance'
  | 'forecasting'
  | 'ai_chat'
  | 'showcase'
  | 'barcode'
  | 'pos';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuth,
  onOpenCart,
}) => {
  const { isDarkMode, toggleDarkMode, currentUser, logout, cart } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Define navigation items without numbers and with Hi Im your AI Exins
  const getNavItems = () => {
    if (currentUser.role === 'owner') {
      return [
        { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory' as ActiveTab, label: 'Inventory Management', icon: Boxes },
        { id: 'finance' as ActiveTab, label: 'Finance Management', icon: DollarSign },
        { id: 'forecasting' as ActiveTab, label: 'Forecasting', icon: TrendingUp },
        { id: 'ai_chat' as ActiveTab, label: 'Hi Im your AI Exins', icon: Sparkles },
        { id: 'showcase' as ActiveTab, label: 'Showcase Shop', icon: ShoppingBag },
        { id: 'pos' as ActiveTab, label: 'POS', icon: Store },
      ];
    } else if (currentUser.role === 'staff') {
      return [
        { id: 'pos' as ActiveTab, label: 'POS', icon: Store },
        { id: 'inventory' as ActiveTab, label: 'Inventory Management', icon: Boxes },
        { id: 'showcase' as ActiveTab, label: 'Showcase Shop', icon: ShoppingBag },
      ];
    } else {
      // Customer
      return [
        { id: 'showcase' as ActiveTab, label: 'Showcase Shop', icon: ShoppingBag },
      ];
    }
  };

  const navItems = getNavItems();
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-stone-950/75 border-b border-orange-500/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & Store Branding: Only "JKsur+" and the tagline */}
          <div
            className="flex flex-col cursor-pointer select-none shrink-0"
            onClick={() => onSelectTab(navItems[0].id)}
          >
            <span className="font-black text-xl sm:text-2xl tracking-wider text-orange-500 font-sans leading-tight">
              JKsur+
            </span>
            <p className="text-[10px] sm:text-xs text-stone-300 italic font-medium leading-none truncate max-w-[200px] sm:max-w-none">
              “Your Next Favorite Outfit is Hiding Here.”
            </p>
          </div>

          {/* Desktop Navigation Items: Icons only with sleek hover tooltip */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group flex items-center justify-center">
                  <button
                    onClick={() => onSelectTab(item.id)}
                    className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-lg shadow-orange-600/30 border border-orange-400/40 scale-105'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent hover:border-orange-500/20'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-orange-400 group-hover:text-orange-300'
                      }`}
                    />
                  </button>

                  {/* Hover Tooltip revealing the name of the bar */}
                  <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-stone-900/95 border border-orange-500/30 text-stone-100 text-xs font-semibold whitespace-nowrap shadow-2xl backdrop-blur-xl pointer-events-none opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 z-50">
                    <span>{item.label}</span>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45 border-l border-t border-orange-500/30" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Action Icons: Cart, Dark Mode, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bag Button */}
            <button
              onClick={onOpenCart}
              title="Shopping Bag"
              className="relative p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-orange-500/50 text-stone-200 hover:text-orange-400 transition cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-orange-500/50 text-stone-200 hover:text-amber-400 transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-orange-400" />}
            </button>

            {/* Role & Account Button */}
            <div className="flex items-center gap-1.5 pl-1">
              {currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email ? (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In / Sign Up</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-orange-500/50 transition cursor-pointer"
                  >
                    <div className="p-1 rounded-lg bg-orange-500/20 text-orange-400">
                      {currentUser.role === 'owner' ? (
                        <Shield className="w-4 h-4 text-orange-400" />
                      ) : currentUser.role === 'staff' ? (
                        <UserCheck className="w-4 h-4 text-amber-400" />
                      ) : (
                        <User className="w-4 h-4 text-stone-300" />
                      )}
                    </div>
                    <div className="hidden md:block text-left text-xs">
                      <p className="font-semibold text-stone-200 leading-tight truncate max-w-[120px]">
                        {currentUser.displayName}
                      </p>
                      <p className="text-[10px] text-orange-400 uppercase font-mono font-medium">
                        {currentUser.role}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="hidden sm:flex p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-red-500/40 text-stone-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 text-stone-200"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-orange-500/20 bg-stone-950/98 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-2xl">
          {currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email ? (
            <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-orange-500/20 mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Browsing as Guest</p>
                <p className="text-[11px] text-stone-400">Sign in to add to bag and make purchase</p>
              </div>
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition shadow-md whitespace-nowrap"
              >
                Sign In / Up
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-stone-900/80 border border-orange-500/20 mb-3 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-[11px] text-stone-400">Logged in as</p>
                <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 inline-block mt-0.5">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition"
                >
                  Account
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 hover:text-white transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
