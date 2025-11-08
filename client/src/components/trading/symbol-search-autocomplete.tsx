import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, Bitcoin, Layers, AlertCircle, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SymbolSearchResult } from '@shared/types';

interface SymbolSearchAutocompleteProps {
  onSelect: (result: SymbolSearchResult) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export default function SymbolSearchAutocomplete({
  onSelect,
  placeholder = 'Search stocks, crypto, ETFs...',
  className,
  initialValue = ''
}: SymbolSearchAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedTerm, setDebouncedTerm] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search term (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch symbol search results
  const { data, isLoading } = useQuery({
    queryKey: ['/api/snaptrade/reference/symbol-search', debouncedTerm],
    enabled: debouncedTerm.length >= 1,
    staleTime: 60000, // Cache for 1 minute
  });

  const results = data?.results || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (result: SymbolSearchResult) => {
    setSearchTerm(result.symbol);
    setIsOpen(false);
    onSelect(result);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setSelectedIndex(0);
    setIsOpen(true);
  };

  // Group results by asset type
  const groupedResults = results.reduce((acc, result) => {
    const type = result.assetTypeLabel || 'Other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {} as Record<string, SymbolSearchResult[]>);

  // Get icon for asset type
  const getAssetIcon = (assetType: string) => {
    switch (assetType.toLowerCase()) {
      case 'stock':
        return <TrendingUp className="h-4 w-4" />;
      case 'cryptocurrency':
        return <Bitcoin className="h-4 w-4" />;
      case 'etf':
        return <Layers className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  // Show results when there's a search term and dropdown is open
  const showResults = isOpen && debouncedTerm.length >= 1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
          data-testid="input-symbol-search"
        />
      </div>

      {showResults && (
        <Card className="absolute z-50 w-full mt-1 max-h-96 overflow-y-auto shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground" data-testid="loading-search">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground" data-testid="no-results">
              No symbols found for "{debouncedTerm}"
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([assetType, symbols]) => (
                <div key={assetType}>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">
                    {assetType}
                  </div>
                  {symbols.map((result, index) => {
                    const globalIndex = results.indexOf(result);
                    const isSelected = selectedIndex === globalIndex;
                    const isCompatible = result.isCompatibleWithAnyAccount;

                    return (
                      <button
                        key={result.symbol}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          "w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3",
                          isSelected && "bg-accent",
                          !isCompatible && "opacity-60"
                        )}
                        data-testid={`symbol-result-${result.symbol}`}
                      >
                        <div className="mt-0.5 text-muted-foreground">
                          {getAssetIcon(result.assetTypeLabel)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{result.symbol}</span>
                            {result.exchange && (
                              <span className="text-xs text-muted-foreground">
                                {result.exchange}
                              </span>
                            )}
                          </div>
                          {result.description && (
                            <div className="text-sm text-muted-foreground truncate">
                              {result.description}
                            </div>
                          )}
                          
                          {/* Compatibility indicators */}
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            {isCompatible ? (
                              <>
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  <Check className="h-3 w-3 mr-1" />
                                  {result.compatibleAccounts.length} compatible account{result.compatibleAccounts.length !== 1 ? 's' : ''}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {result.compatibleAccounts.map(acc => acc.institution).join(', ')}
                                </span>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not compatible
                              </Badge>
                            )}
                          </div>

                          {/* Incompatibility reason */}
                          {!isCompatible && result.incompatibleReason && (
                            <div className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                              {result.incompatibleReason}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
