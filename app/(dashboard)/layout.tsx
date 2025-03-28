// app/(dashboard)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// --- Use the NEW sidebar components ---
import { SidebarProvider } from "@/components/ui/sidebar"; // Only Provider needed here
// --- End Use the NEW sidebar components ---
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper hook to read cookies on the client-side
function useCookie(name: string, defaultValue: string): string {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')[1];
      setValue(cookieValue || defaultValue);
    }
  }, [name, defaultValue]);

  return value;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarStateCookie = useCookie("sidebar_state", "true");
  // Default to closed for offcanvas unless cookie says otherwise
  const defaultOpen = sidebarStateCookie === "true";

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      console.log("Redirecting to login from dashboard layout");
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "20rem", // Your desired expanded width
          "--header-height": "60px", // Your header height
          "--spacing": "0.25rem",
        } as React.CSSProperties
      }
      // The wrapper needs to allow the fixed sidebar and the main content flow
      className="min-h-screen" // Removed flex here
    >
      {/* Sidebar will be positioned fixed/absolute via its own component logic */}
      <AppSidebar collapsible="offcanvas" />

      {/* Main content area - occupies space normally */}
      {/* Add padding-top to account for the fixed header */}
      <div className="flex flex-col md:pl-[var(--sidebar-width)] transition-[padding] duration-200 ease-linear group-data-[state=collapsed]/sidebar-wrapper:md:pl-0">
        {/* SiteHeader is likely fixed or sticky itself */}
        <SiteHeader />
        {/* Content area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
           {children}
        </main>
      </div>
    </SidebarProvider>
  );
}