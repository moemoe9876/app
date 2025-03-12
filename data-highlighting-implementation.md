# Data Highlighting Implementation Plan

## Overview

This document outlines the detailed implementation plan for adding data highlighting functionality to Ingestio.io. This feature will allow users to hover over extracted data fields and see the corresponding information highlighted in the document preview, creating a more interactive and intuitive document review experience.

## Current Issues

1. There's no visual connection between extracted data and its location in the document
2. Users can't easily verify the accuracy of extracted data
3. The document review process lacks interactive elements
4. There's no way to highlight specific data points in the document

## Implementation Steps

### 1. Enhance Extraction API to Include Position Data [ ]

**File:** `/app/api/extract/route.ts` and `/app/api/documents/[id]/route.ts`

- [ ] Modify the extraction prompt to request position information
- [ ] Update the API response structure to include bounding box coordinates
- [ ] Add page number references for multi-page documents
- [ ] Ensure backward compatibility with existing documents

**Code Changes:**
```typescript
// Update the prompt to request position information
const prompt = `
  Extract structured data from the following document according to these instructions:
  ${customPrompt || "Extract all relevant information"}
  
  For each piece of information you extract, include:
  1. The extracted value
  2. A confidence score between 0 and 1
  3. The location in the document as:
     - page_number: The page where the information appears (1-indexed)
     - bounding_box: [x1, y1, x2, y2] coordinates as percentages of page dimensions
       where (x1,y1) is the top-left corner and (x2,y2) is the bottom-right corner
  
  Return the data in valid JSON format without any markdown code block markers.
`;

// Update the expected response structure
interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: PositionData;
}
```

### 2. Create a Highlight Layer Component for PDF Viewer [ ]

**File:** `/components/PdfHighlightLayer.tsx` (new file)

- [ ] Implement a transparent overlay for the PDF viewer
- [ ] Add support for rendering highlight rectangles
- [ ] Create animations for highlight transitions
- [ ] Ensure proper scaling with zoom levels

**Code Structure:**
```typescript
import React from "react";
import { cn } from "@/lib/utils";

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
  color?: string;
  id: string;
}

interface PdfHighlightLayerProps {
  highlights: HighlightRect[];
  currentPage: number;
  containerWidth: number;
  containerHeight: number;
  scale: number;
  className?: string;
}

export function PdfHighlightLayer({
  highlights,
  currentPage,
  containerWidth,
  containerHeight,
  scale,
  className,
}: PdfHighlightLayerProps) {
  // Filter highlights for the current page
  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);
  
  return (
    <div 
      className={cn(
        "absolute inset-0 pointer-events-none",
        className
      )}
    >
      {pageHighlights.map((highlight) => {
        const [x1, y1, x2, y2] = highlight.boundingBox;
        
        // Convert percentage to pixels based on container dimensions
        const left = (x1 / 100) * containerWidth * scale;
        const top = (y1 / 100) * containerHeight * scale;
        const width = ((x2 - x1) / 100) * containerWidth * scale;
        const height = ((y2 - y1) / 100) * containerHeight * scale;
        
        return (
          <div
            key={highlight.id}
            className="absolute border-2 border-primary bg-primary/20 transition-all duration-200"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              borderColor: highlight.color || 'var(--primary)',
              backgroundColor: highlight.color ? `${highlight.color}20` : 'var(--primary-20)',
            }}
          />
        );
      })}
    </div>
  );
}
```

### 3. Enhance PdfViewerUrl Component [ ]

**File:** `/components/PdfViewerUrl.tsx`

- [ ] Integrate the highlight layer with the PDF viewer
- [ ] Add state management for highlights
- [ ] Ensure highlights scale properly with zoom
- [ ] Handle page navigation for multi-page documents

**Code Changes:**
```typescript
import { PdfHighlightLayer } from "./PdfHighlightLayer";

interface PdfViewerUrlProps {
  url: string;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  highlights?: HighlightRect[];
}

export default function PdfViewerUrl({ 
  url, 
  zoomLevel = 100,
  onZoomChange,
  highlights = []
}: PdfViewerUrlProps) {
  // Existing state
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [containerHeight, setContainerHeight] = useState<number>();
  const [error, setError] = useState<Error | null>(null);
  const [zoom, setZoom] = useState(zoomLevel);
  
  // Add state for current page
  const [currentPage, setCurrentPage] = useState(1);
  
  // Update the render method to include the highlight layer
  return (
    <div className="flex flex-col h-full">
      {/* Existing zoom controls */}
      
      <div
        ref={setContainerRef}
        className="flex-1 overflow-auto relative"
      >
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load PDF document. {error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <Document
              file={url}
              onLoadSuccess={(pdf) => {
                setError(null);
                setNumPages(pdf._pdfInfo.numPages);
              }}
              onLoadError={onDocumentLoadError}
              options={options}
              loading={<div className="text-center py-4">Loading PDF...</div>}
            >
              {Array.from(new Array(numPages), (_el, index) => {
                const pageNumber = index + 1;
                return (
                  <div key={`page_${pageNumber}`} className="relative">
                    <Page
                      pageNumber={pageNumber}
                      width={containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      onRenderSuccess={(page) => {
                        if (pageNumber === currentPage) {
                          setContainerHeight(page.height);
                        }
                      }}
                    />
                    
                    {/* Add highlight layer for each page */}
                    {pageNumber === currentPage && (
                      <PdfHighlightLayer
                        highlights={highlights}
                        currentPage={currentPage}
                        containerWidth={containerWidth || 0}
                        containerHeight={containerHeight || 0}
                        scale={zoom / 100}
                      />
                    )}
                  </div>
                );
              })}
            </Document>
          </div>
        )}
      </div>
      
      {/* Add page navigation controls */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-between border-t p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage === numPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 4. Create Interactive Data Field Component [ ]

**File:** `/components/InteractiveDataField.tsx` (new file)

- [ ] Build a component for displaying data fields with hover functionality
- [ ] Add visual indicators for confidence scores
- [ ] Implement hover state management
- [ ] Add accessibility features for keyboard navigation

**Code Structure:**
```typescript
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number];
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: PositionData;
}

interface InteractiveDataFieldProps {
  label: string;
  data: FieldData;
  path: string;
  onHover?: (path: string, position: PositionData | null) => void;
  onSelect?: (path: string, data: FieldData) => void;
  className?: string;
}

export function InteractiveDataField({
  label,
  data,
  path,
  onHover,
  onSelect,
  className,
}: InteractiveDataFieldProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover && data.position) {
      onHover(path, data.position);
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHover) {
      onHover(path, null);
    }
  };
  
  const handleClick = () => {
    if (onSelect) {
      onSelect(path, data);
    }
  };
  
  // Determine confidence color
  const getConfidenceColor = () => {
    if (data.confidence >= 0.8) return "bg-green-500";
    if (data.confidence >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-2 rounded-md transition-colors",
        isHovered ? "bg-accent" : "hover:bg-accent/50",
        data.position ? "cursor-pointer" : "cursor-default",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${data.value}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            getConfidenceColor()
          )}
          title={`Confidence: ${Math.round(data.confidence * 100)}%`}
        />
        <span className="font-medium">{label}:</span>
      </div>
      <div className="flex items-center gap-2">
        <span>{String(data.value)}</span>
        {data.position && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-muted-foreground">
              (Page {data.position.page_number})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. Update DataVisualizer Component [ ]

**File:** `/components/DataVisualizer.tsx`

- [ ] Integrate the InteractiveDataField component
- [ ] Implement recursive rendering for nested data structures
- [ ] Add hover state management for highlighting
- [ ] Ensure proper data path tracking for complex structures

**Code Changes:**
```typescript
import { InteractiveDataField } from "./InteractiveDataField";

interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number];
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
}

export function DataVisualizer({ data, onHighlight, onSelect }: DataVisualizerProps) {
  // Existing state and methods
  
  // Add method to handle field hover
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
  
  // Update the recursive renderer to use InteractiveDataField
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
                {Object.entries(item).map(([itemKey, itemValue]) => 
                  renderField(itemKey, itemValue, `${path}.${index}.${itemKey}`)
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
  
  // Render the data
  return (
    <div className="space-y-4 p-4">
      {Object.entries(data).map(([key, value]) => 
        renderField(key, value, key)
      )}
    </div>
  );
}
```

### 6. Update Review Page to Connect Components [ ]

**File:** `/app/(dashboard)/dashboard/review/[id]/page.tsx`

- [ ] Add state management for highlights
- [ ] Connect the DataVisualizer and PdfViewerUrl components
- [ ] Implement bidirectional highlighting
- [ ] Add UI controls for highlight customization

**Code Changes:**
```typescript
// Add state for highlight management
const [currentHighlight, setCurrentHighlight] = useState<HighlightRect | null>(null);

// Add handler for highlight events
const handleHighlight = (highlight: HighlightRect | null) => {
  setCurrentHighlight(highlight);
};

// Update the PDF viewer to use highlights
<PdfViewerUrl 
  url={pdfUrl} 
  zoomLevel={zoomLevel}
  onZoomChange={setZoomLevel}
  highlights={currentHighlight ? [currentHighlight] : []}
/>

// Update the data visualizer to trigger highlights
<DataVisualizer 
  data={extractedData} 
  onHighlight={handleHighlight}
  onSelect={(path, value) => {
    // Handle selection logic
  }}
/>
```

### 7. Add Bidirectional Highlighting [ ]

**File:** `/components/PdfViewerUrl.tsx`

- [ ] Implement text layer analysis for document positions
- [ ] Add click handlers on the PDF to highlight corresponding data
- [ ] Create a mapping system between document positions and data fields
- [ ] Ensure proper scaling and positioning

**Code Changes:**
```typescript
// Add click handler for the text layer
const handleTextLayerClick = (e: React.MouseEvent, pageNumber: number) => {
  if (!containerRef.current) return;
  
  const containerRect = containerRef.current.getBoundingClientRect();
  const scale = zoom / 100;
  
  // Calculate click position as percentage of page dimensions
  const x = ((e.clientX - containerRect.left) / scale / containerWidth!) * 100;
  const y = ((e.clientY - containerRect.top) / scale / containerHeight!) * 100;
  
  // Find data field that contains this position
  // This would require a mapping between positions and data fields
  // For now, we'll just log the position
  console.log(`Clicked at page ${pageNumber}, position: ${x}%, ${y}%`);
  
  // In a real implementation, you would:
  // 1. Find the data field at this position
  // 2. Highlight the corresponding field in the data visualizer
  // 3. Scroll the data visualizer to show the highlighted field
};

// Update the Page component to include the click handler
<Page
  pageNumber={pageNumber}
  width={containerWidth}
  renderTextLayer={true}
  renderAnnotationLayer={true}
  onRenderSuccess={(page) => {
    if (pageNumber === currentPage) {
      setContainerHeight(page.height);
    }
  }}
  customTextRenderer={({ str, itemIndex }) => {
    // Custom text renderer for more precise text positioning
    return str;
  }}
/>

// Add a transparent overlay for click handling
<div 
  className="absolute inset-0 cursor-pointer"
  onClick={(e) => handleTextLayerClick(e, currentPage)}
/>
```

## Testing Strategy [ ]

- [ ] Test highlighting with different document types and structures
- [ ] Verify accuracy of position data from the extraction API
- [ ] Test bidirectional highlighting (data to PDF and vice versa)
- [ ] Ensure proper scaling with different zoom levels
- [ ] Test with multi-page documents
- [ ] Verify accessibility features

## Success Criteria

1. Users can hover over extracted data fields and see the corresponding text highlighted in the document
2. The highlighting is accurate and properly scaled with zoom levels
3. The system works with different document types and structures
4. The UI provides clear visual feedback for the highlighting
5. The feature works with keyboard navigation for accessibility

## Timeline

- Extraction API Enhancements: 1 day
- PDF Highlight Layer Component: 1 day
- Interactive Data Field Component: 1 day
- Integration in Review Page: 1 day
- Bidirectional Highlighting: 1-2 days
- Testing and Refinement: 1 day

Total: 6-7 days 