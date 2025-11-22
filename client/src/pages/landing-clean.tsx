/**
 * Flint Premium Landing Page - Clean, Modern Design
 * Inspired by Apple + 21st.dev aesthetic
 * Easy on the eyes, professional, high-converting
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight, Eye, EyeOff, Zap, Shield, BarChart3, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";
import "../styles/design-system.css";

export default function LandingClean() {
  const [isDark, setIsDark] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Password validation
  const validatePassword = (password: string) => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  });

  const passwordRequirements = validatePassword(signupData.password);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError('');

    if (!signupData.name || !signupData.email || !signupData.password) {
      setSignupError('Please fill in all fields');
      return;
    }

    if (!isPasswordValid) {
      setSignupError('Password does not meet security requirements');
      return;
    }

    setSignupLoading(true);
    
    try {
      const response = await fetch('/api/auth/public-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupData.name,
          email: signupData.email,
          password: signupData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: signupData.email,
              password: signupData.password,
            }),
          });

          if (loginResponse.ok) {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/login?registered=true';
          }
        } catch {
          window.location.href = '/login?registered=true';
        }
      } else {
        setSignupError(data.message || 'Registration failed. Please try again.');
      }
    } catch {
      setSignupError('Network error. Please check your connection and try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="bg-black dark text-white min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-white/10 sticky top-0 z-40 backdrop-blur-md bg-black/80">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={flintLogo} alt="Flint" className="h-8 w-8" />
            <span className="text-xl font-bold">Flint</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm hover:text-blue-400">Sign in</Link>
            <Button className="btn-base btn-primary text-sm" data-testid="nav-signup">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section">
        <div className="container text-center">
          <h1 className="mb-6">Your wealth, unified</h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Connect all your accounts in one place. Track investments, execute trades, and manage your money with confidence.
          </p>
          <div className="flex gap-4 justify-center mb-16">
            <Button className="btn-base btn-primary" data-testid="hero-cta-primary">
              Start Free Trial <ArrowRight size={18} />
            </Button>
            <Button className="btn-base btn-secondary" data-testid="hero-cta-secondary">
              Watch Demo
            </Button>
          </div>

          {/* Hero Image Placeholder */}
          <div className="bg-gradient-to-b from-blue-500/10 to-transparent rounded-2xl p-8 border border-white/10 h-96 flex items-center justify-center">
            <p className="text-gray-600">Dashboard Preview</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-compact bg-white/5 border-y border-white/10">
        <div className="container">
          <h2 className="text-center mb-12">Everything you need</h2>
          <div className="grid-2">
            <FeatureCard 
              icon={<BarChart3 size={24} className="text-blue-400" />}
              title="Complete Portfolio"
              description="See all your investments, crypto, and bank accounts in one unified dashboard"
            />
            <FeatureCard 
              icon={<TrendingUp size={24} className="text-green-400" />}
              title="Smart Analytics"
              description="Gain insights into your spending, investments, and financial health"
            />
            <FeatureCard 
              icon={<Zap size={24} className="text-yellow-400" />}
              title="Fast Execution"
              description="Trade stocks and execute transfers with just a few clicks"
            />
            <FeatureCard 
              icon={<Shield size={24} className="text-purple-400" />}
              title="Bank-Level Security"
              description="Your data is encrypted and protected with enterprise-grade security"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section">
        <div className="container">
          <h2 className="text-center mb-12">Simple pricing</h2>
          <div className="grid-2 max-w-4xl mx-auto">
            <PricingCard 
              name="Free"
              price="$0"
              description="Get started"
              features={["Up to 4 connected accounts", "Basic portfolio tracking", "Community support"]}
              cta="Get Started"
              highlighted={false}
            />
            <PricingCard 
              name="Pro"
              price="$39"
              description="Per month"
              features={["Unlimited accounts", "Advanced analytics", "Priority support", "Custom alerts"]}
              cta="Start Free Trial"
              highlighted={true}
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="section-compact bg-white/5 border-y border-white/10">
        <div className="container text-center">
          <p className="text-gray-400 mb-8">Trusted by 50,000+ investors</p>
          <div className="flex justify-center gap-8 items-center">
            {['⭐ 4.9 stars', '🚀 24/7 support', '🔒 Bank-grade security'].map((stat) => (
              <p key={stat} className="text-sm text-gray-400">{stat}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section className="section">
        <div className="container max-w-2xl">
          <div className="card border-white/10 p-10">
            <h2 className="text-center mb-2">Create your account</h2>
            <p className="text-center text-gray-400 mb-8">Join thousands of investors managing their wealth smarter</p>

            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Full Name</label>
                <Input
                  type="text"
                  placeholder="John Smith"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  className="input-base w-full"
                  required
                  data-testid="signup-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="input-base w-full"
                  required
                  data-testid="signup-email"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="input-base w-full pr-10"
                    required
                    data-testid="signup-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    data-testid="toggle-password"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {(passwordFocused || (signupData.password && !isPasswordValid)) && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg text-sm space-y-2 border border-white/10" data-testid="password-requirements">
                    {[
                      { req: passwordRequirements.length, label: 'At least 8 characters' },
                      { req: passwordRequirements.uppercase, label: 'One uppercase letter' },
                      { req: passwordRequirements.lowercase, label: 'One lowercase letter' },
                      { req: passwordRequirements.number, label: 'One number' },
                      { req: passwordRequirements.special, label: 'One special character' },
                    ].map(({ req, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded flex items-center justify-center ${req ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}>
                          {req && <Check size={12} />}
                        </div>
                        <span className={req ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {signupError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm" data-testid="signup-error">
                  {signupError}
                </div>
              )}

              <Button 
                type="submit"
                disabled={signupLoading}
                className="btn-base btn-primary w-full h-12 mt-6"
                data-testid="signup-submit"
              >
                {signupLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-400 hover:text-blue-300" data-testid="link-login">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-12 bg-gradient-to-t from-blue-500/10 to-transparent border-t border-white/10">
        <div className="container text-center">
          <h3 className="mb-4">Ready to take control?</h3>
          <Button className="btn-base btn-primary" data-testid="footer-cta">
            Get Started Now <ArrowRight size={18} />
          </Button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function PricingCard({ 
  name, 
  price, 
  description, 
  features, 
  cta, 
  highlighted 
}: { 
  name: string; 
  price: string; 
  description: string; 
  features: string[]; 
  cta: string; 
  highlighted: boolean;
}) {
  return (
    <div className={`card ${highlighted ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-transparent' : ''}`}>
      <h3 className="mb-2">{name}</h3>
      <div className="mb-2">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-gray-400 ml-2">{description}</span>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm">
            <Check size={16} className="text-green-400 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button className={`btn-base w-full ${highlighted ? 'btn-primary' : 'btn-secondary'}`}>
        {cta}
      </Button>
    </div>
  );
}
