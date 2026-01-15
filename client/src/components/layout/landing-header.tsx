import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, X } from 'lucide-react';
import flintLogo from '@assets/flint-logo.png';

const USE_CASES = [
  { label: 'Banking', href: '/banking' },
  { label: 'Investing', href: '/investing' },
  { label: 'Crypto', href: '/crypto' },
  { label: 'Business', href: '/business' },
];

const NAV_LINKS = [
  { label: 'How it works', sectionId: 'howitworks' },
  { label: 'Features', sectionId: 'features' },
  { label: 'Pricing', sectionId: 'pricing' },
];

interface LandingHeaderProps {
  currentPage?: 'crypto' | 'investing' | 'banking' | 'business' | 'main' | 'blog';
  onGetStarted?: () => void;
}

export function LandingHeader({ currentPage = 'main', onGetStarted }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed flex justify-between items-center py-4 md:py-6 w-full lg:px-48 md:px-12 px-4 bg-[#F4F2ED] z-50">
        <div className="flex items-center gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={flintLogo} alt="Flint" className="h-6" />
              <span className="text-xl font-semibold text-gray-900">Flint</span>
            </div>
          </Link>
        </div>
        
        <ul className="items-center hidden md:flex font-medium">
          <li className="mx-4 relative group">
            <button className="flex items-center gap-1 hover:underline underline-offset-4 pb-2">
              Use Cases <ChevronDown className="h-4 w-4" />
            </button>
            <div className="absolute top-full left-0 pt-0 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                {USE_CASES.map((useCase) => (
                  <Link 
                    key={useCase.href} 
                    href={useCase.href} 
                    className={`block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${location === useCase.href ? 'bg-gray-50 text-gray-900' : ''}`}
                  >
                    {useCase.label}
                  </Link>
                ))}
              </div>
            </div>
          </li>
          {NAV_LINKS.map((link) => (
            <li key={link.sectionId} className="mx-4">
              {currentPage === 'main' ? (
                <button 
                  onClick={() => scrollToSection(link.sectionId)} 
                  className="hover:underline underline-offset-4"
                >
                  {link.label}
                </button>
              ) : (
                <Link href={`/#${link.sectionId}`} className="hover:underline underline-offset-4">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="hover:underline underline-offset-4">Login</Link>
          {onGetStarted ? (
            <button 
              onClick={onGetStarted}
              className="py-2 px-6 text-white bg-black rounded-full font-medium hover:bg-gray-800 transition-colors"
              data-testid="button-get-started-header"
            >
              Signup
            </button>
          ) : (
            <Link href="/login">
              <button 
                className="py-2 px-6 text-white bg-black rounded-full font-medium hover:bg-gray-800 transition-colors"
                data-testid="button-get-started-header"
              >
                Signup
              </button>
            </Link>
          )}
        </div>
        
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <ChevronDown className="h-6 w-6" />
          )}
        </button>
      </nav>
      
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div 
            className="fixed top-16 left-0 right-0 bg-[#F4F2ED] z-40 px-4 py-6 shadow-lg md:hidden animate-[fadeInDown_0.2s_ease-out]"
          >
            <ul className="flex flex-col gap-4 font-medium mb-6">
              <li>
                <p className="text-sm text-gray-500 mb-2">Use Cases</p>
                <div className="pl-3 space-y-2 mb-4">
                  {USE_CASES.map((useCase) => (
                    <Link 
                      key={useCase.href}
                      href={useCase.href} 
                      className={`block py-1 ${location === useCase.href ? 'text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900'}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {useCase.label}
                    </Link>
                  ))}
                </div>
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.sectionId}>
                  {currentPage === 'main' ? (
                    <button 
                      onClick={() => { scrollToSection(link.sectionId); setMobileMenuOpen(false); }} 
                      className="w-full text-left py-2 hover:underline underline-offset-4"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link 
                      href={`/#${link.sectionId}`}
                      className="block py-2 hover:underline underline-offset-4"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                {currentPage === 'main' ? (
                  <button 
                    onClick={() => { scrollToSection('faq'); setMobileMenuOpen(false); }} 
                    className="w-full text-left py-2 hover:underline underline-offset-4"
                  >
                    FAQ
                  </button>
                ) : (
                  <Link 
                    href="/#faq"
                    className="block py-2 hover:underline underline-offset-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    FAQ
                  </Link>
                )}
              </li>
            </ul>
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <Link href="/login" className="py-2 px-4 text-center font-medium flex-1" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
              {onGetStarted ? (
                <button 
                  onClick={() => { onGetStarted(); setMobileMenuOpen(false); }} 
                  className="py-2 px-4 text-white bg-black rounded-full font-medium flex-1"
                >
                  Signup
                </button>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="py-2 px-4 text-white bg-black rounded-full font-medium w-full">
                    Signup
                  </button>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
