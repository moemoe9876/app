# Dynamic Extracted Data Display Implementation Plan

## Overview

This document outlines the detailed implementation plan for enhancing the dynamic data display feature in Ingestio.io. The goal is to make the extracted data display more flexible and responsive to user prompts, ensuring that any type of extracted data can be properly visualized in the document review interface.

## Current Issues

1. The extracted data display is hardcoded for a specific structure (invoices)
2. User prompts don't fully influence what data is extracted and displayed
3. The ResultDisplay component doesn't handle dynamic data structures
4. There's no connection between the user's prompt and the displayed data
5. The extraction API doesn't properly adapt to different document types

## Implementation Steps

### 1. Update Document API Endpoint [ ]

**File:** `/app/api/documents/[id]/route.ts`

- [ ] Modify the API to use the exact extraction prompt from the user
- [ ] Remove hardcoded data structure assumptions (invoice-specific fields)
- [ ] Implement a more flexible JSON schema for extracted data
- [ ] Add metadata about the extraction process to the response
- [ ] Improve error handling for malformed extraction results

**Code Changes:**
```typescript
// Replace hardcoded prompt with dynamic prompt handling
let promptText = "";

if (customPrompt) {
  promptText = customPrompt;
} else {
  promptText = "Extract all relevant information from this document.";
}

// Add instruction for JSON format but without assuming structure
promptText += `
  Return the data in valid JSON format. For each extracted field, include:
  - The field value
  - A confidence score between 0 and 1
  - The location in the document (page number, coordinates)
`;
```

### 2. Enhance ResultDisplay Component [ ]

**File:** `/components/ResultDisplay.tsx`

- [ ] Refactor to handle any JSON structure, not just invoice data
- [ ] Create a recursive renderer for nested data structures
- [ ] Add visual indicators for confidence scores
- [ ] Implement collapsible sections for complex data
- [ ] Add search/filter functionality for large datasets

**Code Changes:**
```typescript
// Create a recursive component for rendering any data structure
const DynamicDataRenderer = ({ data, path = "" }) => {
  if (!data) return null;
  
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="pl-4 border-l-2 border-muted">
            <DynamicDataRenderer data={item} path={`${path}[${index}]`} />
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof data === 'object') {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            {typeof value === 'object' && value !== null ? (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2">
                  <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-4 mt-2">
                    <DynamicDataRenderer data={value} path={`${path}.${key}`} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm capitalize">{key.replace(/_/g, " ")}:</span>
                <span className="text-sm font-medium">{String(value)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  
  return <span>{String(data)}</span>;
};
```

### 3. Create a Flexible Data Visualization Component [ ]

**File:** `/components/DataVisualizer.tsx` (new file)

- [ ] Build a new component specifically for visualizing extracted data
- [ ] Support multiple visualization modes (table, tree, key-value pairs)
- [ ] Implement hover interactions for highlighting
- [ ] Add export options for different formats
- [ ] Include confidence score visualization

**Code Structure:**
```typescript
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface DataVisualizerProps {
  data: any;
  onHover?: (path: string, value: any) => void;
  onSelect?: (path: string, value: any) => void;
}

export function DataVisualizer({ data, onHover, onSelect }: DataVisualizerProps) {
  const [viewMode, setViewMode] = useState<"tree" | "table" | "json">("tree");
  
  // Implementation of different view modes
  const renderTreeView = () => { /* ... */ };
  const renderTableView = () => { /* ... */ };
  const renderJsonView = () => { /* ... */ };
  
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
      <CardContent className="flex-1 overflow-auto">
        {viewMode === "tree" && renderTreeView()}
        {viewMode === "table" && renderTableView()}
        {viewMode === "json" && renderJsonView()}
      </CardContent>
    </Card>
  );
}
```

### 4. Update Review Page to Use New Components [ ]

**File:** `/app/(dashboard)/dashboard/review/[id]/page.tsx`

- [ ] Replace hardcoded data display with new dynamic components
- [ ] Add state management for hover interactions
- [ ] Implement data filtering based on confidence scores
- [ ] Add UI controls for adjusting visualization preferences
- [ ] Ensure responsive layout for different screen sizes

**Code Changes:**
```typescript
// Add state for hover interactions
const [hoveredField, setHoveredField] = useState<string | null>(null);

// Add handler for hover events
const handleDataHover = (path: string, value: any) => {
  setHoveredField(path);
  // Additional logic for highlighting in PDF viewer
};

// Replace the existing extracted data display
<Card className="flex flex-col overflow-hidden">
  <DataVisualizer 
    data={extractedData} 
    onHover={handleDataHover}
    onSelect={(path, value) => {
      // Handle selection logic
    }}
  />
</Card>
```

### 5. Enhance Extraction API [ ]

**File:** `/app/api/extract/route.ts`

- [ ] Update to handle any document type, not just invoices
- [ ] Improve prompt engineering for better extraction results
- [ ] Add support for document structure detection
- [ ] Implement confidence scoring for all extracted fields
- [ ] Add position data for highlighting capabilities

**Code Changes:**
```typescript
// Enhance the prompt to be more flexible
const prompt = `
  Extract structured data from the following document according to these instructions:
  ${formData.get("extractionPrompt") || "Extract all relevant information"}
  
  For each piece of information you extract, include:
  1. The extracted value
  2. A confidence score between 0 and 1
  3. The location in the document (page number, bounding box coordinates)
  
  Return the data in valid JSON format without any markdown code block markers.
`;
```

### 6. Testing Strategy [ ]

- [ ] Create test cases with different document types (invoices, receipts, contracts, etc.)
- [ ] Test with various extraction prompts to verify flexibility
- [ ] Verify rendering of complex nested data structures
- [ ] Test hover interactions and highlighting
- [ ] Ensure performance with large datasets

## Success Criteria

1. The system can extract and display data from any document type based on user prompts
2. The UI can handle any JSON structure returned from the extraction API
3. Users can easily navigate and understand complex extracted data
4. The display adapts to different types of data without errors
5. Hover interactions work correctly for highlighting relevant data

