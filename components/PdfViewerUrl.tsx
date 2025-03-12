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
import { PdfHighlightLayer } from "./PdfHighlightLayer";

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

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
  color?: string;
  id: string;
}

interface PdfViewerUrlProps {
  url: string;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  highlightedField?: FieldLocation;
  highlights?: HighlightRect[];
  onPositionClick?: (pageNumber: number, position: [number, number]) => void;
}

export default function PdfViewerUrl({ 
  url, 
  zoomLevel = 100,
  onZoomChange,
  highlightedField,
  highlights = [],
  onPositionClick
}: PdfViewerUrlProps) {
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [error, setError] = useState<Error | null>(null);
  const [zoom, setZoom] = useState(zoomLevel);
  const [pageRefs, setPageRefs] = useState<(HTMLDivElement | null)[]>([]);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Update page heights when a page is rendered
  const handlePageRenderSuccess = (page: any, pageNumber: number) => {
    setPageHeights(prev => {
      const newHeights = [...prev];
      newHeights[pageNumber - 1] = page.height;
      return newHeights;
    });
  };

  // Scroll to highlighted field
  useEffect(() => {
    if (highlights.length > 0) {
      const highlight = highlights[0]; // Get the first highlight
      if (highlight && highlight.pageNumber) {
        // Set current page to the highlighted page
        setCurrentPage(highlight.pageNumber);
        
        // Scroll the page into view
        const pageIndex = highlight.pageNumber - 1;
        const pageRef = pageRefs[pageIndex];
        
        if (pageRef) {
          // Scroll the page into view with a small delay to prevent rapid re-renders
          const timer = setTimeout(() => {
            pageRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [highlights, pageRefs]);

  // Add click handler for the text layer
  const handleTextLayerClick = (e: React.MouseEvent, pageNumber: number) => {
    if (!containerRef || !onPositionClick) return;
    
    const pageRef = pageRefs[pageNumber - 1];
    if (!pageRef) return;
    
    const pageRect = pageRef.getBoundingClientRect();
    const scale = zoom / 100;
    
    // Calculate click position as percentage of page dimensions
    const x = ((e.clientX - pageRect.left) / scale / containerWidth!) * 100;
    const y = ((e.clientY - pageRect.top) / scale / pageHeights[pageNumber - 1]) * 100;
    
    // Ensure values are within bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    console.log(`Clicked at page ${pageNumber}, position: ${boundedX}%, ${boundedY}%`);
    
    // Notify parent component about the click position
    onPositionClick(pageNumber, [boundedX, boundedY]);
  };

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
                const pageNumber = index + 1;
                return (
                  <div 
                    key={`page_container_${pageNumber}`} 
                    className="relative mb-4"
                    ref={refCallbacks[index]}
                  >
                    <Page
                      key={`page_${pageNumber}`}
                      pageNumber={pageNumber}
                      width={containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      onRenderSuccess={(page) => handlePageRenderSuccess(page, pageNumber)}
                    />
                    
                    {/* Add highlight layer for each page */}
                    <PdfHighlightLayer
                      highlights={highlights}
                      currentPage={pageNumber}
                      containerWidth={containerWidth || 0}
                      containerHeight={pageHeights[index] || 0}
                      scale={zoom / 100}
                    />
                    
                    {/* Add a transparent overlay for click handling */}
                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={(e) => handleTextLayerClick(e, pageNumber)}
                      style={{ pointerEvents: onPositionClick ? 'auto' : 'none' }}
                    />
                  </div>
                );
              })}
            </Document>
          </div>
        )}
      </div>
      
      {/* Add page navigation controls */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-between border-t p-2 mt-2">
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