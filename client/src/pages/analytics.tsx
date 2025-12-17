import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { format, subMonths, startOfMonth, differenceInMonths } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  Filter,
  X,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Lock,
  Eye,
  EyeOff,
  Target,
  Plus,
  Trash2,
  CreditCard,
  PiggyBank,
  Shield,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { isInternalTester } from "@/lib/feature-flags";
import { apiGet, apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

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
    accountName: string;
    institution?: string;
    type?: string;
    balance?: number;
    accountType?: string;
  }>;
}

interface FinancialGoal {
  id: number;
  userId: string;
  goalType: 'debt_payoff' | 'savings' | 'emergency_fund';
  name: string;
  targetAmount: number;
  currentAmount: number;
  startingAmount: number | null; // Starting balance when savings goal was created
  linkedAccountId: number | null;
  deadline: string | null;
  monthlyContribution: number | null;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  linkedAccount?: {
    id: number;
    accountName: string;
    institutionName: string;
    balance: number;
  } | null;
}

interface GoalsResponse {
  goals: FinancialGoal[];
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
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [spendingChartVisible, setSpendingChartVisible] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    goalType: 'savings' as 'debt_payoff' | 'savings' | 'emergency_fund',
    targetAmount: '',
    monthlyContribution: '',
    linkedAccountId: '',
    startingAmount: '', // For savings goals - the starting balance when goal was created
  });
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);

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

  const { data: goalsData, isLoading: isGoalsLoading } = useQuery({
    queryKey: ["/api/goals"],
    queryFn: () => apiGet<GoalsResponse>("/api/goals"),
    enabled: hasAccess,
    staleTime: 30 * 1000,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: typeof newGoal) => {
      return apiRequest('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          name: goalData.name,
          goalType: goalData.goalType,
          targetAmount: goalData.targetAmount, // Keep as string for Drizzle numeric type
          monthlyContribution: goalData.monthlyContribution || null,
          linkedAccountId: goalData.linkedAccountId ? parseInt(goalData.linkedAccountId) : null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsGoalModalOpen(false);
      setNewGoal({
        name: '',
        goalType: 'savings',
        targetAmount: '',
        monthlyContribution: '',
        linkedAccountId: '',
        startingAmount: '',
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      setDeletingGoalId(goalId);
      return apiRequest(`/api/goals/${goalId}`, { method: 'DELETE' });
    },
    onMutate: async (goalId: number) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/goals"] });
      
      // Snapshot previous value
      const previousGoals = queryClient.getQueryData<GoalsResponse>(["/api/goals"]);
      
      // Optimistically remove the goal
      queryClient.setQueryData<GoalsResponse>(["/api/goals"], (old) => {
        if (!old) return { goals: [] };
        return {
          ...old,
          goals: old.goals.filter((g) => g.id !== goalId),
        };
      });
      
      return { previousGoals };
    },
    onError: (_err, _goalId, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        queryClient.setQueryData(["/api/goals"], context.previousGoals);
      }
    },
    onSettled: () => {
      setDeletingGoalId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const goals = goalsData?.goals || [];

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

          {/* Compact Filter Bar */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="font-medium text-white" data-testid="text-selected-month">
                {format(selectedMonth, "MMM yyyy")}
              </span>
              <span>•</span>
              <span>{viewMode === "1" ? "This Month" : "3 Months"}</span>
              {selectedAccountIds.length > 0 && (
                <>
                  <span>•</span>
                  <span>{selectedAccountIds.length} accounts</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(true)}
              className="border-gray-700 hover:bg-gray-800 flex items-center gap-2"
              data-testid="button-open-filters"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(selectedAccountIds.length > 0 || viewMode !== "1") && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </Button>
          </div>

          {isSpendingLoading || isDashboardLoading ? (
            <div className="bg-black rounded-xl p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            </div>
          ) : isError ? (
            <div className="bg-black rounded-xl p-6">
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-medium mb-2">Failed to load data</h3>
                <p className="text-gray-400 text-sm">
                  {error instanceof Error ? error.message : "Please try again later"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="bg-black rounded-xl p-4 sm:p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-white">
                        Spending by Category
                      </h2>
                      <button
                        onClick={() => setSpendingChartVisible(!spendingChartVisible)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        title={spendingChartVisible ? "Hide chart" : "Show chart"}
                        data-testid="button-toggle-spending-chart"
                      >
                        {spendingChartVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-white" data-testid="text-total-spending">
                        {formatCurrency(spendingData?.totalSpending || 0)}
                      </p>
                    </div>
                  </div>
                  {spendingChartVisible && (
                    <>
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
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
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
                              fontSize={11}
                              width={95}
                              tickLine={false}
                              tick={{ fill: '#9CA3AF' }}
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
                    </>
                  )}
                </div>
              </motion.div>

              {/* Category cards - show top 2 by default, expand for more */}
              {spendingChartVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {(categoriesExpanded ? chartData : chartData.slice(0, 2)).map((category, index) => (
                      <div
                        key={category.name}
                        className="bg-black rounded-xl p-3 sm:p-4 cursor-pointer transition-all hover:bg-gray-900"
                        onClick={() => handleBarClick(category)}
                        data-testid={`card-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div
                          className="w-3 h-3 rounded-full mb-2"
                          style={{
                            backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                          }}
                        />
                        <p className="text-xs sm:text-sm text-gray-400 truncate">{category.name}</p>
                        <p className="text-base sm:text-lg font-semibold mt-1">
                          {formatCurrency(category.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {category.transactions?.length || 0} txns
                        </p>
                      </div>
                    ))}
                  </div>
                  {chartData.length > 2 && (
                    <button
                      onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      data-testid="button-toggle-categories"
                    >
                      {categoriesExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show {chartData.length - 2} More Categories
                        </>
                      )}
                    </button>
                  )}
                </motion.div>
              )}
            </>
          )}

          {/* Financial Goals Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Financial Goals
              </h2>
              <Button
                size="sm"
                onClick={() => setIsGoalModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-add-goal"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Goal
              </Button>
            </div>

            {isGoalsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 bg-gray-800" />
                <Skeleton className="h-24 bg-gray-800" />
              </div>
            ) : goals.length === 0 ? (
              <div className="bg-gray-900/50 rounded-xl p-8 text-center border border-gray-800">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-medium mb-2">No goals yet</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Set financial goals to track your progress toward debt payoff, savings, or emergency fund
                </p>
                <Button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-first-goal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  // Calculate progress based on goal type
                  let progress = 0;
                  let remaining = 0;
                  let amountSaved = 0;
                  let currentBalance = 0;

                  if (goal.goalType === 'debt_payoff' && goal.linkedAccount) {
                    // Debt payoff: progress = how much paid off vs original balance
                    currentBalance = Math.abs(goal.linkedAccount.balance || 0);
                    amountSaved = Math.max(0, goal.targetAmount - currentBalance);
                    progress = goal.targetAmount > 0 
                      ? Math.min(100, (amountSaved / goal.targetAmount) * 100) 
                      : 0;
                    remaining = currentBalance;
                  } else if ((goal.goalType === 'savings' || goal.goalType === 'emergency_fund') && goal.linkedAccount) {
                    // Savings/Emergency fund with linked account: progress = current / target
                    currentBalance = goal.linkedAccount.balance || 0;
                    progress = goal.targetAmount > 0 
                      ? Math.min(100, Math.max(0, (currentBalance / goal.targetAmount) * 100))
                      : 0;
                    remaining = Math.max(0, goal.targetAmount - currentBalance);
                    amountSaved = currentBalance; // For display purposes
                  } else {
                    // Goals without linked accounts
                    progress = goal.targetAmount > 0 
                      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) 
                      : 0;
                    remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                    amountSaved = goal.currentAmount;
                  }

                  const monthsToGoal = goal.monthlyContribution && goal.monthlyContribution > 0
                    ? Math.ceil(remaining / goal.monthlyContribution)
                    : null;

                  const GoalIcon = goal.goalType === 'debt_payoff' ? CreditCard 
                    : goal.goalType === 'emergency_fund' ? Shield 
                    : PiggyBank;

                  const goalColor = goal.goalType === 'debt_payoff' ? 'text-red-400' 
                    : goal.goalType === 'emergency_fund' ? 'text-cyan-400' 
                    : 'text-green-400';

                  const progressColor = goal.goalType === 'debt_payoff' ? 'bg-red-500' 
                    : goal.goalType === 'emergency_fund' ? 'bg-cyan-500' 
                    : 'bg-green-500';

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors"
                      data-testid={`goal-card-${goal.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gray-800 ${goalColor}`}>
                            <GoalIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium">{goal.name}</h3>
                            <p className="text-xs text-gray-400 capitalize">
                              {goal.goalType.replace('_', ' ')}
                              {goal.linkedAccount && ` • ${goal.linkedAccount.accountName}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          disabled={deletingGoalId === goal.id}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          {deletingGoalId === goal.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          {goal.goalType === 'debt_payoff' ? (
                            <span className="text-gray-400">
                              {formatCurrency(amountSaved)} paid of {formatCurrency(goal.targetAmount)}
                            </span>
                          ) : (goal.goalType === 'savings' || goal.goalType === 'emergency_fund') && goal.linkedAccount ? (
                            <span className="text-gray-400">
                              {formatCurrency(currentBalance)} of {formatCurrency(goal.targetAmount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                            </span>
                          )}
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${progressColor} transition-all duration-500`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {goal.goalType === 'debt_payoff' ? (
                          <span>
                            {remaining > 0 ? `${formatCurrency(remaining)} remaining balance` : 'Paid off!'}
                          </span>
                        ) : (goal.goalType === 'savings' || goal.goalType === 'emergency_fund') && goal.linkedAccount ? (
                          <span>
                            {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal reached!'}
                          </span>
                        ) : (
                          <span>
                            {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal reached!'}
                          </span>
                        )}
                        {monthsToGoal !== null && remaining > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            ~{monthsToGoal} month{monthsToGoal !== 1 ? 's' : ''} at {formatCurrency(goal.monthlyContribution!)}/mo
                          </span>
                        )}
                        {goal.deadline && (
                          <span>
                            Due: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* Create Goal Modal */}
      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-lg border border-gray-800 max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Create Financial Goal
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Track your progress toward a financial objective
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300">Goal Type</Label>
              <Select
                value={newGoal.goalType}
                onValueChange={(v) => {
                  const goalType = v as typeof newGoal.goalType;
                  setNewGoal({ 
                    ...newGoal, 
                    goalType,
                    linkedAccountId: '',
                    targetAmount: '',
                    startingAmount: '',
                    name: (goalType === 'debt_payoff' || goalType === 'savings') ? '' : newGoal.name
                  });
                }}
              >
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-700" data-testid="select-goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">
                    <span className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-green-400" />
                      Savings Goal
                    </span>
                  </SelectItem>
                  <SelectItem value="debt_payoff">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-400" />
                      Debt Payoff
                    </span>
                  </SelectItem>
                  <SelectItem value="emergency_fund">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      Emergency Fund
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newGoal.goalType === 'debt_payoff' ? (
              <>
                {(() => {
                  const creditCards = accounts.filter((a) => a.type === 'credit' || a.accountType === 'credit');
                  const selectedCard = creditCards.find((a) => String(a.id) === newGoal.linkedAccountId);
                  
                  return creditCards.length === 0 ? (
                    <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        No credit cards connected. Connect a credit card account to track debt payoff.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-gray-300">Select Credit Card</Label>
                        <Select
                          value={newGoal.linkedAccountId || "none"}
                          onValueChange={(v) => {
                            const cardId = v === "none" ? '' : v;
                            const card = creditCards.find((a) => String(a.id) === cardId);
                            setNewGoal({ 
                              ...newGoal, 
                              linkedAccountId: cardId,
                              targetAmount: card?.balance ? String(Math.abs(card.balance)) : '',
                              name: card ? `Pay off ${card.accountName}` : ''
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1 bg-gray-800 border-gray-700" data-testid="select-credit-card">
                            <SelectValue placeholder="Choose a credit card" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select a card...</SelectItem>
                            {creditCards.map((card) => (
                              <SelectItem key={card.id} value={String(card.id)}>
                                <span className="flex items-center justify-between gap-4">
                                  <span>{card.accountName}</span>
                                  <span className="text-red-400 font-medium">
                                    {formatCurrency(Math.abs(card.balance || 0))}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedCard && (
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-400">Current Balance to Pay Off</p>
                              <p className="text-2xl font-bold text-red-400">
                                {formatCurrency(Math.abs(selectedCard.balance || 0))}
                              </p>
                            </div>
                            <CreditCard className="w-8 h-8 text-gray-600" />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Progress will update automatically as your balance decreases
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (newGoal.goalType === 'savings' || newGoal.goalType === 'emergency_fund') ? (
              <>
                {(() => {
                  const bankAccounts = accounts.filter((a) => a.type === 'bank' || a.accountType === 'bank');
                  const selectedAccount = bankAccounts.find((a) => String(a.id) === newGoal.linkedAccountId);
                  const currentBalance = selectedAccount?.balance || 0;
                  const isEmergencyFund = newGoal.goalType === 'emergency_fund';
                  const goalLabel = isEmergencyFund ? 'Emergency Fund' : 'Savings';
                  const GoalIcon = isEmergencyFund ? Shield : PiggyBank;
                  
                  return bankAccounts.length === 0 ? (
                    <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        No bank accounts connected. Connect a savings or checking account to track your {goalLabel.toLowerCase()}.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-gray-300">Select {isEmergencyFund ? 'Emergency Fund' : ''} Account</Label>
                        <Select
                          value={newGoal.linkedAccountId || "none"}
                          onValueChange={(v) => {
                            const accountId = v === "none" ? '' : v;
                            const account = bankAccounts.find((a) => String(a.id) === accountId);
                            setNewGoal({ 
                              ...newGoal, 
                              linkedAccountId: accountId,
                              startingAmount: account?.balance ? String(account.balance) : '',
                              name: account ? `${goalLabel} - ${account.accountName}` : ''
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1 bg-gray-800 border-gray-700" data-testid="select-savings-account">
                            <SelectValue placeholder="Choose an account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select an account...</SelectItem>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={String(account.id)}>
                                <span className="flex items-center justify-between gap-4">
                                  <span>{account.accountName}</span>
                                  <span className={`${isEmergencyFund ? 'text-cyan-400' : 'text-green-400'} font-medium`}>
                                    {formatCurrency(account.balance || 0)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedAccount && (
                        <>
                          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-400">Current Balance (Starting Point)</p>
                                <p className={`text-2xl font-bold ${isEmergencyFund ? 'text-cyan-400' : 'text-green-400'}`}>
                                  {formatCurrency(currentBalance)}
                                </p>
                              </div>
                              <GoalIcon className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Progress will track from this balance toward your goal
                            </p>
                          </div>

                          <div>
                            <Label className="text-gray-300">End Goal Amount</Label>
                            <Input
                              type="number"
                              value={newGoal.targetAmount}
                              onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                              placeholder={String(Math.round(currentBalance * 2))}
                              className="mt-1 bg-gray-800 border-gray-700"
                              data-testid="input-target-amount"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Set the balance you want to reach (must be higher than current balance)
                            </p>
                          </div>

                          <div>
                            <Label className="text-gray-300">Monthly Contribution (optional)</Label>
                            <Input
                              type="number"
                              value={newGoal.monthlyContribution}
                              onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: e.target.value })}
                              placeholder="500"
                              className="mt-1 bg-gray-800 border-gray-700"
                              data-testid="input-monthly-contribution"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Used to estimate when you'll reach your goal
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <div>
                  <Label className="text-gray-300">Goal Name</Label>
                  <Input
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="e.g., Emergency savings fund"
                    className="mt-1 bg-gray-800 border-gray-700"
                    data-testid="input-goal-name"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Target Amount</Label>
                  <Input
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    placeholder="10000"
                    className="mt-1 bg-gray-800 border-gray-700"
                    data-testid="input-target-amount"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Monthly Contribution (optional)</Label>
                  <Input
                    type="number"
                    value={newGoal.monthlyContribution}
                    onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: e.target.value })}
                    placeholder="500"
                    className="mt-1 bg-gray-800 border-gray-700"
                    data-testid="input-monthly-contribution"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used to estimate when you'll reach your goal
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsGoalModalOpen(false)}
              className="flex-1 border-gray-700 hover:bg-gray-800"
              data-testid="button-cancel-goal"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createGoalMutation.mutate(newGoal)}
              disabled={
                !newGoal.name || 
                !newGoal.targetAmount || 
                (newGoal.goalType === 'debt_payoff' && !newGoal.linkedAccountId) ||
                (newGoal.goalType === 'savings' && !newGoal.linkedAccountId) ||
                (newGoal.goalType === 'emergency_fund' && !newGoal.linkedAccountId) ||
                createGoalMutation.isPending
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-goal"
            >
              {createGoalMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create Goal'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent 
          className="bg-gray-900/95 backdrop-blur-lg border border-gray-800 max-w-md w-[95vw] sm:w-full"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-white">Filters</DialogTitle>
            <DialogDescription className="text-gray-400">
              Customize your analytics view
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-2">
            {/* Month Selector */}
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Month
              </p>
              <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="hover:bg-gray-700 h-8 w-8"
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-white" data-testid="text-filter-month">
                  {format(selectedMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={subMonths(selectedMonth, -1) > new Date()}
                  className="hover:bg-gray-700 disabled:opacity-50 h-8 w-8"
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* View Mode */}
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Time Range
              </p>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "1" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("1")}
                  className={`flex-1 ${
                    viewMode === "1"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-gray-700 hover:bg-gray-800"
                  }`}
                  data-testid="button-view-1-month"
                >
                  This Month
                </Button>
                <Button
                  variant={viewMode === "3" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("3")}
                  className={`flex-1 ${
                    viewMode === "3"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-gray-700 hover:bg-gray-800"
                  }`}
                  data-testid="button-view-3-months"
                >
                  Last 3 Months
                </Button>
              </div>
            </div>

            {/* Account Filter */}
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Accounts
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain">
                {accounts.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No accounts connected
                  </p>
                ) : (
                  accounts.map((account) => {
                    const isSelected = selectedAccountIds.length === 0 || selectedAccountIds.includes(account.id);
                    return (
                      <button
                        type="button"
                        key={account.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors w-full text-left"
                        data-testid={`filter-account-${account.id}`}
                        onClick={() => handleAccountToggle(account.id)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {account.accountName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {account.institution || account.type}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleClearFilters();
                setViewMode("1");
                setSelectedMonth(startOfMonth(new Date()));
              }}
              className="flex-1 border-gray-700 hover:bg-gray-800"
              data-testid="button-clear-filters"
            >
              Reset All
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFilterOpen(false)}
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
