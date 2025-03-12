"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
        <SheetContent side="left" className="w-[240px] sm:max-w-none">
          <nav className="grid gap-2 text-lg font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => onOpenChange && onOpenChange(false)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent",
                  pathname === route.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <route.icon className="h-5 w-5" />
                {route.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside 
        className={cn(
          "fixed top-16 z-30 hidden h-[calc(100vh-4rem)] shrink-0 md:sticky md:block transition-all duration-300 ease-in-out border-r bg-background",
          collapsed ? "w-[60px]" : "w-[240px]",
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && <h2 className="font-semibold">Ingestio.io</h2>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={collapsed ? "mx-auto" : "ml-auto"}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {routes.map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    pathname === route.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {!collapsed && <span>{route.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
} 