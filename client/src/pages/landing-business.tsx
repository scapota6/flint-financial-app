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
import { Helmet } from 'react-helmet-async';

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

      <div className="min-h-screen bg-[#F4F2ED] overflow-x-hidden">
        <LandingHeader currentPage="business" />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-[#1a56db] font-medium text-sm flex items-center gap-2 mb-6">
                  <Briefcase className="h-4 w-4" />
                  Coming Soon
                </p>
                
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
                  Financial Tools for Your Business
                </h1>
                
                <p className="text-xl text-gray-600 mb-8">
                  Help your team manage their money better. Give employees the tools to track accounts, pay off debt, and build savings.
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">For Corporations</h3>
                    <p className="text-gray-500">Give employees a benefit they'll actually use. Help them see all their money in one place.</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">For Funds</h3>
                    <p className="text-gray-500">View client portfolios in one dashboard. Help manage assets without moving money.</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Enterprise Security</h3>
                    <p className="text-gray-500">Bank-level encryption. We never store passwords or keys. Your data stays safe.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-8 shadow-sm">
                {!submitted ? (
                  <>
                    <h2 className="text-2xl font-bold font-serif mb-2 text-gray-900">Join the Waitlist</h2>
                    <p className="text-gray-500 mb-6">Be first to know when Flint for Business launches.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="companyName" className="text-gray-600">Company Name *</Label>
                        <Input
                          id="companyName"
                          type="text"
                          placeholder="Acme Inc."
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="contactName" className="text-gray-600">Your Name *</Label>
                        <Input
                          id="contactName"
                          type="text"
                          placeholder="John Smith"
                          value={formData.contactName}
                          onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                          className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email" className="text-gray-600">Work Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@acme.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone" className="text-gray-600">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="companySize" className="text-gray-600">Company Size</Label>
                        <Select 
                          value={formData.companySize} 
                          onValueChange={(value) => setFormData({...formData, companySize: value})}
                        >
                          <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900">
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
                        <Label htmlFor="useCase" className="text-gray-600">How would you use Flint?</Label>
                        <Select 
                          value={formData.useCase} 
                          onValueChange={(value) => setFormData({...formData, useCase: value})}
                        >
                          <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900">
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
                        <p className="text-red-500 text-sm">{error}</p>
                      )}
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white"
                      >
                        {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
                      </Button>
                      
                      <p className="text-xs text-gray-400 text-center">
                        We'll reach out when Flint for Business is ready.
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold font-serif mb-2 text-gray-900">You're on the List!</h2>
                    <p className="text-gray-500 mb-4">
                      Thanks for your interest in Flint for Business. We'll reach out soon with early access details.
                    </p>
                    <p className="text-sm text-gray-400">
                      Check your email at <span className="text-gray-900">{formData.email}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-4 text-gray-900">Built for Business</h2>
            <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
              Whether you manage funds or run a company, Flint helps your team.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-8 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3 md:mb-4">
                  <Building2 className="h-5 w-5 md:h-6 md:w-6 text-[#1a56db]" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Corporate Wellness</h3>
                <p className="text-gray-500 mb-3 md:mb-4 text-sm md:text-base">
                  Give employees a real financial benefit. Help them see all their accounts, track spending, and reach their money goals.
                </p>
                <ul className="space-y-2 text-gray-600 text-sm md:text-base">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Easy employee onboarding</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Anonymous usage - you see adoption, not data</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Bulk pricing for teams</li>
                </ul>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-8 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3 md:mb-4">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-[#1a56db]" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Fund & Wealth Management</h3>
                <p className="text-gray-500 mb-3 md:mb-4 text-sm md:text-base">
                  View client portfolios in one dashboard. We never store passwords or keys, and we are not a custodian.
                </p>
                <ul className="space-y-2 text-gray-600 text-sm md:text-base">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Client invites with one click</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> View-only access - never move money</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Export reports for clients</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="h-12 w-12 text-[#1a56db] mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900">Enterprise-Grade Security</h2>
            <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
              Your data is protected by the same security used by banks. We never store passwords or keys. We are not a custodian and never take custody of your funds.
            </p>
            
            <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-gray-900">256-bit</div>
                <div className="text-xs md:text-sm text-gray-500">Encryption</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs md:text-sm text-gray-500">Stored Passwords</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-gray-900">24/7</div>
                <div className="text-xs md:text-sm text-gray-500">Monitoring</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-200 bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
                <span className="text-xl font-semibold text-gray-900">Flint</span>
              </div>

              <div className="flex gap-6 text-sm text-gray-500">
                <Link href="/new" className="hover:text-gray-900 transition-colors">Personal</Link>
                <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
                <Link href="/support" className="hover:text-gray-900 transition-colors">Support</Link>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Flint is not a broker or bank. Investing and transfers depend on the platforms you connect.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
