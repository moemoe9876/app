"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, X, Filter, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types
interface FieldData {
  value: string | number;
  confidence: number;
  location?: {
    page: number;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

type ExtractedData = {
  [key: string]: FieldData | FieldData[] | { [key: string]: any };
};

interface DataVisualizerProps {
  data: ExtractedData;
  onHover?: (path: string, value: any) => void;
  onSelect?: (path: string, value: any) => void;
  confidenceThreshold?: number;
}

// Helper functions
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return "bg-green-100 text-green-800 hover:bg-green-200";
  if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
  return "bg-red-100 text-red-800 hover:bg-red-200";
};

const formatFieldName = (name: string) => {
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Flatten nested data for table view
const flattenData = (data: any, prefix = ""): Record<string, any>[] => {
  if (!data || typeof data !== "object") return [];

  const result: Record<string, any>[] = [];

  Object.entries(data).forEach(([key, value]) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object") {
      if ("value" in value && "confidence" in value) {
        // This is a field data object
        result.push({
          field: formatFieldName(key),
          value: value.value,
          confidence: value.confidence,
          path: currentKey,
          location: value.location,
        });
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          const arrayResults = flattenData(item, `${currentKey}[${index}]`);
          arrayResults.forEach(item => {
            item.field = `${formatFieldName(key)} [${index + 1}] ${item.field}`;
            result.push(item);
          });
        });
      } else {
        // Handle nested objects
        const nestedResults = flattenData(value, currentKey);
        result.push(...nestedResults);
      }
    } else {
      // Handle primitive values
      result.push({
        field: formatFieldName(key),
        value: value,
        confidence: 1,
        path: currentKey,
      });
    }
  });

  return result;
};

export function DataVisualizer({ 
  data, 
  onHover, 
  onSelect,
  confidenceThreshold = 0 
}: DataVisualizerProps) {
  const [viewMode, setViewMode] = useState<"tree" | "table" | "json">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [minConfidence, setMinConfidence] = useState(confidenceThreshold);
  const [showConfidenceFilter, setShowConfidenceFilter] = useState(false);

  // Filter data based on search query and confidence threshold
  const filteredData = useMemo(() => {
    if (!data) return {};
    
    const searchLower = searchQuery.toLowerCase();
    
    const filterObject = (obj: any): any => {
      if (!obj || typeof obj !== "object") return null;
      
      // For arrays
      if (Array.isArray(obj)) {
        const filteredArray = obj
          .map(item => filterObject(item))
          .filter(item => item !== null);
        return filteredArray.length > 0 ? filteredArray : null;
      }
      
      // For objects
      const filteredObj: any = {};
      let hasMatch = false;
      
      Object.entries(obj).forEach(([key, value]) => {
        const keyMatches = key.toLowerCase().includes(searchLower);
        
        // Check if value is a FieldData object with a matching value and sufficient confidence
        const isFieldData = 
          value && 
          typeof value === "object" && 
          "value" in value && 
          "confidence" in value;
          
        const valueMatches = 
          isFieldData &&
          String(value.value).toLowerCase().includes(searchLower);
          
        const hasEnoughConfidence = 
          !isFieldData || 
          (value as FieldData).confidence >= minConfidence;
        
        if ((keyMatches || valueMatches) && hasEnoughConfidence) {
          filteredObj[key] = value;
          hasMatch = true;
        } else if (typeof value === "object" && hasEnoughConfidence) {
          const filteredValue = filterObject(value);
          if (filteredValue !== null) {
            filteredObj[key] = filteredValue;
            hasMatch = true;
          }
        }
      });
      
      return hasMatch ? filteredObj : null;
    };
    
    return filterObject(data) || {};
  }, [data, searchQuery, minConfidence]);

  // Get all possible paths in the data for expand/collapse all functionality
  const getAllPaths = (data: any, basePath = ""): string[] => {
    if (!data || typeof data !== "object") return [];
    
    let paths: string[] = [];
    
    Object.keys(data).forEach(key => {
      const currentPath = basePath ? `${basePath}.${key}` : key;
      paths.push(currentPath);
      
      if (data[key] && typeof data[key] === "object") {
        paths = [...paths, ...getAllPaths(data[key], currentPath)];
      }
    });
    
    return paths;
  };

  const toggleSection = (path: string) => {
    const newExpandedSections = new Set(expandedSections);
    if (newExpandedSections.has(path)) {
      newExpandedSections.delete(path);
    } else {
      newExpandedSections.add(path);
    }
    setExpandedSections(newExpandedSections);
  };

  const expandAll = () => {
    const allPaths = getAllPaths(filteredData);
    setExpandedSections(new Set(allPaths));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Export data as CSV
  const exportAsCSV = () => {
    const flatData = flattenData(data);
    
    // Create CSV header
    const headers = ["Field", "Value", "Confidence"];
    let csv = headers.join(",") + "\n";
    
    // Add data rows
    flatData.forEach(item => {
      const row = [
        `"${item.field}"`,
        `"${item.value}"`,
        item.confidence
      ];
      csv += row.join(",") + "\n";
    });
    
    // Create and download the file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "extracted_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export data as JSON
  const exportAsJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "extracted_data.json");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tree View Renderer
  const TreeView = () => {
    const renderTreeNode = (data: any, path = "") => {
      if (!data) return null;
      
      // Handle arrays
      if (Array.isArray(data)) {
        return (
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="pl-4 border-l-2 border-muted">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Item {index + 1}
                </div>
                {renderTreeNode(item, `${path}[${index}]`)}
              </div>
            ))}
          </div>
        );
      }
      
      // Handle objects
      if (typeof data === "object") {
        // Check if this is a field data object (with value and confidence)
        if ("value" in data && "confidence" in data) {
          const fieldData = data as FieldData;
          return (
            <div 
              className="flex items-center gap-2"
              onMouseEnter={() => onHover && path && onHover(path, fieldData)}
              onClick={() => onSelect && path && onSelect(path, fieldData)}
            >
              <span className="font-medium">{String(fieldData.value)}</span>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getConfidenceColor(fieldData.confidence))}
              >
                {Math.round(fieldData.confidence * 100)}%
              </Badge>
              {fieldData.location && (
                <span className="text-xs text-muted-foreground">
                  Page {fieldData.location.page}
                </span>
              )}
            </div>
          );
        }
        
        // Regular object with nested properties
        return (
          <div className="space-y-2">
            {Object.entries(data).map(([key, value]) => {
              const currentPath = path ? `${path}.${key}` : key;
              const isExpanded = expandedSections.has(currentPath);
              
              // Check if value is an object or array that needs collapsible treatment
              const isComplexValue = value && typeof value === "object";
              
              return (
                <div key={key} className="border-l-2 border-muted pl-4 py-1">
                  {isComplexValue ? (
                    <Collapsible open={isExpanded}>
                      <CollapsibleTrigger 
                        onClick={() => toggleSection(currentPath)}
                        className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 w-full text-left"
                      >
                        {isExpanded ? (
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <span className="font-medium">{formatFieldName(key)}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 ml-6">
                        {renderTreeNode(value, currentPath)}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="flex items-center justify-between px-2">
                      <span className="text-sm font-medium">{formatFieldName(key)}:</span>
                      <span className="text-sm">{String(value)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      
      // Primitive values
      return <span>{String(data)}</span>;
    };

    return (
      <div className="space-y-4">
        {Object.keys(filteredData).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || minConfidence > 0 ? "No results match your filters" : "No data available"}
          </div>
        ) : (
          renderTreeNode(filteredData)
        )}
      </div>
    );
  };

  // Table View Renderer
  const TableView = () => {
    const flatData = useMemo(() => flattenData(filteredData), [filteredData]);

    if (flatData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || minConfidence > 0 ? "No results match your filters" : "No data available"}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Page</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatData.map((item, index) => (
            <TableRow 
              key={index}
              className="cursor-pointer hover:bg-muted/50"
              onMouseEnter={() => onHover && item.path && onHover(item.path, item)}
              onClick={() => onSelect && item.path && onSelect(item.path, item)}
            >
              <TableCell className="font-medium">{item.field}</TableCell>
              <TableCell>{String(item.value)}</TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getConfidenceColor(item.confidence))}
                >
                  {Math.round(item.confidence * 100)}%
                </Badge>
              </TableCell>
              <TableCell>
                {item.location?.page ? `Page ${item.location.page}` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // JSON View Renderer
  const JsonView = () => {
    return (
      <pre className="overflow-auto text-xs p-4 bg-muted/50 rounded-md">
        <code>{JSON.stringify(filteredData, null, 2)}</code>
      </pre>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Extracted Data</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="tree">Tree</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <div className="px-4 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search extracted data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Popover open={showConfidenceFilter} onOpenChange={setShowConfidenceFilter}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(minConfidence > 0 && "bg-muted")}
            >
              <Filter className="h-4 w-4 mr-1" />
              Confidence
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Confidence Filter</h4>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm font-medium w-12">
                  {Math.round(minConfidence * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMinConfidence(0)}
                >
                  Reset
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setShowConfidenceFilter(false)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {viewMode === "tree" && (
          <>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </>
        )}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={exportAsCSV}
              >
                CSV
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={exportAsJSON}
              >
                JSON
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <CardContent className="flex-1 overflow-auto pt-2">
        {viewMode === "tree" && <TreeView />}
        {viewMode === "table" && <TableView />}
        {viewMode === "json" && <JsonView />}
      </CardContent>
      <div className="p-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
        <span>Confidence:</span>
        <Badge variant="outline" className={getConfidenceColor(0.95)}>High (90-100%)</Badge>
        <Badge variant="outline" className={getConfidenceColor(0.8)}>Medium (70-89%)</Badge>
        <Badge variant="outline" className={getConfidenceColor(0.5)}>Low (0-69%)</Badge>
      </div>
    </Card>
  );
} 