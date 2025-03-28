// components/dashboard/site-header.tsx
"use client"

import { Separator } from "@/components/ui/separator" // Use project's ui separator
import { SidebarTrigger } from "@/components/ui/sidebar" // Use the NEW sidebar trigger
import { ModeToggle } from "@/components/dashboard/mode-toggle"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserNav } from "./user-nav"

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {}

export function SiteHeader({ className, ...props }: SiteHeaderProps) {
  const pathname = usePathname()

  const getTitle = () => {
    const path = pathname.split("/").filter(Boolean)
    if (path.length === 1 && path[0] === "dashboard") {
      return "Dashboard"
    }
    if (path.length > 1) {
      if (path[1] === 'review' && path.length > 2) {
        return "Review Document";
      }
      return path[1].charAt(0).toUpperCase() + path[1].slice(1).replace(/-/g, " ")
    }
    return "Ingestio.io"
  }

  return (
    // Use --header-height variable and match Shadcn example styling
    <header className={cn(
        "flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear", // Use standard border color
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="-ml-1 text-foreground hover:bg-accent" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* Page Title */}
        <h1 className="text-base font-medium text-foreground">{getTitle()}</h1>

        {/* Right Aligned Items */}
        <div className="ml-auto flex items-center gap-2 md:gap-4"> {/* Adjusted gap */}
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}