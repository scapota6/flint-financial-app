import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  Filter,
  X,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Lock,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { isInternalTester } from "@/lib/feature-flags";
import { apiGet } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  accountName: string;
  description: string;
}

interface Category {
  name: string;
  amount: number;
  transactions: Transaction[];
}

interface SpendingData {
  categories: Category[];
  totalSpending: number;
}

interface DashboardData {
  accounts?: Array<{
    id: string;
    name: string;
    institution?: string;
    type?: string;
  }>;
}

const CATEGORY_COLORS = [
  "#3B82F6", // blue-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#06B6D4", // cyan-500
  "#84CC16", // lime-500
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return format(new Date(dateString), "MMM d, yyyy");
}

export default function Analytics() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<"1" | "3">("1");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const hasAccess = isInternalTester(user?.email);

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
    enabled: hasAccess,
    staleTime: 5 * 60 * 1000,
  });

  const accounts = dashboardData?.accounts || [];

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", format(selectedMonth, "yyyy-MM"));
    params.set("months", viewMode);
    if (selectedAccountIds.length > 0) {
      selectedAccountIds.forEach((id) => params.append("accountIds[]", id));
    }
    return params.toString();
  }, [selectedMonth, viewMode, selectedAccountIds]);

  const {
    data: spendingData,
    isLoading: isSpendingLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/analytics/spending", queryParams],
    queryFn: () => apiGet<SpendingData>(`/api/analytics/spending?${queryParams}`),
    enabled: hasAccess,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = subMonths(selectedMonth, -1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleClearFilters = () => {
    setSelectedAccountIds([]);
  };

  const handleBarClick = (data: Category) => {
    setSelectedCategory(data);
    setIsDrilldownOpen(true);
  };

  const chartData = useMemo(() => {
    if (!spendingData?.categories) return [];
    return spendingData.categories
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [spendingData]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-900/50 backdrop-blur-lg border border-gray-800 flex items-center justify-center">
            <Lock className="w-10 h-10 text-gray-500" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-gray-400 max-w-md">
            Analytics is currently available to internal testers only. Check back soon
            for general availability.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-6">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Spending Analytics
            </h1>
            <p className="text-gray-400">
              Track your expenses across all connected accounts
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Card className="flex-1 bg-gray-900/50 backdrop-blur-lg border border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="hover:bg-gray-800"
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-lg font-medium" data-testid="text-selected-month">
                    {format(selectedMonth, "MMMM yyyy")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    disabled={subMonths(selectedMonth, -1) > new Date()}
                    className="hover:bg-gray-800 disabled:opacity-50"
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "1" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("1")}
                    className={
                      viewMode === "1"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-gray-700 hover:bg-gray-800"
                    }
                    data-testid="button-view-1-month"
                  >
                    This Month
                  </Button>
                  <Button
                    variant={viewMode === "3" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("3")}
                    className={
                      viewMode === "3"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-gray-700 hover:bg-gray-800"
                    }
                    data-testid="button-view-3-months"
                  >
                    Last 3 Months
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterOpen(true)}
                  className="border-gray-700 hover:bg-gray-800 relative"
                  data-testid="button-account-filter"
                >
                  {selectedAccountIds.length > 0 ? (
                    <>
                      {selectedAccountIds.length} selected
                      <span className="ml-2 w-2 h-2 rounded-full bg-blue-500" />
                    </>
                  ) : (
                    "All Accounts"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {isSpendingLoading || isDashboardLoading ? (
            <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              </CardContent>
            </Card>
          ) : isError ? (
            <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800">
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                  <h3 className="text-lg font-medium mb-2">Failed to load data</h3>
                  <p className="text-gray-400 text-sm">
                    {error instanceof Error ? error.message : "Please try again later"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800 mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold">
                        Spending by Category
                      </CardTitle>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Total Spending</p>
                        <p className="text-2xl font-bold text-white" data-testid="text-total-spending">
                          {formatCurrency(spendingData?.totalSpending || 0)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {chartData.length === 0 ? (
                      <div className="h-80 flex items-center justify-center">
                        <div className="text-center">
                          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                          <p className="text-gray-400">No spending data for this period</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                          >
                            <XAxis
                              type="number"
                              tickFormatter={(value) => formatCurrency(value)}
                              stroke="#6B7280"
                              fontSize={12}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke="#6B7280"
                              fontSize={12}
                              width={90}
                              tickLine={false}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload as Category;
                                  return (
                                    <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-lg p-3 shadow-xl">
                                      <p className="font-medium text-white">
                                        {data.name}
                                      </p>
                                      <p className="text-blue-400 font-semibold">
                                        {formatCurrency(data.amount)}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {data.transactions?.length || 0} transactions
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Click to view details
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar
                              dataKey="amount"
                              radius={[0, 6, 6, 0]}
                              cursor="pointer"
                              onClick={(data) => handleBarClick(data as Category)}
                            >
                              {chartData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                  className="transition-opacity hover:opacity-80"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              >
                {chartData.map((category, index) => (
                  <Card
                    key={category.name}
                    className="bg-gray-900/50 backdrop-blur-lg border border-gray-800 cursor-pointer transition-all hover:border-gray-700 hover:scale-[1.02]"
                    onClick={() => handleBarClick(category)}
                    data-testid={`card-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <CardContent className="p-4">
                      <div
                        className="w-3 h-3 rounded-full mb-2"
                        style={{
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        }}
                      />
                      <p className="text-sm text-gray-400 truncate">{category.name}</p>
                      <p className="text-lg font-semibold mt-1">
                        {formatCurrency(category.amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {category.transactions?.length || 0} transactions
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            </>
          )}
        </motion.div>
      </main>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-lg border border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Filter by Account</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select accounts to include in the analysis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto py-4">
            {accounts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                No accounts connected
              </p>
            ) : (
              accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
                  data-testid={`filter-account-${account.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={
                      selectedAccountIds.length === 0 ||
                      selectedAccountIds.includes(account.id)
                    }
                    onCheckedChange={() => handleAccountToggle(account.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {account.institution || account.type}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
              className="flex-1 border-gray-700 hover:bg-gray-800"
              data-testid="button-clear-filters"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterOpen(false);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              data-testid="button-apply-filters"
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-lg border border-gray-800 max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCategory?.transactions?.length || 0} transactions totaling{" "}
              {formatCurrency(selectedCategory?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-4">
            <AnimatePresence>
              {selectedCategory?.transactions?.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No transactions in this category
                </p>
              ) : (
                selectedCategory?.transactions?.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-colors"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {transaction.merchant}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatDate(transaction.date)}
                          </span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-500 truncate">
                            {transaction.accountName}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-red-400 whitespace-nowrap">
                        -{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          <div className="pt-2 border-t border-gray-800">
            <Button
              variant="outline"
              className="w-full border-gray-700 hover:bg-gray-800"
              onClick={() => setIsDrilldownOpen(false)}
              data-testid="button-close-drilldown"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
