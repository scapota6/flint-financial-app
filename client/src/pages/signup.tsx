import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, AlertCircle, Check, X } from "lucide-react";
import { Link } from "wouter";
import flintLogo from "@assets/flint-logo.png";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const password = form.watch("password");
  
  const passwordRequirements = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ""),
    lowercase: /[a-z]/.test(password || ""),
    number: /[0-9]/.test(password || ""),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password || ""),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const onSubmit = async (data: SignupFormValues) => {
    setErrorMessage("");
    
    if (!isPasswordValid) {
      setErrorMessage("Password does not meet all requirements");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/public-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.name,
          email: data.email.toLowerCase(),
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      } else {
        if (result.message?.toLowerCase().includes("already")) {
          setErrorMessage("An account with this email already exists. Try logging in instead.");
        } else {
          setErrorMessage(result.message || "Registration failed. Please try again.");
        }
      }
    } catch (error) {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F2ED] p-4">
        <Card className="w-full max-w-md bg-white border-gray-200 rounded-lg shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <img src={flintLogo} alt="Flint Logo" className="h-12 w-auto" />
            </div>
            <CardTitle className="font-serif text-3xl text-center text-gray-900">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              We've sent a verification link to your email address. Click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <Link href="/login">
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F2ED] p-4">
      <Card className="w-full max-w-md bg-white border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img src={flintLogo} alt="Flint Logo" className="h-12 w-auto" />
          </div>
          <CardTitle className="font-serif text-3xl text-center text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Join Flint to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 rounded">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-700">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your name"
                        className="bg-white border-gray-300 text-gray-900 rounded focus:border-gray-500 focus:ring-gray-500"
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        className="bg-white border-gray-300 text-gray-900 rounded focus:border-gray-500 focus:ring-gray-500"
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="bg-white border-gray-300 text-gray-900 pr-10 rounded focus:border-gray-500 focus:ring-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-sm text-red-600" />
                  </FormItem>
                )}
              />

              {password && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordRequirements.length ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordRequirements.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1 ${passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordRequirements.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Uppercase
                    </div>
                    <div className={`flex items-center gap-1 ${passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordRequirements.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Lowercase
                    </div>
                    <div className={`flex items-center gap-1 ${passwordRequirements.number ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordRequirements.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Number
                    </div>
                    <div className={`flex items-center gap-1 ${passwordRequirements.special ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordRequirements.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Special char
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="text-gray-900 hover:text-gray-700 underline underline-offset-4 font-medium"
              >
                Log in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
