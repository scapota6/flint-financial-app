/**
 * Theme Context Provider
 * Cream theme is enforced - dark mode is disabled
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use light theme for cream design
  const theme: Theme = 'light';

  useEffect(() => {
    // Force light mode - remove any dark class
    const root = document.documentElement;
    root.classList.remove('dark');
    
    // Clear any saved dark mode preference
    localStorage.setItem('theme', 'light');
  }, []);

  // Toggle and setTheme are no-ops - cream theme is enforced
  const toggleTheme = () => {};
  const setTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}