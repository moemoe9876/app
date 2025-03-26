// components/dashboard/user-nav.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { cn } from "@/lib/utils"; // Import cn

export function UserNav() {
  const { user, loading, signOutUser } = useAuth();

  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />; // Use muted color for loader
  }

  if (!user) {
    // Optional: Render login button if needed, or null if header handles it
    return (
       <Button variant="outline" size="sm" asChild>
         <Link href="/login">Log In</Link>
       </Button>
    );
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background">
          <Avatar className="h-8 w-8"> {/* Slightly smaller avatar */}
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
            <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(user.displayName)}</AvatarFallback> {/* Use muted colors */}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
            "w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-lg", // Use theme variables
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2" // Standard ShadCN animations
        )}
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal px-2 py-1.5">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">{user.displayName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || "No email"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border -mx-1 my-1" /> {/* Use theme border */}
        <DropdownMenuGroup>
           {/* Use cn for consistent styling and apply focus/hover states */}
          <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
            <Link href="/dashboard/profile" className="flex items-center cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
            <Link href="/dashboard/settings" className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-border -mx-1 my-1" />
        <DropdownMenuItem onClick={signOutUser} className="cursor-pointer focus:bg-destructive/10 focus:text-destructive text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}