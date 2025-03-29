// app/(dashboard)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
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
      className="min-h-screen"
    >
      {/* Use AppSidebar with variant="inset" to match shadcn dashboard-01 */}
      <AppSidebar variant="inset" collapsible="offcanvas" />
      
      {/* Use SidebarInset for the main content area */}
      <SidebarInset className="rounded-lg overflow-hidden border border-border">
        {/* SiteHeader */}
        <SiteHeader />
        
        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}