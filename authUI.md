/* @/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Overriding ShadCN defaults for a completely different feel */
    /* Core Palette: Deep Space, Cold Metal, Muted Earth, Arcane Glow */
    --background-rgb: 10 10 12; /* Almost black */
    --foreground-rgb: 210 210 215; /* Off-white / Pale Silver */
    --muted-rgb: 100 100 110; /* Mid-Gray */
    --muted-foreground-rgb: 160 160 170; /* Lighter Gray */

    --card-rgb: 18 18 20; /* Slightly lighter than background */
    --card-foreground-rgb: var(--foreground-rgb);

    --popover-rgb: 24 24 27; /* Darker popover */
    --popover-foreground-rgb: var(--foreground-rgb);

    --primary-rgb: 20 110 130; /* Deep Teal/Cyan */
    --primary-foreground-rgb: 240 240 245; /* Contrasting White */

    --secondary-rgb: 50 50 55; /* Dark Gray */
    --secondary-foreground-rgb: var(--foreground-rgb);

    --accent-rgb: 180 150 110; /* Muted Sand/Beige */
    --accent-foreground-rgb: 10 10 12;

    --destructive-rgb: 153 27 27; /* Deep Red */
    --destructive-foreground-rgb: var(--foreground-rgb);

    --border-rgb: 40 40 45; /* Subtle dark border */
    --input-rgb: 30 30 33; /* Input background */
    --ring-rgb: var(--primary-rgb); /* Ring color is the primary glow */

    --radius: 0.3rem; /* Sharper edges */
    --radius-large: 6px; /* Consistent sharper radius */

    /* Convert RGB to HSL for ShadCN components (optional but good practice) */
    --background: <hsl value for 10 10 12>;
    --foreground: <hsl value for 210 210 215>;
    /* ... Add HSL conversions for all vars if using ShadCN components extensively elsewhere ... */
    /* For this login/signup, we'll often use rgb directly or Tailwind classes */

    --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; /* Clean sans-serif */
  }

  /* Apply base styling */
  body {
    @apply bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))] antialiased;
    /* Add subtle noise texture */
    background-image: linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 1px 1px; /* Creates a very fine noise */
  }

  * {
    @apply border-[rgb(var(--border-rgb))];
  }

  /* Custom scrollbar for the theme */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: rgb(var(--background-rgb));
  }
  ::-webkit-scrollbar-thumb {
    background: rgb(var(--border-rgb));
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgb(var(--muted-rgb));
  }

}

@layer utilities {
  /* Text Shadow for depth */
  .text-depth {
    text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.5);
  }

  /* Subtle Glow Effect */
  .glow-sm {
    box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.3), 0 0 12px rgba(var(--primary-rgb), 0.2);
  }
  .glow-md {
    box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.4), 0 0 25px rgba(var(--primary-rgb), 0.3);
  }

  /* Animated Scan Line */
  @keyframes scan {
    0% { transform: translateY(-100%); opacity: 0.1; }
    50% { opacity: 0.3; }
    100% { transform: translateY(100%); opacity: 0; }
  }
  .scan-line::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px; /* Thicker scan line */
    background: linear-gradient(to bottom, rgba(var(--primary-rgb), 0), rgba(var(--primary-rgb), 0.8), rgba(var(--primary-rgb), 0));
    animation: scan 5s linear infinite;
    pointer-events: none;
    opacity: 0; /* Starts hidden */
    z-index: 15; /* Above content, below overlays if any */
  }
  .animate-scan-line { /* Class to activate the scan line */
     animation-delay: 0.5s; /* Delay start slightly */
  }
   .animate-scan-line::after {
     opacity: 0.1; /* Make it visible */
   }


  /* Background Stardust/Nebula Effect */
   @keyframes nebula-drift {
     0% { background-position: 0% 0%; }
     50% { background-position: 20% 10%; }
     100% { background-position: 0% 0%; }
   }
   .nebula-bg {
    position: absolute;
    inset: 0;
    z-index: -1; /* Behind everything */
    background:
      /* Layer 1: Distant stars */
      radial-gradient(ellipse at center, rgba(200, 200, 220, 0.03) 0%, transparent 60%),
      /* Layer 2: Subtle nebula clouds */
      radial-gradient(ellipse at top left, rgba(var(--primary-rgb), 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at bottom right, rgba(var(--accent-rgb), 0.08) 0%, transparent 55%);
    background-size: 150% 150%, 200% 200%, 180% 180%;
    animation: nebula-drift 90s ease-in-out infinite;
    opacity: 0.6;
   }

  /* Fade In Animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }

   /* Button Press Effect */
   .btn-press {
     transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
   }
   .btn-press:active:not(:disabled) {
      transform: scale(0.97);
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
   }
}




"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react"; // Using UserPlus
import { useAuth } from "@/context/AuthContext";

// Re-use the same Google Icon component
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    {/* SVG paths same as login */}
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);


export default function SignupPage() {
  // REMOVED First/Last Name as per requirement (only email/password/google)
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
      // Pass only email/password (update AuthContext if needed)
      await signUpWithEmail(email, password);
    } catch (error) {
      console.error("Signup failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleGoogleSignup = async () => {
    setIsGoogleSubmitting(true);
    try { await signInWithGoogle(); }
    catch (error) { console.error("Google signup failed:", error); }
    finally { setIsGoogleSubmitting(false); }
  };

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);


  if (loading) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background-rgb))]">
        <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--primary-rgb))]" />
      </div>
    );
  }
  if (user) return null;

  return (
     <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="nebula-bg"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60 z-0"></div>

      {/* Signup Panel */}
      <div className="w-full max-w-sm relative z-10 animate-fadeIn">
        {/* Optional Glow Border */}
         <div className="absolute -inset-px bg-gradient-to-br from-[rgba(var(--primary-rgb),0.2)] via-transparent to-[rgba(var(--accent-rgb),0.1)] rounded-lg opacity-70 blur-sm"></div>

        <div
          className="relative bg-[rgb(var(--card-rgb))]/80 backdrop-blur-md border border-[rgb(var(--border-rgb))]/50 rounded-lg shadow-xl overflow-hidden scan-line animate-scan-line"
        >
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-[rgb(var(--foreground-rgb))] text-depth">
                Registration Protocol
              </h1>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
               {/* Email Input (Same style as login) */}
              <div className="space-y-1.5 group">
                <Label htmlFor="email" className="text-xs font-medium text-[rgb(var(--muted-foreground-rgb))] group-focus-within:text-[rgb(var(--primary-rgb))] transition-colors duration-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="h-10 px-3 bg-[rgb(var(--input-rgb))] border border-[rgb(var(--border-rgb))] rounded-md text-sm text-[rgb(var(--foreground-rgb))] placeholder:text-[rgb(var(--muted-rgb))] focus:border-[rgb(var(--primary-rgb))] focus:ring-1 focus:ring-[rgb(var(--primary-rgb))] focus:ring-opacity-50 focus:outline-none transition duration-200"
                />
              </div>

              {/* Password Input (Same style as login) */}
              <div className="space-y-1.5 group">
                <Label htmlFor="password" className="text-xs font-medium text-[rgb(var(--muted-foreground-rgb))] group-focus-within:text-[rgb(var(--primary-rgb))] transition-colors duration-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="h-10 px-3 bg-[rgb(var(--input-rgb))] border border-[rgb(var(--border-rgb))] rounded-md text-sm text-[rgb(var(--foreground-rgb))] placeholder:text-[rgb(var(--muted-rgb))] focus:border-[rgb(var(--primary-rgb))] focus:ring-1 focus:ring-[rgb(var(--primary-rgb))] focus:ring-opacity-50 focus:outline-none transition duration-200"
                />
              </div>


              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                 className="w-full h-10 !mt-6 bg-[rgb(var(--primary-rgb))] text-[rgb(var(--primary-foreground-rgb))] text-sm font-medium rounded-md hover:bg-[rgba(var(--primary-rgb),0.9)] hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[rgb(var(--card-rgb))] focus:ring-[rgb(var(--primary-rgb))] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 btn-press"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" /> // Changed icon
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
                  Or External Protocol
                </span>
              </div>
            </div>

            {/* Google Button (Same style as login) */}
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignup}
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full h-10 bg-transparent border border-[rgb(var(--border-rgb))] text-[rgb(var(--muted-foreground-rgb))] text-sm font-medium rounded-md hover:bg-[rgb(var(--input-rgb))] hover:text-[rgb(var(--foreground-rgb))] hover:border-[rgb(var(--muted-rgb))] focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-[rgb(var(--card-rgb))] focus:ring-[rgb(var(--muted-rgb))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 btn-press"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Link via Google Core
            </Button>

            {/* Footer Link */}
             <div className="text-center text-xs text-[rgb(var(--muted-foreground-rgb))] pt-3">
              Already registered?{" "}
              <Link
                href="/login"
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



"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Sparkles, LockKeyhole } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { signInWithEmail, signInWithGoogle, loading, user } = useAuth();
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmail(email, password);
      // Success redirection is handled by AuthContext
    } catch (error) {
      // Error handling is done in AuthContext
      console.error("Login failed on page:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      // Success redirection is handled by AuthContext
    } catch (error) {
      // Error handling is done in AuthContext
      console.error("Google login failed on page:", error);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // Redirect if user is already logged in and not loading
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // Don't render login form if user is logged in (avoids flash)
  if (user) {
    return null; // Or a redirecting message
  }

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated background orbs */}
      <div className="orb-container">
        <div className="orb orb-space-gray"></div>
        <div className="orb orb-space-gray"></div>
        <div className="orb orb-space-gray"></div>
      </div>
      
      {/* Radial gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(64,64,64,0.1),transparent_40%)]"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,rgba(32,32,32,0.12),transparent_35%)]"></div>
      
      {/* Grid lines overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(75,75,75,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(75,75,75,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <Card className="w-full max-w-md relative overflow-hidden border-zinc-800/50 shadow-[0_10px_40px_rgba(0,0,0,0.25)] bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group">
        {/* Card inner glow effect */}
        <div className="absolute inset-px rounded-xl bg-gradient-to-b from-zinc-800/90 via-zinc-900/80 to-zinc-950/90 z-10"></div>
        
        {/* Animated border gradient */}
        <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-zinc-700/30 via-zinc-600/20 to-zinc-800/30 z-0 
                     group-hover:opacity-100 transition-opacity opacity-70"></div>
        
        {/* Animated card highlights */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-zinc-500/5 blur-3xl opacity-60 animate-[pulse_8s_ease-in-out_infinite] z-0"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-zinc-600/5 blur-3xl opacity-60 animate-[pulse_10s_ease-in-out_infinite_reverse] z-0"></div>
        
        <CardHeader className="space-y-3 text-center relative z-20 pt-8">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-zinc-700/30 to-zinc-800/20 ring-1 ring-zinc-700/30
                       shadow-[0_0_15px_rgba(0,0,0,0.2)] group-hover:shadow-[0_0_25px_rgba(75,75,75,0.25)] transition-all duration-500">
              <LockKeyhole className="h-7 w-7 text-zinc-400 group-hover:text-zinc-300" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-200 to-zinc-400">Welcome back</CardTitle>
          <CardDescription className="text-zinc-400/90 max-w-xs mx-auto">
            Sign in to your Ingestio.io account to access your dashboard
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleEmailLogin}>
          <CardContent className="space-y-6 relative z-20 px-8">
            <div className="space-y-2.5 group input-highlight">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-400 transition-all duration-300">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting || isGoogleSubmitting}
                className="h-12 px-4 bg-zinc-900/50 border-zinc-700/50 focus-visible:ring-zinc-500/50 focus-visible:ring-offset-0 
                       text-zinc-200 placeholder:text-zinc-600 transition-all duration-300"
              />
            </div>
            <div className="space-y-2.5 group input-highlight">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-400 transition-all duration-300">Password</Label>
                {/* <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-400 transition-colors animated-underline"
                >
                  Forgot password?
                </Link> */}
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting || isGoogleSubmitting}
                className="h-12 px-4 bg-zinc-900/50 border-zinc-700/50 focus-visible:ring-zinc-500/50 focus-visible:ring-offset-0
                       text-zinc-200 placeholder:text-zinc-600 transition-all duration-300"
              />
            </div>
            <Button 
              className="w-full h-12 font-medium text-sm bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-500 hover:to-zinc-600
                     text-zinc-100 shadow-lg hover:shadow-xl hover:shadow-black/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                     relative overflow-hidden auth-shine-effect" 
              type="submit" 
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4 opacity-80" />
              )}
              Sign In
            </Button>
            
            <div className="py-4"></div>
            
            <Button
              variant="outline"
              className="w-full h-12 font-medium text-sm bg-transparent border border-zinc-700/50 text-zinc-300
                     hover:bg-zinc-800/50 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isGoogleSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Sign in with Google
            </Button>
          </CardContent>
        </form>
        
        <CardFooter className="flex flex-col space-y-4 px-8 pb-8 relative z-20">
          <div className="text-center text-sm text-zinc-500">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-zinc-400 hover:text-zinc-300 transition-colors animated-underline"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 




