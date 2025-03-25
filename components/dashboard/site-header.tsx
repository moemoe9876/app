"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/dashboard/mode-toggle"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {}

export function SiteHeader({ className, ...props }: SiteHeaderProps) {
  const pathname = usePathname()
  
  // Get the current page title from the pathname
  const getTitle = () => {
    const path = pathname.split("/").filter(Boolean)
    if (path.length === 1 && path[0] === "dashboard") {
      return "Dashboard"
    }
    if (path.length > 1) {
      return path[1].charAt(0).toUpperCase() + path[1].slice(1).replace(/-/g, " ")
    }
    return "Ingestio.io"
  }

  return (
    <header className={cn("flex h-[40px] shrink-0 items-center gap-2 border-b border-border bg-background dark:bg-background transition-[width,height] ease-linear", className)} {...props}>
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-primary hover:bg-primary/10" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium text-foreground dark:text-foreground">{getTitle()}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
} 