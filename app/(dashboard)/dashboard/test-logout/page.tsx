"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { ArrowUp } from "lucide-react"
import { UserNav } from "@/components/dashboard/user-nav"

export default function TestLogoutPage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>User Authentication Status</CardTitle>
          <CardDescription>
            This page displays your current authentication status. To log out, use the avatar dropdown in the header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-md bg-muted">
            <h3 className="font-medium mb-2">Current User:</h3>
            <p>Email: {user?.email}</p>
            <p>Display Name: {user?.displayName || "Not set"}</p>
            <p>User ID: {user?.uid}</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 p-4 border rounded-md bg-muted/50">
            <p className="text-center font-medium">Logout Available in Avatar Menu</p>
            <div className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 animate-bounce text-primary" />
              <span className="text-sm">Click your avatar in the header</span>
            </div>
            <div className="mt-4 flex justify-center">
              <UserNav />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              The avatar menu contains profile options and logout functionality
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 