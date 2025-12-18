/**
 * Flint for Business Landing Page - Waitlist for enterprise customers
 * Route: /business
 * Focus: Funds, corporations, employee financial wellness
 */

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BeamsBackground } from "@/components/ui/beams-background";
import { 
  Building2, 
  Shield, 
  Check,
  Briefcase,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";
import { LandingHeader } from "@/components/layout/landing-header";
import { Helmet } from 'react-helmet';

export default function LandingBusiness() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    companySize: '',
    useCase: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactName || !formData.email) {
      setError('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/business-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit');
      }
      
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Failed to submit:', err);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>Flint for Business | Financial Tools for Your Team | Flint</title>
        <meta name="description" content="Give your team the tools to manage their money better. Flint for Business helps funds manage client assets and corporations support employee financial wellness." />
        <meta property="og:title" content="Flint for Business | Enterprise Financial Dashboard" />
        <meta property="og:description" content="Financial management tools for funds, corporations, and teams. Join the waitlist for early access." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="enterprise financial tools, corporate finance app, employee financial wellness, fund management software, business finance dashboard" />
      </Helmet>

      <BeamsBackground className="min-h-screen text-white overflow-x-hidden">
        <LandingHeader currentPage="business" />

        {/* Hero Section */}
        <section className="pt-28 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Content */}
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-2 mb-6">
                  <Briefcase className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm text-indigo-300">Coming Soon</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Financial Tools for <span className="text-indigo-400">Your Business</span>
                </h1>
                
                <p className="text-xl text-gray-300 mb-8">
                  Help your team manage their money better. Give employees the tools to track accounts, pay off debt, and build savings.
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <h3 className="font-semibold text-lg">For Corporations</h3>
                    <p className="text-gray-400">Give employees a benefit they'll actually use. Help them see all their money in one place.</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg">For Funds</h3>
                    <p className="text-gray-400">View client portfolios in one dashboard. Help manage assets without moving money.</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg">Enterprise Security</h3>
                    <p className="text-gray-400">Bank-level encryption. We never store passwords or keys. Your data stays safe.</p>
                  </div>
                </div>
              </div>

              {/* Right - Waitlist Form */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                {!submitted ? (
                  <>
                    <h2 className="text-2xl font-bold mb-2">Join the Waitlist</h2>
                    <p className="text-gray-400 mb-6">Be first to know when Flint for Business launches.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="companyName" className="text-gray-300">Company Name *</Label>
                        <Input
                          id="companyName"
                          type="text"
                          placeholder="Acme Inc."
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="contactName" className="text-gray-300">Your Name *</Label>
                        <Input
                          id="contactName"
                          type="text"
                          placeholder="John Smith"
                          value={formData.contactName}
                          onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email" className="text-gray-300">Work Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@acme.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone" className="text-gray-300">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="companySize" className="text-gray-300">Company Size</Label>
                        <Select 
                          value={formData.companySize} 
                          onValueChange={(value) => setFormData({...formData, companySize: value})}
                        >
                          <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">11-50 employees</SelectItem>
                            <SelectItem value="51-200">51-200 employees</SelectItem>
                            <SelectItem value="201-1000">201-1000 employees</SelectItem>
                            <SelectItem value="1000+">1000+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="useCase" className="text-gray-300">How would you use Flint?</Label>
                        <Select 
                          value={formData.useCase} 
                          onValueChange={(value) => setFormData({...formData, useCase: value})}
                        >
                          <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select use case" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee_benefit">Employee financial wellness benefit</SelectItem>
                            <SelectItem value="fund_management">Fund/wealth management</SelectItem>
                            <SelectItem value="client_reporting">Client portfolio reporting</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {error && (
                        <p className="text-red-400 text-sm">{error}</p>
                      )}
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full bg-indigo-500 hover:bg-indigo-600"
                      >
                        {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
                      </Button>
                      
                      <p className="text-xs text-gray-500 text-center">
                        We'll reach out when Flint for Business is ready.
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">You're on the List!</h2>
                    <p className="text-gray-400 mb-4">
                      Thanks for your interest in Flint for Business. We'll reach out soon with early access details.
                    </p>
                    <p className="text-sm text-gray-500">
                      Check your email at <span className="text-white">{formData.email}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Built for Business</h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Whether you manage funds or run a company, Flint helps your team.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-black/40 border border-white/10 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Corporate Wellness</h3>
                <p className="text-gray-400 mb-4">
                  Give employees a real financial benefit. Help them see all their accounts, track spending, and reach their money goals.
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Easy employee onboarding</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Anonymous usage - you see adoption, not data</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Bulk pricing for teams</li>
                </ul>
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Fund & Wealth Management</h3>
                <p className="text-gray-400 mb-4">
                  View client portfolios in one dashboard. We never store passwords or keys, and we are not a custodian.
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Client invites with one click</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> View-only access - never move money</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Export reports for clients</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="h-12 w-12 text-indigo-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-Grade Security</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Your data is protected by the same security used by banks. We never store passwords or keys. We are not a custodian and never take custody of your funds.
            </p>
            
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">256-bit</div>
                <div className="text-sm text-gray-400">Encryption</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-sm text-gray-400">Stored Passwords</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-gray-400">Monitoring</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-white/5 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
                <span className="text-xl font-semibold">Flint</span>
              </div>

              <div className="flex gap-6 text-sm text-gray-400">
                <Link href="/new" className="hover:text-white transition-colors">Personal</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/support" className="hover:text-white transition-colors">Support</Link>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
              <p>Flint is not a broker or bank. Investing and transfers depend on the platforms you connect.</p>
            </div>
          </div>
        </footer>
      </BeamsBackground>
    </>
  );
}
