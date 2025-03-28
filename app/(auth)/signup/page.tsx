"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; // Assuming you still use ShadCN Button
import { Input } from "@/components/ui/input";   // Assuming you still use ShadCN Input
import { Label } from "@/components/ui/label";   // Assuming you still use ShadCN Label
import { Loader2, UserPlus } from "lucide-react"; // Using UserPlus icon
import { useAuth } from "@/context/AuthContext"; // Assuming context path is correct

// Google Icon Component (Re-used)
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { signUpWithEmail, signInWithGoogle, loading, user } = useAuth();
  const router = useRouter();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signUpWithEmail(email, password);
    } catch (error) {
      console.error("Signup failed:", error); // Keep error logging
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleGoogleSignup = async () => {
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle(); // Google handles both login/signup flow
    }
    catch (error) {
      console.error("Google signup failed:", error); // Keep error logging
    }
    finally {
      setIsGoogleSubmitting(false);
    }
  };

  useEffect(() => {
    // Redirect if user is logged in (after loading state is resolved)
    if (!loading && user) {
      router.replace('/dashboard'); // Redirect to your dashboard
    }
  }, [loading, user, router]);

  // Loading state
  if (loading) {
     return (
      // Use the new theme's background color for the loading screen
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background-rgb,10,10,12))]">
        {/* Use a color that fits the new theme */}
        <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--primary-rgb,20,110,130))]" />
      </div>
    );
  }

  // If user is already logged in, don't render the form
  if (user) {
    return null;
  }

  // Render the new signup form
  return (
     // Apply the scoping class and base styles for the new theme here
     <div className="auth-scope flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="nebula-bg"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60 z-0"></div>

      {/* Signup Panel */}
      <div className="w-full max-w-sm relative z-10 animate-fadeIn">
        {/* Optional Glow Border */}
         <div className="absolute -inset-px bg-gradient-to-br from-[rgba(var(--primary-rgb),0.2)] via-transparent to-[rgba(var(--accent-rgb),0.1)] rounded-lg opacity-70 blur-sm"></div>

        <div
          // Use CSS variables defined within .auth-scope
          className="relative bg-[rgb(var(--card-rgb))]/80 backdrop-blur-md border border-[rgb(var(--border-rgb))]/50 rounded-lg shadow-xl overflow-hidden scan-line animate-scan-line"
        >
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-[rgb(var(--foreground-rgb))] text-depth">
                Create Account
              </h1>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
               {/* Email Input */}
              <div className="space-y-1.5 group">
                <Label htmlFor="email" className="text-xs font-medium text-[rgb(var(--muted-foreground-rgb))] group-focus-within:text-[rgb(var(--primary-rgb))] transition-colors duration-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  // Use CSS variables defined within .auth-scope
                  className="h-10 px-3 bg-[rgb(var(--input-rgb))] border border-[rgb(var(--border-rgb))] rounded-md text-sm text-[rgb(var(--foreground-rgb))] placeholder:text-[rgb(var(--muted-rgb))] focus:border-[rgb(var(--primary-rgb))] focus:ring-1 focus:ring-[rgb(var(--primary-rgb))] focus:ring-opacity-50 focus:outline-none transition duration-200"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 group">
                <Label htmlFor="password" className="text-xs font-medium text-[rgb(var(--muted-foreground-rgb))] group-focus-within:text-[rgb(var(--primary-rgb))] transition-colors duration-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  // Use CSS variables defined within .auth-scope
                  className="h-10 px-3 bg-[rgb(var(--input-rgb))] border border-[rgb(var(--border-rgb))] rounded-md text-sm text-[rgb(var(--foreground-rgb))] placeholder:text-[rgb(var(--muted-rgb))] focus:border-[rgb(var(--primary-rgb))] focus:ring-1 focus:ring-[rgb(var(--primary-rgb))] focus:ring-opacity-50 focus:outline-none transition duration-200"
                />
              </div>


              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                // Use CSS variables defined within .auth-scope
                 className="w-full h-10 !mt-6 bg-[rgb(var(--primary-rgb))] text-[rgb(var(--primary-foreground-rgb))] text-sm font-medium rounded-md hover:bg-[rgba(var(--primary-rgb),0.9)] hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[rgb(var(--card-rgb))] focus:ring-[rgb(var(--primary-rgb))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 btn-press"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Register Account
              </Button>
            </form>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[rgb(var(--border-rgb))]/50"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[rgb(var(--card-rgb))] px-2 text-[rgb(var(--muted-foreground-rgb))]">
                  Or
                </span>
              </div>
            </div>

            {/* Google Button */}
            <Button
              variant="outline" // Keep variant if your Button component uses it
              type="button"
              onClick={handleGoogleSignup}
              disabled={isSubmitting || isGoogleSubmitting}
              // Use CSS variables defined within .auth-scope
              className="w-full h-10 bg-transparent border border-[rgb(var(--border-rgb))] text-[rgb(var(--muted-foreground-rgb))] text-sm font-medium rounded-md hover:bg-[rgb(var(--input-rgb))] hover:text-[rgb(var(--foreground-rgb))] hover:border-[rgb(var(--muted-rgb))] focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-[rgb(var(--card-rgb))] focus:ring-[rgb(var(--muted-rgb))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 btn-press"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>

            {/* Footer Link */}
             <div className="text-center text-xs text-[rgb(var(--muted-foreground-rgb))] pt-3">
              Already registered?{" "}
              <Link
                href="/login"
                // Use CSS variables defined within .auth-scope
                 className="font-medium text-[rgb(var(--accent-rgb))] hover:text-[rgba(var(--accent-rgb),0.8)] transition-colors duration-200 underline underline-offset-2"
              >
                Access Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}