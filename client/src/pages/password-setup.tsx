import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Hardened password validation schema (12-128 chars, 3 of 4 character classes)
const passwordSetupSchema = z.object({
  password: z.string()
    .min(12, "Password must be at least 12 characters long")
    .max(128, "Password must not exceed 128 characters")
    .refine(
      (password) => password === password.trim(),
      "Password cannot have leading or trailing spaces"
    )
    .refine(
      (password) => {
        let characterClassCount = 0;
        if (/[a-z]/.test(password)) characterClassCount++;
        if (/[A-Z]/.test(password)) characterClassCount++;
        if (/[0-9]/.test(password)) characterClassCount++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) characterClassCount++;
        return characterClassCount >= 3;
      },
      "Password must include at least 3 of 4 types: lowercase, uppercase, digit, symbol"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordSetupFormValues = z.infer<typeof passwordSetupSchema>;

// Password strength calculator (updated for 12-char minimum)
function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  
  // Length scoring (minimum 12)
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  
  // Character diversity
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 15;
  
  // Bonus for spaces (passphrase indicator)
  if (/\s/.test(password) && password.trim() === password) score += 5;

  if (score <= 40) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 60) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score <= 80) return { score, label: "Good", color: "bg-blue-500" };
  return { score: Math.min(score, 100), label: "Strong", color: "bg-green-500" };
}

// Password requirements checker
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

// Helper to count character classes
function countCharacterClasses(password: string): number {
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/[0-9]/.test(password)) count++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) count++;
  return count;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "12-128 characters", test: (p) => p.length >= 12 && p.length <= 128 },
  { label: "No leading/trailing spaces", test: (p) => p === p.trim() },
  { label: "3 of 4 types: lowercase, uppercase, digit, symbol", test: (p) => countCharacterClasses(p) >= 3 },
];

export default function PasswordSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const form = useForm<PasswordSetupFormValues>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      toast({
        title: "Invalid Link",
        description: "No setup token found. Please use the link from your approval email.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/"), 3000);
    } else {
      setToken(tokenParam);
    }
  }, [toast, setLocation]);

  const passwordStrength = calculatePasswordStrength(passwordValue);

  const onSubmit = async (data: PasswordSetupFormValues) => {
    if (!token) {
      toast({
        title: "Error",
        description: "No setup token found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to set up password");
      }

      // Password setup successful, redirect to login
      toast({
        title: "Success!",
        description: "Your password has been set up successfully. Redirecting to login...",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set up password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Validating setup link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="text-3xl font-bold text-blue-500">Flint</div>
          </div>
          <CardTitle className="text-2xl text-center text-white">
            Set Up Your Password
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            Create a secure password for your Flint account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="bg-gray-900 border-gray-600 text-white pr-10"
                          data-testid="input-password"
                          onChange={(e) => {
                            field.onChange(e);
                            setPasswordValue(e.target.value);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Password strength indicator */}
              {passwordValue && (
                <div className="space-y-2" data-testid="password-strength">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Password Strength</span>
                    <span className={`font-medium ${
                      passwordStrength.label === "Weak" ? "text-red-400" :
                      passwordStrength.label === "Fair" ? "text-yellow-400" :
                      passwordStrength.label === "Good" ? "text-blue-400" :
                      "text-green-400"
                    }`} data-testid="text-password-strength">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress 
                    value={passwordStrength.score} 
                    className="h-2"
                    data-testid="progress-password-strength"
                  />
                </div>
              )}

              {/* Password requirements checklist */}
              {passwordValue && (
                <div className="space-y-2" data-testid="password-requirements">
                  <p className="text-sm text-gray-400">Password must include:</p>
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => {
                      const isMet = req.test(passwordValue);
                      return (
                        <div 
                          key={index} 
                          className="flex items-center gap-2 text-sm"
                          data-testid={`requirement-${index}`}
                        >
                          {isMet ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-500" />
                          )}
                          <span className={isMet ? "text-green-400" : "text-gray-400"}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="bg-gray-900 border-gray-600 text-white pr-10"
                          data-testid="input-confirm-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Set Up Password"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{" "}
              <a 
                href="/login" 
                className="text-blue-400 hover:text-blue-300"
                data-testid="link-login"
              >
                Log in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
