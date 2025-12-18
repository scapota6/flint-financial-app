import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Menu, Bitcoin, TrendingUp, Building2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import flintLogo from '@assets/flint-logo.png';

const USE_CASES = [
  { label: 'Crypto', href: '/crypto', icon: Bitcoin, description: 'Track all your crypto wallets' },
  { label: 'Investing', href: '/investing', icon: TrendingUp, description: 'Manage your brokerage accounts' },
  { label: 'Banking', href: '/banking', icon: Building2, description: 'Connect your bank accounts' },
  { label: 'Business', href: '/business', icon: Briefcase, description: 'Solutions for businesses' },
];

const NAV_LINKS = [
  { label: 'Features', sectionId: 'features' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'FAQ', sectionId: 'faq' },
];

interface LandingHeaderProps {
  currentPage?: 'crypto' | 'investing' | 'banking' | 'business' | 'main';
  onGetStarted?: () => void;
}

export function LandingHeader({ currentPage = 'main', onGetStarted }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const handleSectionScroll = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileOpen(false);
  };

  const handleNavClick = (sectionId: string) => {
    if (currentPage === 'main') {
      handleSectionScroll(sectionId);
    } else {
      setMobileOpen(false);
    }
  };

  return (
    <header
      className={cn(
        'fixed top-5 left-0 right-0 z-50',
        'mx-auto w-[95%] sm:w-full max-w-5xl rounded-xl border border-gray-800 shadow-2xl',
        'bg-[#1a1a1a]/95 supports-[backdrop-filter]:bg-[#1a1a1a]/80 backdrop-blur-lg',
      )}
    >
      <nav className="mx-auto flex items-center justify-between p-2 px-3 sm:px-4">
        <Link href="/new">
          <div className="hover:bg-gray-800/50 flex cursor-pointer items-center gap-2 rounded-md px-2 sm:px-3 py-1.5 duration-100">
            <img src={flintLogo} alt="Flint" className="h-6 sm:h-7 w-auto" />
            <span className="font-semibold text-sm hidden sm:inline">Flint</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            currentPage === 'main' ? (
              <button
                key={link.sectionId}
                onClick={() => handleNavClick(link.sectionId)}
                className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-1.5 rounded-md text-sm transition-colors"
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </button>
            ) : (
              <Link key={link.sectionId} href={`/new#${link.sectionId}`}>
                <span
                  className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer"
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </span>
              </Link>
            )
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1"
                data-testid="dropdown-use-cases"
              >
                Use Cases
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-[#1e1e1e] border-gray-700 z-[200]"
              sideOffset={8}
            >
              {USE_CASES.map((useCase) => {
                const Icon = useCase.icon;
                const isActive = location === useCase.href;
                return (
                  <Link key={useCase.href} href={useCase.href}>
                    <DropdownMenuItem
                      className={cn(
                        'cursor-pointer flex items-start gap-3 p-3',
                        isActive && 'bg-blue-600/20'
                      )}
                      data-testid={`link-usecase-${useCase.label.toLowerCase()}`}
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-blue-400" />
                      <div>
                        <div className="font-medium text-white">{useCase.label}</div>
                        <div className="text-xs text-gray-400">{useCase.description}</div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" data-testid="link-login-header">
                Log In
              </Button>
            </Link>
            {onGetStarted ? (
              <RainbowButton className="h-9 px-4 text-sm" onClick={onGetStarted} data-testid="button-get-started-header">
                Get Started
              </RainbowButton>
            ) : (
              <Link href="/login">
                <RainbowButton className="h-9 px-4 text-sm" data-testid="button-get-started-header">
                  Get Started
                </RainbowButton>
              </Link>
            )}
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="lg:hidden border-gray-700"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-[#1a1a1a]/95 supports-[backdrop-filter]:bg-[#1a1a1a]/80 backdrop-blur-lg border-gray-800 w-[280px]"
            >
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 px-2 mb-4">
                  <img src={flintLogo} alt="Flint" className="h-7 w-auto" />
                  <span className="font-semibold">Flint</span>
                </div>

                <div className="space-y-1">
                  {NAV_LINKS.map((link) => (
                    currentPage === 'main' ? (
                      <button
                        key={link.sectionId}
                        onClick={() => handleNavClick(link.sectionId)}
                        className="w-full text-left text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-2 rounded-md text-sm transition-colors"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link key={link.sectionId} href={`/new#${link.sectionId}`}>
                        <button
                          onClick={() => setMobileOpen(false)}
                          className="w-full text-left text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-2 rounded-md text-sm transition-colors"
                        >
                          {link.label}
                        </button>
                      </Link>
                    )
                  ))}
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Use Cases</p>
                  <div className="space-y-1">
                    {USE_CASES.map((useCase) => {
                      const Icon = useCase.icon;
                      const isActive = location === useCase.href;
                      return (
                        <Link key={useCase.href} href={useCase.href}>
                          <button
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                              isActive
                                ? 'bg-blue-600/20 text-white'
                                : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                            )}
                          >
                            <Icon className="h-4 w-4 text-blue-400" />
                            {useCase.label}
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full border-gray-700" onClick={() => setMobileOpen(false)}>
                      Log In
                    </Button>
                  </Link>
                  {onGetStarted ? (
                    <RainbowButton className="w-full" onClick={() => { onGetStarted(); setMobileOpen(false); }}>
                      Get Started
                    </RainbowButton>
                  ) : (
                    <Link href="/login">
                      <RainbowButton className="w-full" onClick={() => setMobileOpen(false)}>
                        Get Started
                      </RainbowButton>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
