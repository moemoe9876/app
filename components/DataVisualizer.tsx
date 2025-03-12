"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { InteractiveDataField } from "./InteractiveDataField";

// Types
interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number];
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: PositionData;
}

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number];
  color?: string;
  id: string;
}

interface DataVisualizerProps {
  data: any;
  onHighlight?: (highlight: HighlightRect | null) => void;
  onSelect?: (path: string, value: any) => void;
  className?: string;
  selectedFieldPath?: string | null;
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
          location: value.position,
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
  onHighlight, 
  onSelect,
  className,
  selectedFieldPath = null,
  confidenceThreshold = 0
}: DataVisualizerProps) {
  const [viewMode, setViewMode] = useState<"tree" | "table" | "json">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [minConfidence, setMinConfidence] = useState(confidenceThreshold);
  const [showConfidenceFilter, setShowConfidenceFilter] = useState(false);

  // Update minConfidence when confidenceThreshold changes
  useEffect(() => {
    setMinConfidence(confidenceThreshold);
  }, [confidenceThreshold]);

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

  // Handle field hover
  const handleFieldHover = (path: string, position: PositionData | null) => {
    if (position && onHighlight) {
      onHighlight({
        pageNumber: position.page_number,
        boundingBox: position.bounding_box,
        id: path,
      });
    } else if (onHighlight) {
      onHighlight(null);
    }
  };
  
  // Recursive renderer for nested data structures
  const renderField = (key: string, data: any, path: string) => {
    if (!data) return null;
    
    if (typeof data === 'object' && 'value' in data && 'confidence' in data) {
      // This is a field with value and confidence
      return (
        <InteractiveDataField
          key={key}
          label={key.replace(/_/g, " ")}
          data={data}
          path={path}
          onHover={handleFieldHover}
          onSelect={onSelect}
          className={path === selectedFieldPath ? "bg-primary/20 border border-primary" : ""}
        />
      );
    }
    
    if (Array.isArray(data)) {
      // Handle array of items
      return (
        <div key={key} className="space-y-2">
          <h3 className="font-medium capitalize">{key.replace(/_/g, " ")}</h3>
          <div className="pl-4 border-l-2 border-muted space-y-2">
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                {typeof item === 'object' ? (
                  Object.entries(item).map(([itemKey, itemValue]) => 
                    renderField(itemKey, itemValue, `${path}.${index}.${itemKey}`)
                  )
                ) : (
                  <div className="flex items-center justify-between p-2">
                    <span>Item {index + 1}</span>
                    <span>{String(item)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (typeof data === 'object') {
      // Handle nested objects
      return (
        <div key={key} className="space-y-2">
          <h3 className="font-medium capitalize">{key.replace(/_/g, " ")}</h3>
          <div className="pl-4 border-l-2 border-muted space-y-2">
            {Object.entries(data).map(([nestedKey, nestedValue]) => 
              renderField(nestedKey, nestedValue, `${path}.${nestedKey}`)
            )}
          </div>
        </div>
      );
    }
    
    // Handle primitive values
    return (
      <div key={key} className="flex items-center justify-between p-2">
        <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
        <span>{String(data)}</span>
      </div>
    );
  };
  
  // Render tree view
  const renderTreeView = () => {
    return (
      <div className="space-y-4">
        {Object.entries(filteredData).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || minConfidence > 0 ? "No results match your filters" : "No data available"}
          </div>
        ) : (
          Object.entries(filteredData).map(([key, value]) => 
            renderField(key, value, key)
          )
        )}
      </div>
    );
  };
  
  // Render table view
  const renderTableView = () => {
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
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                item.path === selectedFieldPath ? "bg-primary/20" : ""
              )}
              id={`field-${item.path?.replace(/\./g, '-')}`}
              onMouseEnter={() => onHighlight && item.location && onHighlight({
                pageNumber: item.location.page_number,
                boundingBox: item.location.bounding_box,
                id: item.path,
              })}
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
                {item.location?.page_number ? `Page ${item.location.page_number}` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render JSON view
  const renderJsonView = () => {
    return (
      <pre className="overflow-auto text-xs p-4 bg-muted/50 rounded-md">
        <code>{JSON.stringify(filteredData, null, 2)}</code>
      </pre>
    );
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
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
        {viewMode === "tree" && renderTreeView()}
        {viewMode === "table" && renderTableView()}
        {viewMode === "json" && renderJsonView()}
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