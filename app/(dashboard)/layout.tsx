"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { useSidebar } from "@/components/ui/sidebar";

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
    <SidebarInset>
      <div className="dashboard-container flex-1 min-w-0 min-h-[calc(100vh-10px)]">
        <SiteHeader className="px-4 sm:px-6 md:px-8 border-b border-border/50" />
        <div 
          className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8"
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

  useEffect(() => {
    // Check localStorage for sidebar state
    const savedState = localStorage.getItem("sidebar_state");
    if (savedState !== null) {
      setDefaultOpen(savedState === "true");
    }
  }, []);

  return (
    <div className="theme-default theme-scaled dashboard-background min-h-screen w-full flex">
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--sidebar-width-collapsed": "calc(var(--spacing) * 16)",
          "--header-height": "60px",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </div>
  );
} 