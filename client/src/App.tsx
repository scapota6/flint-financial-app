import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { ActivityTimeoutModal } from "@/components/ActivityTimeoutModal";
import GlobalNavbar from "@/components/layout/global-navbar";
import { useAuth } from "@/hooks/useAuth";

// Code-split all page components for optimal bundle size
const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const SuccessPage = lazy(() => import("@/pages/success"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Trading = lazy(() => import("@/pages/Trading"));
const Transfers = lazy(() => import("@/pages/transfers"));
const WatchlistPage = lazy(() => import("@/pages/Watchlist"));
const Activity = lazy(() => import("@/pages/activity"));
const Subscribe = lazy(() => import("@/pages/subscribe"));
const Profile = lazy(() => import("@/pages/profile"));
const News = lazy(() => import("@/pages/news"));
const StockDetail = lazy(() => import("@/pages/stock-detail"));
const AssetDetail = lazy(() => import("@/pages/asset-detail"));
const Accounts = lazy(() => import("@/pages/Accounts"));
const BrokerageDetail = lazy(() => import("@/pages/BrokerageDetail"));
const BankDetail = lazy(() => import("@/pages/BankDetail"));
const Connections = lazy(() => import("@/pages/connections"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const Settings = lazy(() => import("@/pages/Settings"));
const Security = lazy(() => import("@/pages/Security"));
const Monitoring = lazy(() => import("@/pages/Monitoring"));
const TellerCallback = lazy(() => import("@/pages/TellerCallback"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const PasswordSetup = lazy(() => import("@/pages/password-setup"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Login = lazy(() => import("@/pages/login"));
const TermsOfService = lazy(() => import("@/pages/tos"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
  </div>
);

// Public route wrapper that redirects authenticated users
function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    window.location.href = '/dashboard';
    return null;
  }
  
  return <Component />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && <GlobalNavbar />}
      {isAuthenticated && <ActivityTimeoutModal />}
      <div className={isAuthenticated ? "pt-16" : ""}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Switch>
            {!isAuthenticated ? (
              <>
                <Route path="/" component={Landing} />
                <Route path="/landing" component={Landing} />
                <Route path="/login" component={Login} />
                <Route path="/success" component={SuccessPage} />
                <Route path="/landing/success" component={SuccessPage} />
                <Route path="/payment-success" component={PaymentSuccessPage} />
                <Route path="/setup-password" component={PasswordSetup} />
                <Route path="/reset-password" component={ResetPassword} />
                <Route path="/tos" component={TermsOfService} />
                <Route path="/privacy-policy" component={PrivacyPolicy} />
                {/* Redirect any protected routes to login */}
                <Route path="/dashboard">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/accounts">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/trading">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/portfolio">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/transfers">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/watchlist">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/activity">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/settings">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/profile">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
                <Route path="/subscribe">
                  {() => { window.location.href = '/api/login'; return null; }}
                </Route>
              </>
            ) : (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/trading" component={Trading} />
                <Route path="/transfers" component={Transfers} />
                <Route path="/watchlist" component={WatchlistPage} />
                <Route path="/activity" component={Activity} />
                <Route path="/subscribe" component={Subscribe} />
                <Route path="/profile" component={Profile} />
                <Route path="/news" component={News} />
                <Route path="/stock/:symbol" component={StockDetail} />
                <Route path="/asset/:symbol" component={AssetDetail} />
                <Route path="/portfolio" component={Portfolio} />
                <Route path="/accounts" component={Accounts} />
                <Route path="/accounts/brokerage/:id" component={BrokerageDetail} />
                <Route path="/accounts/bank/:id" component={BankDetail} />
                <Route path="/connections" component={Connections} />
                <Route path="/settings" component={Settings} />
                <Route path="/security" component={Security} />
                <Route path="/monitoring" component={Monitoring} />
                <Route path="/teller/callback" component={TellerCallback} />
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/tos" component={TermsOfService} />
                <Route path="/privacy-policy" component={PrivacyPolicy} />
                {/* Redirect authenticated users away from landing page */}
                <Route path="/landing">
                  {() => { window.location.href = '/dashboard'; return null; }}
                </Route>
              </>
            )}
            <Route component={NotFound} />
          </Switch>
          </Suspense>
        </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ActivityProvider>
          <TooltipProvider>
            <div>
              <Toaster />
              <Router />
            </div>
          </TooltipProvider>
        </ActivityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
