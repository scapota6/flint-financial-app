import { useLocation, Link } from 'wouter';
import { LayoutGrid, CreditCard, TrendingUp, Cog } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface NavItem {
  path: string;
  icon: typeof LayoutGrid;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: LayoutGrid, label: 'Home' },
  { path: '/accounts', icon: CreditCard, label: 'Accounts' },
  { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { path: '/profile', icon: Cog, label: 'Profile' },
];

export function MobileNav() {
  const [location] = useLocation();

  const handleTap = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path === '/dashboard' && location === '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleTap}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F2ED] pb-20">
      {children}
      <MobileNav />
    </div>
  );
}
