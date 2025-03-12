"use client";

import { useState, useEffect } from "react";
import { MainNav } from "@/components/dashboard/main-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { UserNav } from "@/components/dashboard/user-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Listen for sidebar toggle events and check localStorage on mount
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    
    window.addEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    
    // Check localStorage on mount
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true");
    }
    
    return () => {
      window.removeEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav />
          <div className="flex items-center gap-4">
            <UserNav />
            <MobileNav onOpenChange={setSidebarOpen} />
          </div>
        </div>
      </header>
      <div className="flex-1 flex">
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <main 
          className="flex-1 overflow-auto transition-all duration-300 ease-in-out px-4 md:px-6 lg:px-8 py-6"
          style={{ 
            marginLeft: sidebarCollapsed ? "60px" : "240px",
            width: `calc(100% - ${sidebarCollapsed ? "60px" : "240px"})` 
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
} 