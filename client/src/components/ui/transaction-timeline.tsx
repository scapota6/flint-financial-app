import * as React from "react";
import { motion } from "framer-motion";
import { CreditCard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMerchantLogo } from "@/lib/merchant-logos";

export interface TransactionItem {
  id: string | number;
  merchant: string;
  description: string;
  date: string;
  amount: number;
  accountName: string;
  provider?: string;
}

interface TransactionTimelineProps {
  transactions: TransactionItem[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  className?: string;
}

const TransactionTimeline = ({ 
  transactions, 
  formatCurrency, 
  formatDate,
  className 
}: TransactionTimelineProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  if (transactions.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">
        No transactions in this category
      </p>
    );
  }

  return (
    <motion.ol
      className={cn("relative border-l border-gray-700/50 ml-4", className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {transactions.map((transaction) => {
        const merchantLogoData = getMerchantLogo(transaction.merchant, transaction.provider);
        
        return (
        <motion.li
          key={transaction.id}
          className="mb-6 ml-6"
          variants={itemVariants}
          data-testid={`transaction-${transaction.id}`}
        >
          <span
            className={cn(
              "absolute -left-3 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-gray-900 overflow-hidden",
              merchantLogoData.bgClass
            )}
          >
            <div className="h-full w-full flex items-center justify-center [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>svg]:h-5 [&>svg]:w-5">
              {merchantLogoData.logo}
            </div>
          </span>

          <div className="rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 p-3 hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">
                  {transaction.merchant}
                </h3>
                <p className="text-sm text-gray-400 truncate mt-0.5">
                  {transaction.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {formatDate(transaction.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      {transaction.accountName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-red-400">
                  -{formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            </div>
          </div>
        </motion.li>
        );
      })}
    </motion.ol>
  );
};

export default TransactionTimeline;
