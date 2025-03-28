// components/dashboard/app-sidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileUp,
  History,
  Home,
  Settings,
  User,
  FileText,
  PlusCircle,
  Moon,
  Sun,
  LogOut,
} from "lucide-react"

// --- Use the NEW sidebar components ---
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
// --- End Use the NEW sidebar components ---

import { Switch } from "@/components/ui/switch" // Use project's ui switch
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Use project's ui avatar
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { UserNav } from "./user-nav";

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Upload Document",
    url: "/dashboard/upload",
    icon: FileUp,
  },
  {
    title: "History",
    url: "/dashboard/history",
    icon: History,
  },
  {
    title: "Performance Metrics",
    url: "/dashboard/metrics",
    icon: BarChart3,
  },
];

const navSecondary = [
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <Sidebar
      // --- ADDED/MODIFIED PROPS ---
      variant="inset"
      collapsible="offcanvas"
      // --- END ADDED/MODIFIED PROPS ---
      className="bg-sidebar dark:bg-sidebar border-none" // Use sidebar specific colors
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border p-2"> {/* Add padding & border */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg" // Match example header item size
              className="data-[slot=sidebar-menu-button]:!p-2" // Adjust padding
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                   <FileText className="h-4 w-4" />
                </div>
                {/* Hide text when collapsed */}
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                  <span className="truncate font-medium">Ingestio.io</span>
                  <span className="truncate text-xs text-sidebar-muted-foreground">
                    {user?.email ? 'Active' : 'Loading...'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="p-2"> {/* Add padding */}
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Quick Upload Button */}
              <SidebarMenuItem>
                 <SidebarMenuButton
                    tooltip="Quick Upload"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear w-full justify-center group-data-[state=expanded]:justify-start" // Center icon when collapsed
                    asChild
                  >
                    <Link href="/dashboard/upload">
                      <PlusCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="group-data-[state=collapsed]:hidden">Quick Upload</span>
                    </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Main Nav Items */}
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                    className="w-full justify-center group-data-[state=expanded]:justify-start" // Center icon when collapsed
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation (at the bottom) */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="group-data-[state=collapsed]:hidden">Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                    className="w-full justify-center group-data-[state=expanded]:justify-start" // Center icon when collapsed
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Theme Toggle */}
              <SidebarMenuItem className="group-data-[state=collapsed]:hidden">
                <SidebarMenuButton asChild className="w-full justify-start">
                  <label className="flex w-full cursor-pointer items-center justify-between">
                    <div className="flex items-center gap-2">
                      {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <span>Dark Mode</span>
                    </div>
                    {mounted ? (
                      <Switch
                        className="ml-auto"
                        checked={resolvedTheme === "dark"}
                        onCheckedChange={() =>
                          setTheme(resolvedTheme === "dark" ? "light" : "dark")
                        }
                        aria-label="Toggle dark mode"
                      />
                    ) : (
                       <div className="ml-auto h-5 w-9 rounded-full bg-muted animate-pulse" /> // Skeleton loader
                    )}
                  </label>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2"> {/* Add border */}
         {/* Use UserNav component here */}
         <UserNav />
      </SidebarFooter>
    </Sidebar>
  )
}