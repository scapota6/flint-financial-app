import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email.toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send reset link");
      }

      setShowSuccess(true);
      toast({
        title: "Reset Link Sent",
        description: "If an account exists with this email, a password reset link will be sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F2ED] p-4">
      <Card className="w-full max-w-md bg-white border-gray-200 shadow-sm rounded-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="text-2xl font-bold text-gray-900">Flint</div>
          </div>
          <CardDescription className="text-center text-gray-600">
            Enter your email address and we'll send you a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSuccess ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="rounded-xl bg-green-100 p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-gray-900" data-testid="text-success-title">
                    Check Your Email
                  </h3>
                  <p className="text-sm text-gray-600" data-testid="text-success-message">
                    If an account exists with this email, a password reset link will be sent.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setShowSuccess(false)}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg"
                  data-testid="button-send-another"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Another Link
                </Button>
                
                <a
                  href="/login"
                  className="flex items-center justify-center w-full h-10 px-4 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                  data-testid="link-login"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </a>
              </div>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-gray-700">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="your.email@example.com"
                              className="bg-white border-gray-300 text-gray-900 pl-10 rounded-lg placeholder:text-gray-400"
                              data-testid="input-email"
                              autoFocus
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-sm text-red-500" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-center text-sm">
                  <p className="text-gray-600">
                    Remember your password?{" "}
                    <a 
                      href="/login" 
                      className="text-gray-900 hover:text-gray-700 font-medium underline underline-offset-4"
                      data-testid="link-login-alt"
                    >
                      Log in
                    </a>
                  </p>
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <a 
                      href="/" 
                      className="text-gray-900 hover:text-gray-700 font-medium underline underline-offset-4"
                      data-testid="link-home"
                    >
                      Sign up
                    </a>
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
