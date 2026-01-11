import { useState, useEffect, memo, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { isInternalTester } from '@/lib/feature-flags';

interface AuthUser {
  id: string;
  email: string;
}

const GlobalNavbar = memo(function GlobalNavbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: user } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
  });

  const navLinks = useMemo(() => {
    const links = [
      { href: '/', label: 'Dashboard', comingSoon: false },
    ];
    
    if (isInternalTester(user?.email)) {
      links.push({ href: '/analytics', label: 'Analytics', comingSoon: false });
    }
    
    links.push(
      { href: '/portfolio', label: 'Portfolio', comingSoon: false },
      { href: '/accounts', label: 'Accounts', comingSoon: false },
      { href: '/transfers', label: 'Transfers (Coming Soon)', comingSoon: true },
      { href: '/trading', label: 'Trading (Coming Soon)', comingSoon: true },
    );
    
    return links;
  }, [user?.email]);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      // Use the correct logout endpoint
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location.startsWith(href);
  };

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md"
    >
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/dashboard">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="text-2xl font-bold">
                  <span className="text-gray-900">
                    FLINT
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8 flex-1 justify-center">
            {navLinks.map((link) => (
              link.comingSoon ? (
                <span 
                  key={link.href}
                  className="text-sm font-medium text-gray-400 cursor-not-allowed relative"
                >
                  {link.label}
                </span>
              ) : (
                <Link key={link.href} href={link.href}>
                  <span className={`text-sm font-medium transition-all duration-200 cursor-pointer relative
                    ${isActiveLink(link.href)
                      ? 'text-gray-900 after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-yellow-400 after:rounded-full'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}>
                    {link.label}
                  </span>
                </Link>
              )
            ))}
          </div>



          {/* User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-profile-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-900 text-white">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-white border-gray-200 z-[200] -translate-x-[200px]" 
                  side="bottom" 
                  align="end" 
                  sideOffset={8}
                >
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-gray-900">{user?.email}</p>
                      <p className="text-xs text-gray-500">Free Plan</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <Link href="/profile">
                    <DropdownMenuItem className="text-gray-700 hover:text-gray-900">
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem onClick={handleLogout} className="text-gray-700 hover:text-gray-900">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navLinks.map((link) => (
              link.comingSoon ? (
                <span
                  key={link.href}
                  className="block px-3 py-2 text-base font-medium text-gray-400 cursor-not-allowed"
                >
                  {link.label}
                </span>
              ) : (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`block px-3 py-2 text-base font-medium transition-colors duration-200 cursor-pointer
                      ${isActiveLink(link.href)
                        ? 'text-gray-900 bg-yellow-50 border-l-4 border-yellow-400'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    {link.label}
                  </span>
                </Link>
              )
            ))}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gray-900 text-white">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-900">{user?.email}</div>
                  <div className="text-sm font-medium text-gray-500">Free Plan</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link href="/profile">
                  <button className="block px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 w-full text-left">
                    Profile
                  </button>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 w-full text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
});

export default GlobalNavbar;