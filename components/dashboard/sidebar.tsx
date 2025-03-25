"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileUp,
  History,
  Home,
  Settings,
  User,
  FileText,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Sidebar({ open, onOpenChange, className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setCollapsed(savedState === "true");
    }
  }, []);
  
  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);
  
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    // Dispatch a custom event that layout components can listen for
    window.dispatchEvent(new CustomEvent("sidebarToggle", { 
      detail: { collapsed: !collapsed } 
    }));
  };

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/dashboard/upload",
      label: "Upload Document",
      icon: FileUp,
    },
    {
      href: "/dashboard/history",
      label: "History",
      icon: History,
    },
    {
      href: "/dashboard/metrics",
      label: "Performance Metrics",
      icon: BarChart3,
    },
    {
      href: "/dashboard/profile",
      label: "Profile",
      icon: User,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    },
  ];
  
  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[240px] sm:max-w-none p-0">
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-bold">Ingestio.io</span>
            </Link>
          </div>
          <div className="py-4">
            <nav className="grid gap-1 px-2">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => onOpenChange && onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                    pathname === route.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside 
        className={cn(
          "fixed top-16 z-30 hidden h-[calc(100vh-4rem)] shrink-0 md:sticky md:block transition-all duration-300 ease-in-out border-r bg-background",
          collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
          className
        )}
      >
        <div className="flex h-14 items-center justify-between p-4 border-b">
          {!collapsed && 
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              <span>Ingestio.io</span>
            </Link>
          }
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className={collapsed ? "mx-auto" : "ml-auto"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        
        <nav className="flex-1 py-4">
          <div className="px-3">
            <div className="space-y-1">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    pathname === route.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? route.label : undefined}
                >
                  <route.icon className="size-4" />
                  {!collapsed && <span>{route.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
} 