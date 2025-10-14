import React from "react";
import { getCryptoLogo } from "@/lib/crypto-logos";
import { getStockLogo } from "@/lib/stock-logos";

interface StockIconProps {
  symbol: string;
  className?: string;
  name?: string;
  type?: string;
}

export function StockIcon({ symbol, className = "w-6 h-6", name, type }: StockIconProps) {
  // Clean symbol for crypto (remove -USD suffix)
  const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '');
  
  // Determine if it's crypto or stock
  const isCrypto = type?.toLowerCase().includes('crypto') || 
                   symbol.includes('-USD') || 
                   symbol.includes('-USDT') ||
                   ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE', 'MATIC', 'XLM'].includes(cleanSymbol.toUpperCase());
  
  const logoData = isCrypto 
    ? getCryptoLogo(cleanSymbol, name)
    : getStockLogo(symbol, name);

  return (
    <div className={`flex items-center justify-center rounded-lg ${logoData.bgClass} ${className}`}>
      <div className="w-full h-full flex items-center justify-center">
        {logoData.logo}
      </div>
    </div>
  );
}