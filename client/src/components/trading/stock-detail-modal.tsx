import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StockDetailView from "./stock-detail-view";
import EnhancedTradeModal from "./enhanced-trade-modal";

interface StockDetailModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StockDetailModal({ symbol, isOpen, onClose }: StockDetailModalProps) {
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-6xl max-h-[95vh] overflow-y-auto border-none p-0"
          style={{
            background: 'transparent',
          }}
        >
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="absolute -top-2 -right-2 z-50 bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 p-0"
              data-testid="button-close"
            >
              <X className="h-5 w-5 text-white" />
            </Button>
            <StockDetailView symbol={symbol} />
          </div>
        </DialogContent>
      </Dialog>

      <EnhancedTradeModal
        symbol={symbol}
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        action={tradeAction}
      />
    </>
  );
}