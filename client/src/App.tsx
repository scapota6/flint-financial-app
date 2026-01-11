import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { ActivityTimeoutModal } from "@/components/ActivityTimeoutModal";
import { FloatingHeader } from "@/components/ui/floating-header";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useAuth } from "@/hooks/useAuth";
import { initializeAnalytics } from "@/lib/analytics";

// Eagerly load critical email-linked pages to prevent blank page on first load
import PasswordSetup from "@/pages/password-setup";
import ResetPassword from "@/pages/reset-password";
import Login from "@/pages/login";

// Code-split remaining pages for optimal bundle size
const NotFound = lazy(() => import("@/pages/not-found"));
const LandingNew = lazy(() => import("@/pages/landing-new")); // New official landing page
const LandingLegacy = lazy(() => import("@/pages/landing")); // Legacy landing (fallback)
const LandingCrypto = lazy(() => import("@/pages/landing-crypto")); // SEO: Crypto/DeFi
const LandingInvesting = lazy(() => import("@/pages/landing-investing")); // SEO: Stocks/Brokerages
const LandingBanking = lazy(() => import("@/pages/landing-banking")); // SEO: Banks/Credit Cards
const LandingBusiness = lazy(() => import("@/pages/landing-business")); // B2B Waitlist
const Blog = lazy(() => import("@/pages/blog")); // SEO: Blog listing
const BlogPost = lazy(() => import("@/pages/blog-post")); // SEO: Individual blog posts
const SuccessPage = lazy(() => import("@/pages/success"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const CheckoutSuccess = lazy(() => import("@/pages/checkout-success"));
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
const AdminBlog = lazy(() => import("@/pages/admin-blog"));
const AdminSeo = lazy(() => import("@/pages/admin-seo"));
const Analytics = lazy(() => import("@/pages/analytics"));
const TermsOfService = lazy(() => import("@/pages/tos"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));

// Loading fallback component with branding to prevent blank page appearance
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div className="text-center space-y-4">
      <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
        Flint
      </div>
      <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
      <p className="text-gray-400 text-sm mt-4">Loading...</p>
    </div>
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
    return <PageLoader />;
  }

  return (
    <>
      {isAuthenticated && (
        <div
          className="fixed inset-0 z-0"
          style={{
            background: "radial-gradient(125% 125% at 50% 10%, #0a0a0a 40%, #1e3a5f 100%)",
          }}
        />
      )}
      {isAuthenticated && <UpgradeBanner />}
      {isAuthenticated && <ActivityTimeoutModal />}
      <div className={isAuthenticated ? "authenticated-content px-4 relative pt-20 z-10" : ""}>
        {isAuthenticated && <FloatingHeader />}
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Switch>
            {!isAuthenticated ? (
              <>
                <Route path="/" component={LandingLegacy} />
                <Route path="/landing" component={LandingLegacy} />
                <Route path="/new" component={LandingNew} />
                <Route path="/legacy" component={LandingLegacy} />
                <Route path="/login" component={Login} />
                <Route path="/success" component={SuccessPage} />
                <Route path="/landing/success" component={SuccessPage} />
                <Route path="/payment-success" component={PaymentSuccessPage} />
                <Route path="/checkout-success" component={CheckoutSuccess} />
                <Route path="/setup-password" component={PasswordSetup} />
                <Route path="/reset-password" component={ResetPassword} />
                <Route path="/tos" component={TermsOfService} />
                <Route path="/privacy-policy" component={PrivacyPolicy} />
                <Route path="/crypto" component={LandingCrypto} />
                <Route path="/investing" component={LandingInvesting} />
                <Route path="/banking" component={LandingBanking} />
                <Route path="/business" component={LandingBusiness} />
                <Route path="/blog" component={Blog} />
                <Route path="/blog/:slug" component={BlogPost} />
                {/* Redirect any protected routes to landing page */}
                <Route path="/dashboard">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/accounts">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/trading">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/portfolio">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/transfers">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/watchlist">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/activity">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/settings">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/profile">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/subscribe">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/news">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/stock/:symbol">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/asset/:symbol">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/connections">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/security">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/monitoring">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
                <Route path="/admin">
                  {() => { window.location.href = '/'; return null; }}
                </Route>
              </>
            ) : (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/analytics" component={Analytics} />
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
                <Route path="/admin/blog" component={AdminBlog} />
                <Route path="/admin/seo" component={AdminSeo} />
                <Route path="/tos" component={TermsOfService} />
                <Route path="/privacy-policy" component={PrivacyPolicy} />
                <Route path="/blog" component={Blog} />
                <Route path="/blog/:slug" component={BlogPost} />
                {/* Redirect authenticated users away from landing page */}
                <Route path="/landing">
                  {() => { window.location.href = '/dashboard'; return null; }}
                </Route>
                <Route component={NotFound} />
              </>
            )}
            {/* Catch-all 404 for any remaining routes */}
            <Route component={NotFound} />
          </Switch>
          </Suspense>
        </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  // Initialize analytics on app mount - captures UTM params, referrer, and tracks landing
  useEffect(() => {
    initializeAnalytics();
  }, []);

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
