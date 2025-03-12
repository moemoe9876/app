"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import { debounce } from "lodash";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

interface FieldLocation {
  page: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface PdfViewerUrlProps {
  url: string;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  highlightedField?: FieldLocation;
}

export default function PdfViewerUrl({ 
  url, 
  zoomLevel = 100,
  onZoomChange,
  highlightedField
}: PdfViewerUrlProps) {
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [error, setError] = useState<Error | null>(null);
  const [zoom, setZoom] = useState(zoomLevel);
  const [pageRefs, setPageRefs] = useState<(HTMLDivElement | null)[]>([]);

  // Sync zoom level with parent component
  useEffect(() => {
    setZoom(zoomLevel);
  }, [zoomLevel]);

  // Initialize page refs when numPages changes
  useEffect(() => {
    if (numPages) {
      setPageRefs(Array(numPages).fill(null));
    }
  }, [numPages]);

  // Add debounced resize observer
  const debouncedResize = useCallback(
    debounce((entries: ResizeObserverEntry[]) => {
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
    const handleResize = debounce(() => {
      if (containerRef) {
        setContainerWidth(containerRef.clientWidth);
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, [containerRef]);

  async function onDocumentLoadSuccess(page: PDFDocumentProxy): Promise<void> {
    setError(null);
    setNumPages(page._pdfInfo.numPages);
  }

  function onDocumentLoadError(err: Error): void {
    console.error("Error loading PDF:", err);
    setError(err);
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(200, zoom + 10);
    setZoom(newZoom);
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(50, zoom - 10);
    setZoom(newZoom);
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  };

  // Set a ref for a specific page - use useCallback to prevent recreation on every render
  const setPageRef = useCallback((index: number, ref: HTMLDivElement | null) => {
    if (!ref) return; // Skip null refs
    
    setPageRefs(prev => {
      // If the ref is the same, return the previous state to prevent unnecessary updates
      if (prev[index] === ref) {
        return prev;
      }
      
      // Create a new array with the updated ref
      const newRefs = [...prev];
      newRefs[index] = ref;
      return newRefs;
    });
  }, []);

  // Create a memoized array of callbacks for each page
  const refCallbacks = useMemo(() => {
    if (!numPages) return [];
    
    return Array.from({ length: numPages }, (_, index) => 
      (ref: HTMLDivElement | null) => setPageRef(index, ref)
    );
  }, [numPages, setPageRef]);

  // Render highlight overlay for the field if coordinates are available
  const renderHighlight = (pageNumber: number) => {
    if (!highlightedField || highlightedField.page !== pageNumber || !highlightedField.coordinates) {
      return null;
    }

    const { x, y, width, height } = highlightedField.coordinates;
    
    return (
      <div 
        className="absolute bg-yellow-300/30 border-2 border-yellow-500 pointer-events-none transition-all duration-200"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    );
  };

  // Scroll to highlighted field
  useEffect(() => {
    if (highlightedField && highlightedField.page && highlightedField.coordinates) {
      const pageIndex = highlightedField.page - 1;
      const pageRef = pageRefs[pageIndex];
      
      if (pageRef) {
        // Scroll the page into view with a small delay to prevent rapid re-renders
        const timer = setTimeout(() => {
          pageRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [highlightedField, pageRefs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-2 mb-2">
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm">{zoom}%</span>
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      
      <div
        ref={setContainerRef}
        className="flex-1 overflow-auto"
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
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={options}
              loading={<div className="text-center py-4">Loading PDF...</div>}
            >
              {Array.from(new Array(numPages), (_el, index) => {
                return (
                  <div 
                    key={`page_container_${index + 1}`} 
                    className="relative mb-4"
                    ref={refCallbacks[index]}
                  >
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                    {renderHighlight(index + 1)}
                  </div>
                );
              })}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
} 