import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ShowcaseShopView } from './components/ShowcaseShopView';
import { InventoryManagementView } from './components/InventoryManagementView';
import { FinanceManagementView } from './components/FinanceManagementView';
import { ForecastingView } from './components/ForecastingView';
import { BarcodeView } from './components/BarcodeView';
import { PosView } from './components/PosView';
import { AiChatbotView } from './components/AiChatbotView';
import { AuthModal } from './components/AuthModal';

const MainLayout: React.FC = () => {
  const { currentUser, isDarkMode } = useStore();

  // Initial active tab based on role
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (currentUser.role === 'owner') return 'dashboard';
    if (currentUser.role === 'staff') return 'pos';
    return 'showcase';
  });

  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    initialTab: 'login' | 'signup';
  }>({
    isOpen: false,
    initialTab: 'signup',
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'signup') => {
    setAuthModalState({ isOpen: true, initialTab: mode });
  };

  // Automatically direct to role-specific default view when role switches
  useEffect(() => {
    if (currentUser.role === 'owner') {
      setActiveTab('dashboard');
    } else if (currentUser.role === 'staff') {
      setActiveTab('pos');
    } else {
      setActiveTab('showcase');
    }
  }, [currentUser.role]);

  // Background clothing store interior image as requested
  const bgImageUrl =
    'https://png.pngtree.com/thumb_back/fh260/background/20251026/pngtree-modern-clothing-store-interior-with-apparel-for-sale-image_20052360.webp';

  return (
    <div
      className={`min-h-screen relative font-sans transition-colors duration-500 text-stone-100 ${
        isDarkMode ? 'dark bg-stone-950' : 'light bg-stone-100 text-stone-900'
      }`}
    >
      {/* Background Apparel Store Image with Glassmorphic Gradient Overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          filter: isDarkMode ? 'brightness(0.32) saturate(1.1)' : 'brightness(0.85) saturate(1.15)',
        }}
      />

      {/* Dark / Light Brown & Orange Ambient Glass Overlays */}
      <div
        className={`fixed inset-0 z-0 pointer-events-none transition-all duration-500 ${
          isDarkMode
            ? 'bg-gradient-to-b from-stone-950/85 via-stone-950/90 to-amber-950/95'
            : 'bg-gradient-to-b from-amber-50/85 via-orange-50/90 to-amber-100/95'
        }`}
      />

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Bar strictly matching role requirements */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAuth={handleOpenAuth}
          onOpenCart={() => setCartDrawerOpen(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20">
          {activeTab === 'dashboard' && currentUser.role === 'owner' && <DashboardView />}

          {activeTab === 'inventory' &&
            (currentUser.role === 'owner' || currentUser.role === 'staff') && (
              <InventoryManagementView />
            )}

          {activeTab === 'finance' && currentUser.role === 'owner' && <FinanceManagementView />}

          {activeTab === 'forecasting' && currentUser.role === 'owner' && <ForecastingView />}

          {activeTab === 'ai_chat' && currentUser.role === 'owner' && <AiChatbotView />}

          {activeTab === 'showcase' && (
            <ShowcaseShopView
              isCartOpen={cartDrawerOpen}
              setIsCartOpen={setCartDrawerOpen}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {activeTab === 'pos' &&
            (currentUser.role === 'owner' || currentUser.role === 'staff') && <PosView />}
        </main>

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalState.isOpen}
          initialTab={authModalState.initialTab}
          onClose={() => setAuthModalState((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}
