import React from 'react';
import { MenuIcon, User, LogOut, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const USE_CASES = [
  { label: 'Crypto', href: '/crypto', description: 'Track all your crypto wallets' },
  { label: 'Investing', href: '/investing', description: 'Manage your brokerage accounts' },
  { label: 'Banking', href: '/banking', description: 'Connect your bank accounts' },
  { label: 'Business', href: '/business', description: 'Solutions for businesses' },
];
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import flintLogo from '@assets/flint-logo.png';

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

  const authenticatedLinks = React.useMemo(() => {
    return [
      { label: 'Dashboard', href: '/dashboard', comingSoon: false },
      { label: 'Analytics', href: '/analytics', comingSoon: false },
      { label: 'Accounts', href: '/accounts', comingSoon: false },
    ];
  }, []);

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

  const handleSectionScroll = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setOpen(false);
  };

  React.useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <header
      className={cn(
        'fixed top-5 left-0 right-0 z-50',
        'mx-auto w-full max-w-5xl rounded-xl border border-gray-200 shadow-sm',
        'bg-white supports-[backdrop-filter]:bg-white/95 backdrop-blur-lg',
      )}
    >
      <nav className="mx-auto flex items-center justify-between p-2">
        {/* Logo */}
        <Link href={variant === 'landing' ? '/' : '/dashboard'}>
          <div className="hover:bg-gray-100 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 duration-100">
            <img src={flintLogo} alt="Flint" className="h-7 w-auto" />
            <span className="font-semibold text-sm text-gray-900">Flint</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            if (link.comingSoon) {
              return (
                <span
                  key={link.href}
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-gray-600 cursor-not-allowed' })}
                >
                  {link.label}
                </span>
              );
            }

            // Handle landing page anchor links
            if (variant === 'landing' && link.href.startsWith('#')) {
              const sectionId = link.href.substring(1);
              return (
                <button
                  key={link.href}
                  onClick={() => handleSectionScroll(sectionId)}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  {link.label}
                </button>
              );
            }

            // Handle authenticated page links
            return (
              <Link key={link.href} href={link.href}>
                <button
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    isActiveLink(link.href)
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  {link.label}
                </button>
              </Link>
            );
          })}
          
          {/* Use Cases Dropdown - Landing Page Only */}
          {variant === 'landing' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center gap-1'
                  )}
                  data-testid="dropdown-use-cases"
                >
                  Use Cases
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-white border-gray-200 z-[200]"
                sideOffset={8}
              >
                {USE_CASES.map((useCase) => (
                  <Link key={useCase.href} href={useCase.href}>
                    <DropdownMenuItem
                      className="cursor-pointer p-3"
                      data-testid={`link-usecase-${useCase.label.toLowerCase()}`}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{useCase.label}</div>
                        <div className="text-xs text-gray-500">{useCase.description}</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* User Menu & Mobile Toggle */}
        <div className="flex items-center gap-2">
          {/* Landing Page CTAs */}
          {variant === 'landing' && (
            <div className="hidden lg:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  Log In
                </Button>
              </Link>
              <RainbowButton onClick={onSignupClick} className="h-9 px-3 text-sm">
                Get Started
              </RainbowButton>
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
                  className="w-56 bg-white border-gray-200 z-[200]" 
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
                    <DropdownMenuItem>
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-gray-200" />
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
              className="lg:hidden border-gray-200"
            >
              <MenuIcon className="size-4 text-gray-900" />
            </Button>
            <SheetContent
              className="bg-white gap-0 border-gray-200"
              showClose={false}
              side="right"
            >
              <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                {links.map((link) => {
                  if (link.comingSoon) {
                    return (
                      <span
                        key={link.href}
                        className={buttonVariants({
                          variant: 'ghost',
                          className: 'justify-start text-gray-600 cursor-not-allowed',
                        })}
                      >
                        {link.label}
                      </span>
                    );
                  }

                  // Handle landing page anchor links
                  if (variant === 'landing' && link.href.startsWith('#')) {
                    const sectionId = link.href.substring(1);
                    return (
                      <button
                        key={link.href}
                        onClick={() => handleSectionScroll(sectionId)}
                        className={cn(
                          buttonVariants({
                            variant: 'ghost',
                            className: 'justify-start w-full',
                          }),
                          'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        )}
                      >
                        {link.label}
                      </button>
                    );
                  }

                  // Handle authenticated page links
                  return (
                    <Link key={link.href} href={link.href}>
                      <button
                        className={cn(
                          buttonVariants({
                            variant: 'ghost',
                            className: 'justify-start w-full',
                          }),
                          isActiveLink(link.href)
                            ? 'text-gray-900 bg-gray-100'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        )}
                      >
                        {link.label}
                      </button>
                    </Link>
                  );
                })}
                
                {/* Use Cases - Mobile Landing */}
                {variant === 'landing' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Use Cases</p>
                    {USE_CASES.map((useCase) => (
                      <Link key={useCase.href} href={useCase.href}>
                        <button
                          onClick={() => setOpen(false)}
                          className={cn(
                            buttonVariants({
                              variant: 'ghost',
                              className: 'justify-start w-full',
                            }),
                            'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          )}
                        >
                          {useCase.label}
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <SheetFooter className="flex-col sm:flex-col gap-2">
                {variant === 'landing' ? (
                  <>
                    <Link href="/login">
                      <Button variant="outline" className="w-full border-gray-200 text-gray-900">
                        Log In
                      </Button>
                    </Link>
                    <RainbowButton onClick={onSignupClick} className="w-full">
                      Get Started
                    </RainbowButton>
                  </>
                ) : (
                  <>
                    <Link href="/profile">
                      <Button variant="outline" className="w-full border-gray-200 text-gray-900">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
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
