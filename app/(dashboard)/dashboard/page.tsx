"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, FileUp, History } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Ingestio.io! Streamline your workflow with automated data extraction.
        </p>
      </div>
      
      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">1</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Documents</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">1</div>
            <p className="text-xs text-muted-foreground">
              100% completion rate
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">3 min</div>
            <p className="text-xs text-muted-foreground">
              Estimated time savings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full p-2 bg-primary/10">
                <FileUp className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium leading-none text-card-foreground">
                  Upload a new document
                </p>
                <p className="text-sm text-muted-foreground">
                  Extract data from PDFs, invoices, and more
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/upload">Upload</Link>
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full p-2 bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium leading-none text-card-foreground">
                  View document history
                </p>
                <p className="text-sm text-muted-foreground">
                  Access your previously processed documents
                </p>
              </div>
              <Button variant="outline" asChild className="border-border">
                <Link href="/dashboard/history">View</Link>
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full p-2 bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium leading-none text-card-foreground">
                  Performance metrics
                </p>
                <p className="text-sm text-muted-foreground">
                  See detailed analytics about your usage
                </p>
              </div>
              <Button variant="outline" asChild className="border-border">
                <Link href="/dashboard/metrics">View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest document processing activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none text-card-foreground">
                    Invoice-2023.pdf
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Processed 2 hours ago
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
              <div className="flex items-center">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none text-card-foreground">
                    No other recent activity
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload a document to get started
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 