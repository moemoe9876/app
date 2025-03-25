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
} from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

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

const user = {
  name: "User",
  email: "user@example.com",
  avatar: "/avatars/user.png",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { isMobile } = useSidebar();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar
      collapsible="offcanvas"
      className="bg-sidebar-background dark:bg-sidebar-background border-none"
      {...props}
    >
      <SidebarHeader className="border-none">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <FileText className="text-primary h-5 w-5" />
                <span className="text-base font-semibold">Ingestio.io</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2 px-1">
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton
                  tooltip="Quick Upload"
                  className="bg-primary text-white hover:bg-primary/90 hover:text-white font-semibold active:bg-primary/90 active:text-white min-w-8 duration-200 ease-linear w-full"
                  asChild
                >
                  <Link href="/dashboard/upload">
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Quick Upload</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className={cn(
                    "w-full px-2",
                    pathname === item.url && "hover:bg-sidebar-accent"
                  )}>
                    <Link 
                      href={item.url}
                      className={cn(
                        "w-full rounded-md px-2",
                        pathname === item.url 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4",
                        pathname === item.url 
                          ? "text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground/80"
                      )} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-sidebar-foreground/70 px-3">Settings</SidebarGroupLabel>
          <SidebarGroupContent className="px-1">
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className={cn(
                    "w-full px-2",
                    pathname === item.url && "hover:bg-sidebar-accent"
                  )}>
                    <Link 
                      href={item.url}
                      className={cn(
                        "w-full rounded-md px-2",
                        pathname === item.url 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4",
                        pathname === item.url 
                          ? "text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground/80"
                      )} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenu className="group-data-[collapsible=icon]:hidden">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="w-full px-2">
                    <label className="flex w-full cursor-pointer items-center justify-between text-sidebar-foreground/80 hover:text-sidebar-foreground rounded-md px-2">
                      <span>Dark Mode</span>
                      {mounted ? (
                        <Switch
                          className="ml-auto"
                          checked={resolvedTheme === "dark"}
                          onCheckedChange={() =>
                            setTheme(resolvedTheme === "dark" ? "light" : "dark")
                          }
                        />
                      ) : null}
                    </label>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-none">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="w-full rounded-md mx-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">U</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
} 