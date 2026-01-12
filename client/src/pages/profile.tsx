import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Settings, Shield, Lock, Share2, Copy, Check, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  referralLink: string;
  waitlistPosition: number;
}

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/auth/user'],
  });

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await apiRequest('/api/auth/logout', { method: 'POST' });
      queryClient.clear();
      setLocation('/login');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const { data: referralStats, isLoading: referralLoading } = useQuery<ReferralStats>({
    queryKey: ['/api/user/referral'],
    enabled: !!user,
  });

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => 
      apiRequest('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      apiRequest('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleCopyReferralLink = () => {
    if (referralStats?.referralLink) {
      navigator.clipboard.writeText(referralStats.referralLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-gray-900" />
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          </div>
          <Button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </Button>
        </div>

        {/* Profile Information */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage your account details and personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-900">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  disabled={!isEditing}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-900">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  disabled={!isEditing}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                className="bg-gray-100 border-gray-300 text-gray-500"
              />
              <p className="text-sm text-gray-500">Email cannot be changed</p>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleProfileSave}
                    disabled={updateProfileMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || '',
                      });
                    }}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account & Subscription */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Settings className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Subscription Tier</Label>
                <p className="text-lg font-semibold text-blue-600 capitalize">
                  {user?.subscriptionTier || 'Free'}
                </p>
              </div>
              <div>
                <Label className="text-gray-700">Account Status</Label>
                <p className="text-lg font-semibold text-green-600 capitalize">
                  {user?.subscriptionStatus || 'Active'}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Member Since</Label>
              <p className="text-gray-600">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Share2 className="h-5 w-5" />
              Invite & Unlock
            </CardTitle>
            <CardDescription className="text-gray-600">
              Share your referral link and unlock premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {referralLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                {/* Referral Link */}
                <div className="space-y-3">
                  <Label className="text-gray-900">Your Referral Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={referralStats?.referralLink || 'Loading...'}
                      readOnly
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                      data-testid="input-referral-link"
                    />
                    <Button 
                      onClick={handleCopyReferralLink}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      data-testid="button-copy-referral"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Share this link with friends to earn referral rewards
                  </p>
                </div>

                {/* Referral Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
                  <div>
                    <Label className="text-gray-300 text-sm">Your Referral Code</Label>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                      {referralStats?.referralCode || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Successful Referrals</Label>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      {referralStats?.referralCount || 0}
                    </p>
                  </div>
                </div>

                {/* Referral Rewards */}
                <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Unlock Rewards
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold">3</span>
                      </div>
                      <p className="text-gray-700">
                        <span className="font-semibold text-gray-900">Refer 3 friends</span> → Unlock unlimited accounts for 1 month
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold">5</span>
                      </div>
                      <p className="text-gray-700">
                        <span className="font-semibold text-gray-900">Refer 5 friends</span> → Get 1 month Pro free
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription className="text-gray-600">
              Update your password. You'll need to enter your current password first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-gray-900">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-gray-900">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
                data-testid="input-new-password"
              />
              <p className="text-sm text-gray-500">Must be at least 8 characters long</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
                data-testid="input-confirm-password"
              />
            </div>
            <Button 
              onClick={handlePasswordChange}
              disabled={changePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>

        {/* Logout Section - Mobile Friendly */}
        <Card className="bg-white border-gray-200 md:hidden">
          <CardContent className="p-4">
            <Button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              data-testid="button-logout-mobile"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}