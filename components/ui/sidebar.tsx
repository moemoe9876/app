"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

const sidebarVariants = cva(
  "fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] bg-sidebar-background transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "",
        inset: "",
      },
      collapsible: {
        default: "data-[state=closed]:w-[var(--sidebar-width-collapsed)]",
        offcanvas: "sm:translate-x-0 data-[state=closed]:translate-x-[-100%]",
        icon: "data-[state=closed]:w-[var(--sidebar-width-collapsed)]",
      },
    },
    defaultVariants: {
      variant: "default",
      collapsible: "default",
    },
  }
)

type SidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
  toggle: () => {},
  isMobile: false,
})

interface SidebarProviderProps {
  defaultOpen?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  style,
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Check on mount and window resize
    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)

    // Save state to localStorage
    localStorage.setItem("sidebar_state", String(open))
    
    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [open])

  const toggle = React.useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle, isMobile }}>
      <div className="relative flex w-full min-w-0 justify-start" style={style}>
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: "default" | "offcanvas" | "icon"
  variant?: "default" | "inset"
}

export function Sidebar({
  className,
  collapsible = "default",
  variant = "default",
  ...props
}: SidebarProps) {
  const { open } = useSidebar()

  return (
    <div
      id="sidebar"
      role="navigation"
      aria-label="Main navigation"
      data-state={open ? "open" : "closed"}
      data-collapsible={collapsible}
      className={cn(sidebarVariants({ variant, collapsible }), className)}
      {...props}
    />
  )
}

interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarInset({
  className,
  ...props
}: SidebarInsetProps) {
  const { open, isMobile } = useSidebar();
  
  // Add useEffect for debugging padding
  React.useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Log SidebarInset dimensions and styles
      const insetElement = document.querySelector('[data-state][data-sidebar-inset="true"]');
      if (insetElement) {
        const rect = insetElement.getBoundingClientRect();
        const style = window.getComputedStyle(insetElement);
        
        console.log('SidebarInset dimensions:', {
          width: rect.width,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          open,
          isMobile,
        });
      }
    }
  }, [open, isMobile]);
  
  return (
    <div
      className={cn(
        "flex flex-1 flex-col transition-all duration-300 ease-in-out",
        // Base padding for mobile
        isMobile ? "px-4" : "",
        // Specific padding for desktop based on sidebar state
        !isMobile && (open 
          ? "sm:pl-[var(--sidebar-width)] sm:pr-4 md:pr-8 lg:pr-12" 
          : "sm:pl-[var(--sidebar-width-collapsed)] sm:pr-4 md:pr-8 lg:pr-12"),
        className
      )}
      data-state={open ? "open" : "closed"}
      data-sidebar-inset="true"
      {...props}
    />
  );
}

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarHeader({
  className,
  ...props
}: SidebarHeaderProps) {
  return (
    <div
      className={cn("flex h-[var(--header-height)] shrink-0 items-center px-4", className)}
      {...props}
    />
  )
}

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarContent({
  className,
  ...props
}: SidebarContentProps) {
  return (
    <div
      className={cn("flex flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarFooter({
  className,
  ...props
}: SidebarFooterProps) {
  return (
    <div
      className={cn("shrink-0 px-4 py-4", className)}
      {...props}
    />
  )
}

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroup({
  className,
  ...props
}: SidebarGroupProps) {
  return (
    <div
      className={cn("py-2", className)}
      {...props}
    />
  )
}

interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroupLabel({
  className,
  ...props
}: SidebarGroupLabelProps) {
  return (
    <div
      className={cn("px-3 py-1 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

interface SidebarGroupContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarGroupContent({
  className,
  ...props
}: SidebarGroupContentProps) {
  return (
    <div
      className={cn("", className)}
      {...props}
    />
  )
}

interface SidebarMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenu({
  className,
  ...props
}: SidebarMenuProps) {
  return (
    <div
      data-slot="sidebar-menu"
      className={cn("space-y-1 px-1", className)}
      {...props}
    />
  )
}

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenuItem({
  className,
  ...props
}: SidebarMenuItemProps) {
  return (
    <div
      data-slot="sidebar-menu-item"
      className={cn("relative flex items-center w-full", className)}
      {...props}
    />
  )
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  tooltip?: string
  size?: "default" | "lg"
}

const sidebarMenuButtonVariants = cva(
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent",
  {
    variants: {
      size: {
        default: "py-2",
        lg: "py-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export function SidebarMenuButton({
  className,
  asChild = false,
  tooltip,
  size = "default",
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : "button"
  
  return (
    <Comp
      data-slot="sidebar-menu-button"
      className={cn(
        sidebarMenuButtonVariants({ size }),
        "hover:bg-sidebar-accent/50",
        className
      )}
      title={tooltip}
      {...props}
    />
  )
}

interface SidebarMenuActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showOnHover?: boolean
}

export function SidebarMenuAction({
  className,
  showOnHover,
  ...props
}: SidebarMenuActionProps) {
  return (
    <button
      className={cn(
        "size-6 rounded-sm p-0 text-muted-foreground hover:text-foreground",
        showOnHover && "opacity-0 group-hover/item:opacity-100",
        className
      )}
      {...props}
    />
  )
}

interface SidebarMenuSubProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenuSub({
  className,
  ...props
}: SidebarMenuSubProps) {
  return (
    <div
      className={cn("ml-6 space-y-1 pt-1", className)}
      {...props}
    />
  )
}

interface SidebarMenuSubItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarMenuSubItem({
  className,
  ...props
}: SidebarMenuSubItemProps) {
  return (
    <div
      className={cn("relative flex items-center", className)}
      {...props}
    />
  )
}

interface SidebarMenuSubButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function SidebarMenuSubButton({
  className,
  asChild = false,
  ...props
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot : "button"
  
  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SidebarTrigger({
  className,
  ...props
}: SidebarTriggerProps) {
  const { toggle, open } = useSidebar()
  
  return (
    <button
      type="button"
      className={cn("size-6 rounded-md hover:bg-accent hover:text-accent-foreground", className)}
      onClick={toggle}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={open}
      aria-controls="sidebar"
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <path d="M9 3v18" />
      </svg>
      <span className="sr-only">{open ? "Collapse sidebar" : "Expand sidebar"}</span>
    </button>
  )
} 