import React from 'react';
import { MenuIcon, User, LogOut } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface AuthUser {
  id: string;
  email: string;
}

interface FloatingHeaderProps {
  variant?: 'landing' | 'authenticated';
  onSignupClick?: () => void;
}

export function FloatingHeader({ variant = 'authenticated', onSignupClick }: FloatingHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const [location] = useLocation();
  
  const { data: user } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
    enabled: variant === 'authenticated',
  });

  const authenticatedLinks = [
    { label: 'Dashboard', href: '/dashboard', comingSoon: false },
    { label: 'Portfolio', href: '/portfolio', comingSoon: false },
    { label: 'Accounts', href: '/accounts', comingSoon: false },
    { label: 'Transfers', href: '/transfers', comingSoon: true },
    { label: 'Trading', href: '/trading', comingSoon: true },
  ];

  const landingLinks = [
    { label: 'Features', href: '#features', comingSoon: false },
    { label: 'Pricing', href: '#pricing', comingSoon: false },
    { label: 'FAQ', href: '#faq', comingSoon: false },
  ];

  const links = variant === 'landing' ? landingLinks : authenticatedLinks;

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    window.location.href = '/api/auth/logout';
  };

  React.useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <header
      className={cn(
        'sticky top-5 z-50',
        'mx-auto w-full max-w-5xl rounded-xl border border-gray-800 shadow-2xl',
        'bg-[#1a1a1a]/95 supports-[backdrop-filter]:bg-[#1a1a1a]/80 backdrop-blur-lg',
      )}
    >
      <nav className="mx-auto flex items-center justify-between p-2">
        {/* Logo */}
        <Link href="/dashboard">
          <div className="hover:bg-gray-800/50 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 duration-100">
            <p className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              FLINT
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            link.comingSoon ? (
              <span
                key={link.href}
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-gray-600 cursor-not-allowed' })}
              >
                {link.label}
              </span>
            ) : (
              <Link key={link.href} href={link.href}>
                <button
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    isActiveLink(link.href)
                      ? 'text-white bg-blue-600/20'
                      : 'text-gray-300 hover:text-white'
                  )}
                >
                  {link.label}
                </button>
              </Link>
            )
          ))}
        </div>

        {/* User Menu & Mobile Toggle */}
        <div className="flex items-center gap-2">
          {/* Landing Page CTAs */}
          {variant === 'landing' && (
            <div className="hidden lg:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                  Log In
                </Button>
              </Link>
              <Button size="sm" onClick={onSignupClick} className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </div>
          )}

          {/* Authenticated User Profile Dropdown - Desktop */}
          {variant === 'authenticated' && (
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-profile-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-[#1e1e1e] border-gray-700 z-[200]" 
                  side="bottom" 
                  align="end" 
                  sideOffset={8}
                >
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-white">{user?.email}</p>
                      <p className="text-xs text-gray-400">Free Plan</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="lg:hidden border-gray-700"
            >
              <MenuIcon className="size-4" />
            </Button>
            <SheetContent
              className="bg-[#1a1a1a]/95 supports-[backdrop-filter]:bg-[#1a1a1a]/80 gap-0 backdrop-blur-lg border-gray-800"
              showClose={false}
              side="left"
            >
              <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                {links.map((link) => (
                  link.comingSoon ? (
                    <span
                      key={link.href}
                      className={buttonVariants({
                        variant: 'ghost',
                        className: 'justify-start text-gray-600 cursor-not-allowed',
                      })}
                    >
                      {link.label}
                    </span>
                  ) : (
                    <Link key={link.href} href={link.href}>
                      <button
                        className={cn(
                          buttonVariants({
                            variant: 'ghost',
                            className: 'justify-start w-full',
                          }),
                          isActiveLink(link.href)
                            ? 'text-white bg-blue-600/20'
                            : 'text-gray-300 hover:text-white'
                        )}
                      >
                        {link.label}
                      </button>
                    </Link>
                  )
                ))}
              </div>
              <SheetFooter className="flex-col sm:flex-col gap-2">
                {variant === 'landing' ? (
                  <>
                    <Link href="/login">
                      <Button variant="outline" className="w-full border-gray-700">
                        Log In
                      </Button>
                    </Link>
                    <Button onClick={onSignupClick} className="w-full bg-blue-600 hover:bg-blue-700">
                      Get Started
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/profile">
                      <Button variant="outline" className="w-full border-gray-700">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
