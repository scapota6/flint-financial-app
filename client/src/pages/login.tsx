import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import flintLogo from "@assets/flint-logo.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        // Throw an object with both message and code
        const error: any = new Error(errorData.message || "Login failed");
        error.code = errorData.code;
        error.email = errorData.email;
        throw error;
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message || "Login successful",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      const message = error.message || "Invalid email or password";
      setErrorMessage(message);
      setErrorCode(error.code || "");
      setUserEmail(error.email || "");
      
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || "Failed to resend verification email");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link.",
      });
      setErrorMessage("");
      setErrorCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setErrorMessage("");
    setErrorCode("");
    setUserEmail(data.email);
    loginMutation.mutate(data);
  };

  const handleResendVerification = () => {
    if (userEmail) {
      resendVerificationMutation.mutate(userEmail);
    }
  };

  const handleOAuthLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 rounded-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={flintLogo} 
              alt="Flint Logo" 
              className="h-12 w-auto"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
          <CardTitle className="apple-h2 text-center text-white">
            Welcome Back
          </CardTitle>
          <CardDescription className="apple-body text-center text-gray-400">
            Log in to your Flint account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-900 rounded-xl" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="apple-caption" data-testid="text-error-message">
                {errorMessage}
                {errorCode === "EMAIL_NOT_VERIFIED" && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendVerificationMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-700 rounded-xl"
                      data-testid="button-resend-verification"
                    >
                      {resendVerificationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend Verification Email"
                      )}
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="apple-caption text-gray-200">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        className="bg-gray-900 border-gray-600 text-white rounded-xl"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage className="apple-caption text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="apple-caption text-gray-200">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="bg-gray-900 border-gray-600 text-white pr-10 rounded-xl"
                          data-testid="input-password"
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
                    <FormMessage className="apple-caption text-red-400" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Link
                  href="/reset-password"
                  className="apple-caption text-blue-400 hover:text-blue-300"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="apple-caption text-gray-400">
              Don't have an account?{" "}
              <Link 
                href="/" 
                className="text-blue-400 hover:text-blue-300"
                data-testid="link-landing"
              >
                Go to landing page
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
