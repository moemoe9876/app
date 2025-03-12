# Collapsible Sidebar and Panel Resizing Implementation Plan

## Overview

This document outlines the detailed implementation plan for enhancing the UI layout in Ingestio.io by adding a collapsible sidebar and improving the two-panel view for document review. These changes will provide users with more screen real estate for document review and a more flexible interface.

## Current Issues

1. The sidebar takes up valuable screen space and cannot be collapsed
2. The two-panel view (PDF viewer and extracted data) is too small
3. The UI doesn't adapt dynamically when screen space changes
4. The layout isn't optimized for document review workflows

## Implementation Steps

### 1. Create Collapsible Sidebar Component [x]

**File:** `/components/dashboard/Sidebar.tsx` (new or modified)

- [x] Implement a collapsible sidebar with toggle functionality
- [x] Add animation for smooth transitions
- [x] Create compact view for collapsed state (icons only)
- [x] Store sidebar state in localStorage for persistence
- [x] Ensure accessibility with keyboard navigation

**Code Structure:**
```typescript
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  History,
  Settings,
  BarChart3,
  User
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
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
  
  return (
    <div
      className={cn(
        "flex flex-col h-full border-r transition-all duration-300 ease-in-out bg-background",
        collapsed ? "w-[60px]" : "w-[240px]",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="font-semibold">Ingestio.io</h2>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {/* Navigation items with conditional rendering based on collapsed state */}
          {[
            { href: "/dashboard", icon: <FileText size={18} />, label: "Dashboard" },
            { href: "/dashboard/upload", icon: <Upload size={18} />, label: "Upload" },
            { href: "/dashboard/history", icon: <History size={18} />, label: "History" },
            { href: "/dashboard/metrics", icon: <BarChart3 size={18} />, label: "Metrics" },
            { href: "/dashboard/profile", icon: <User size={18} />, label: "Profile" },
            { href: "/dashboard/settings", icon: <Settings size={18} />, label: "Settings" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href && "bg-accent text-accent-foreground",
                  collapsed && "justify-center"
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
```

### 2. Update Layout Component [x]

**File:** `/app/(dashboard)/layout.tsx`

- [ ] Integrate the collapsible sidebar
- [ ] Add event listeners for sidebar state changes
- [ ] Adjust main content area based on sidebar state
- [ ] Ensure smooth transitions with CSS

**Code Changes:**
```typescript
"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Listen for sidebar toggle events
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main 
        className="flex-1 overflow-auto transition-all duration-300 ease-in-out"
        style={{ 
          marginLeft: sidebarCollapsed ? "60px" : "240px",
          width: `calc(100% - ${sidebarCollapsed ? "60px" : "240px"})` 
        }}
      >
        <div className="container mx-auto py-6 px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
```

### 3. Enhance Two-Panel View Size [x]

**File:** `/app/(dashboard)/dashboard/review/[id]/page.tsx`

- [ ] Increase the height of the document review panels
- [ ] Adjust the grid layout to maximize available space
- [ ] Implement responsive sizing based on viewport dimensions
- [ ] Add resize handles for user-adjustable panels

**Code Changes:**
```typescript
// Update the grid container to be taller and more responsive
<div className="grid gap-6 md:grid-cols-2 h-[calc(100vh-180px)]">
  {/* Left Panel - Extracted Data */}
  <Card className="flex flex-col overflow-hidden">
    {/* Card content */}
  </Card>

  {/* Right Panel - Document Preview */}
  <Card className="flex flex-col overflow-hidden">
    {/* Card content */}
  </Card>
</div>
```

### 4. Implement Resizable Panels [ ]

**File:** `/components/ResizablePanels.tsx` (new file)

- [ ] Create a component for resizable panels
- [ ] Add drag handles for adjusting panel sizes
- [ ] Implement min/max constraints for panel dimensions
- [ ] Save panel size preferences in localStorage

**Code Structure:**
```typescript
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // percentage
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  storageKey?: string;
  className?: string;
}

export function ResizablePanels({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 70,
  storageKey = "panelSizes",
  className,
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  
  // Load saved panel sizes on mount
  useEffect(() => {
    if (storageKey) {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth !== null) {
        setLeftWidth(Number(savedWidth));
      }
    }
  }, [storageKey]);
  
  // Save panel sizes when they change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(leftWidth));
    }
  }, [leftWidth, storageKey]);
  
  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate new width as percentage
      let newLeftWidth = (mouseX / containerWidth) * 100;
      
      // Apply constraints
      newLeftWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
      
      setLeftWidth(newLeftWidth);
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minLeftWidth, maxLeftWidth]);
  
  return (
    <div 
      ref={containerRef}
      className={cn("flex h-full", className)}
    >
      <div 
        className="overflow-auto"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>
      
      <div 
        className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex-shrink-0"
        onMouseDown={handleMouseDown}
      />
      
      <div 
        className="overflow-auto"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
```

### 5. Integrate Resizable Panels in Review Page [ ]

**File:** `/app/(dashboard)/dashboard/review/[id]/page.tsx`

- [ ] Replace the grid layout with resizable panels
- [ ] Ensure panels resize properly when sidebar is toggled
- [ ] Optimize for different screen sizes
- [ ] Add keyboard shortcuts for panel manipulation

**Code Changes:**
```typescript
import { ResizablePanels } from "@/components/ResizablePanels";

// Replace the grid layout with resizable panels
<div className="h-[calc(100vh-180px)]">
  <ResizablePanels
    leftPanel={
      <Card className="h-full flex flex-col overflow-hidden border-0">
        {/* Extracted data content */}
      </Card>
    }
    rightPanel={
      <Card className="h-full flex flex-col overflow-hidden border-0">
        {/* PDF viewer content */}
      </Card>
    }
    defaultLeftWidth={45}
    minLeftWidth={30}
    maxLeftWidth={70}
    storageKey="documentReviewPanels"
  />
</div>
```

### 6. Add Event Listeners for Sidebar Toggle [ ]

**File:** `/app/(dashboard)/dashboard/review/[id]/page.tsx`

- [ ] Listen for sidebar toggle events
- [ ] Adjust panel sizes when sidebar state changes
- [ ] Ensure smooth transitions during sidebar toggle
- [ ] Optimize PDF viewer rendering during resize

**Code Changes:**
```typescript
// Add state and event listener for sidebar toggle
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

useEffect(() => {
  const handleSidebarToggle = (e: CustomEvent) => {
    setSidebarCollapsed(e.detail.collapsed);
    
    // Trigger a resize event to ensure PDF viewer adjusts
    window.dispatchEvent(new Event('resize'));
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
```

### 7. Optimize PDF Viewer for Resizing [ ]

**File:** `/components/PdfViewerUrl.tsx`

- [ ] Enhance the PDF viewer to handle container resizing
- [ ] Add debounced resize handler to prevent performance issues
- [ ] Ensure PDF maintains proper scale during resize
- [ ] Optimize rendering for smooth transitions

**Code Changes:**
```typescript
import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";

// Add debounced resize handler
const debouncedResize = useCallback(
  debounce((entries) => {
    const [entry] = entries;
    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, 100),
  []
);

useResizeObserver(containerRef, {}, debouncedResize);

// Add effect to handle manual resize events
useEffect(() => {
  const handleResize = () => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

## Testing Strategy [ ]

- [ ] Test sidebar collapse/expand on different screen sizes
- [ ] Verify panel resizing works smoothly
- [ ] Test keyboard navigation for accessibility
- [ ] Ensure PDF viewer renders correctly during resize
- [ ] Verify state persistence across page refreshes

## Success Criteria

1. The sidebar can be collapsed and expanded smoothly
2. The two-panel view is significantly larger (at least 100% increase)
3. Panels can be resized by users according to their preferences
4. The UI adapts dynamically when the sidebar is toggled
5. All state preferences persist across sessions

