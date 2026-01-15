import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import flintLogo from '@assets/flint-logo.png';

const USE_CASES = [
  { label: 'Crypto', href: '/crypto', description: 'Track all your crypto wallets' },
  { label: 'Investing', href: '/investing', description: 'Manage your brokerage accounts' },
  { label: 'Banking', href: '/banking', description: 'Connect your bank accounts' },
  { label: 'Business', href: '/business', description: 'Solutions for businesses' },
];

const NAV_LINKS = [
  { label: 'Features', sectionId: 'features' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'FAQ', sectionId: 'faq' },
];

interface LandingHeaderProps {
  currentPage?: 'crypto' | 'investing' | 'banking' | 'business' | 'main' | 'blog';
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
    <header className="sticky top-0 z-50 px-4 lg:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <img src={flintLogo} alt="Flint Logo" className="h-8 w-auto" />
              <span className="font-semibold text-gray-900 text-lg">Flint</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            {NAV_LINKS.map((link) => (
              currentPage === 'main' ? (
                <button
                  key={link.sectionId}
                  onClick={() => handleNavClick(link.sectionId)}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </button>
              ) : (
                <Link key={link.sectionId} href={`/#${link.sectionId}`}>
                  <span
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
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
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1"
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
                {USE_CASES.map((useCase) => {
                  const isActive = location === useCase.href;
                  return (
                    <Link key={useCase.href} href={useCase.href}>
                      <DropdownMenuItem
                        className={cn(
                          'cursor-pointer p-3',
                          isActive && 'bg-blue-50'
                        )}
                        data-testid={`link-usecase-${useCase.label.toLowerCase()}`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{useCase.label}</div>
                          <div className="text-xs text-gray-500">{useCase.description}</div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/login">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              data-testid="link-login-header"
            >
              Sign In
            </Button>
          </Link>
          {onGetStarted ? (
            <Button 
              onClick={onGetStarted}
              className="bg-[#1a56db] hover:bg-[#1e40af] text-white rounded-lg px-5"
              data-testid="button-get-started-header"
            >
              Get Started
            </Button>
          ) : (
            <Link href="/login">
              <Button 
                className="bg-[#1a56db] hover:bg-[#1e40af] text-white rounded-lg px-5"
                data-testid="button-get-started-header"
              >
                Get Started
              </Button>
            </Link>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="md:hidden border-gray-200"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-white border-gray-200 w-[280px]"
            >
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 px-2 mb-4">
                  <img src={flintLogo} alt="Flint" className="h-7 w-auto" />
                  <span className="font-semibold text-gray-900">Flint</span>
                </div>

                <div className="space-y-1">
                  {NAV_LINKS.map((link) => (
                    currentPage === 'main' ? (
                      <button
                        key={link.sectionId}
                        onClick={() => {
                          const element = document.getElementById(link.sectionId);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          setMobileOpen(false);
                        }}
                        className="w-full text-left text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm transition-colors"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link key={link.sectionId} href={`/#${link.sectionId}`}>
                        <button
                          onClick={() => setMobileOpen(false)}
                          className="w-full text-left text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm transition-colors"
                        >
                          {link.label}
                        </button>
                      </Link>
                    )
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Use Cases</p>
                  <div className="space-y-1">
                    {USE_CASES.map((useCase) => {
                      const isActive = location === useCase.href;
                      return (
                        <Link key={useCase.href} href={useCase.href}>
                          <button
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                              isActive
                                ? 'bg-blue-50 text-[#1a56db]'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            )}
                          >
                            {useCase.label}
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full border-gray-200" onClick={() => setMobileOpen(false)}>
                      Sign In
                    </Button>
                  </Link>
                  {onGetStarted ? (
                    <Button 
                      className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white" 
                      onClick={() => { onGetStarted(); setMobileOpen(false); }}
                    >
                      Get Started
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button 
                        className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white" 
                        onClick={() => setMobileOpen(false)}
                      >
                        Get Started
                      </Button>
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
