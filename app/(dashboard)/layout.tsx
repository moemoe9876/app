"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// This component adds equal spacing based on sidebar state
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  
  // Add useEffect to log padding and spacing information
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Log sidebar state
      console.log('Sidebar open state:', open);
      
      // Log container dimensions on initial render and sidebar state change
      const container = document.querySelector('.dashboard-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(container);
        
        console.log('Dashboard container dimensions:', {
          width: containerRect.width,
          paddingLeft: computedStyle.paddingLeft,
          paddingRight: computedStyle.paddingRight,
          marginLeft: computedStyle.marginLeft,
          marginRight: computedStyle.marginRight,
        });
      }
      
      // Log content padding
      const contentDiv = document.querySelector('.dashboard-container > div:nth-child(2)');
      if (contentDiv) {
        const computedStyle = window.getComputedStyle(contentDiv);
        console.log('Content padding:', {
          paddingLeft: computedStyle.paddingLeft,
          paddingRight: computedStyle.paddingRight,
        });
      }
    }
  }, [open]);
  
  return (
    <SidebarInset className="w-full max-w-full box-border">
      <div className="dashboard-container flex-1 min-w-0 w-full h-[calc(100vh-2rem)] overflow-hidden p-4 md:p-6 lg:p-8 box-border rounded-lg mx-auto my-0">
        <SiteHeader className="border-b border-border/50 mb-4" />
        <div 
          className="flex flex-1 flex-col h-[calc(100vh-140px)] overflow-y-auto overflow-x-hidden w-full"
          data-content-container="true"
        >
          {children}
        </div>
      </div>
    </SidebarInset>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [defaultOpen, setDefaultOpen] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for sidebar state
    const savedState = localStorage.getItem("sidebar_state");
    if (savedState !== null) {
      setDefaultOpen(savedState === "true");
    }
  }, []);

  useEffect(() => {
    // Redirect if not loading and no user
    if (!loading && !user) {
      console.log("Redirecting to login from dashboard layout");
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only render the dashboard layout if the user is authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="theme-default theme-scaled dashboard-background min-h-screen w-full flex overflow-hidden box-border p-4">
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--sidebar-width-collapsed": "calc(var(--spacing) * 14)",
          "--header-height": "60px",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </div>
  );
} 