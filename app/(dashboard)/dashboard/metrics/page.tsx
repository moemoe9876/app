"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Clock, DollarSign, FileText, Languages } from "lucide-react";

export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Performance Metrics</h1>
        <p className="text-muted-foreground">
          Your workflow performance at a glance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Documents Overview
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Total Documents</div>
                <div className="font-medium">1</div>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Processed Documents</div>
                <div className="font-medium">1</div>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Pending Documents</div>
                <div className="font-medium">0</div>
              </div>
              <Progress value={0} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Extractions Breakdown
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Content</div>
                <div className="font-medium">1 (100%)</div>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Others</div>
                <div className="font-medium">0 (0%)</div>
              </div>
              <Progress value={0} className="h-1" />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Total</div>
              <div className="font-medium">1 (100%)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Efficiency & Savings
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">3 minutes</div>
              <p className="text-xs text-muted-foreground">
                Estimated time saved
              </p>
            </div>
            <Separator />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div className="text-xl font-bold">$1</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated cost savings
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Language Preferences
            </CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">English</div>
                <div className="font-medium">1 (100%)</div>
              </div>
              <Progress value={100} className="h-1" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">Other Languages</div>
                <div className="font-medium">0 (0%)</div>
              </div>
              <Progress value={0} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 