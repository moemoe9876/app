"use client";

import { useState, useEffect, use } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  Check, 
  Download, 
  Edit, 
  Eye, 
  FileText, 
  Save, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Trash2,
  Plus,
  AlertTriangle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PdfViewer from "@/components/PdfViewer";
import PdfViewerUrl from "@/components/PdfViewerUrl";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResizablePanels } from "@/components/ResizablePanels";
import { DataVisualizer } from "@/components/DataVisualizer";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Define types for our data structure
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

interface ExtractionMetadata {
  timestamp: string;
  model: string;
  prompt: string;
  processingTimeMs: number;
}

export default function ReviewPage({ params }: PageProps) {
  const { id } = use(params);
  const documentId = id;
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractionMetadata, setExtractionMetadata] = useState<ExtractionMetadata | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [hoveredFieldData, setHoveredFieldData] = useState<any | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
      
      // Trigger a resize event to ensure PDF viewer adjusts
      window.dispatchEvent(new Event('resize'));
    };
    
    window.addEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    
    // Check localStorage on mount
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true");
    }
    
    return () => {
      window.removeEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    };
  }, []);

  // Fetch document data
  useEffect(() => {
    const fetchDocumentData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/documents/${documentId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch document data");
        }
        
        const data = await response.json();
        setExtractedData(data.extractedData);
        setExtractionMetadata(data.metadata);
        setFileName(data.fileName);
        setPdfUrl(`/api/documents/${documentId}/file`);
      } catch (error) {
        console.error("Error fetching document data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch document data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocumentData();
  }, [documentId, toast]);

  const handleConfirm = async () => {
    try {
      // Save the data to the backend
      const response = await fetch(`/api/documents/${documentId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extractedData,
          metadata: extractionMetadata
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save data");
      }
      
      setEditMode(false);
      setConfirmed(true);
      
      toast({
        title: "Success",
        description: "Document data confirmed successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error confirming document:", error);
      toast({
        title: "Error",
        description: "Failed to confirm document data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!extractedData) return;
    
    if (exportFormat === "json") {
      const dataToExport = includeMetadata 
        ? { data: extractedData, metadata: extractionMetadata }
        : extractedData;
        
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `document_${documentId}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For other formats, we'll just show a toast for now
      toast({
        title: "Export Initiated",
        description: `Exporting data as ${exportFormat.toUpperCase()}...`,
        variant: "default",
      });
    }
    
    setShowExportDialog(false);
  };

  const handleFieldHover = (path: string, data: any) => {
    setHoveredField(path);
    setHoveredFieldData(data);
    
    // If the data has location information, we could highlight it in the PDF viewer
    // This would require additional implementation in the PdfViewerUrl component
  };

  const handleFieldSelect = (path: string, data: any) => {
    // Handle field selection - could be used for editing specific fields
    if (editMode) {
      // Implement field editing logic here
      toast({
        title: "Field Selected",
        description: `Selected field: ${path}`,
        variant: "default",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <RotateCw className="h-8 w-8 animate-spin text-primary" />
          <h3 className="text-lg font-medium">Loading document data...</h3>
          <p className="text-sm text-muted-foreground">
            Preparing your document for review
          </p>
        </div>
      </div>
    );
  }

  if (!extractedData) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h3 className="text-lg font-medium">Document Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The document you're looking for could not be found or has no extracted data.
          </p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
          <div className="flex items-center gap-2">
            <Badge 
              variant={confirmed ? "default" : "outline"}
              className={confirmed ? "bg-green-600" : ""}
            >
              {confirmed ? "Confirmed" : "Pending Confirmation"}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground">
          Review and verify the extracted data from your document
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="confidence-threshold" className="text-sm">
            Confidence Threshold:
          </Label>
          <div className="w-32">
            <Slider
              id="confidence-threshold"
              min={0}
              max={1}
              step={0.05}
              value={[confidenceThreshold]}
              onValueChange={(value) => setConfidenceThreshold(value[0])}
            />
          </div>
          <span className="text-sm font-medium w-12">
            {Math.round(confidenceThreshold * 100)}%
          </span>
        </div>
        
        <div className="ml-auto flex gap-2">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Eye className="mr-2 h-4 w-4" /> View Mode
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" /> Edit Mode
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-180px)]">
        <ResizablePanels
          leftPanel={
            <DataVisualizer
              data={extractedData}
              onHover={handleFieldHover}
              onSelect={handleFieldSelect}
              confidenceThreshold={confidenceThreshold}
            />
          }
          rightPanel={
            <Card className="h-full flex flex-col overflow-hidden border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Document Preview</CardTitle>
                  <CardDescription>
                    Original document for reference
                  </CardDescription>
                </div>
                {extractionMetadata && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          {extractionMetadata.model}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="w-80">
                        <div className="space-y-2">
                          <p className="font-medium">Extraction Details</p>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Model:</span>
                              <span className="font-medium">{extractionMetadata.model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Processing Time:</span>
                              <span className="font-medium">{Math.round(extractionMetadata.processingTimeMs / 1000)}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Timestamp:</span>
                              <span className="font-medium">{new Date(extractionMetadata.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto p-0 bg-muted/50 relative">
                {pdfUrl ? (
                  <PdfViewerUrl 
                    url={pdfUrl} 
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    highlightedField={hoveredFieldData?.location}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 h-full">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">{fileName || "Document Preview"}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Preview not available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          }
          defaultLeftWidth={45}
          minLeftWidth={30}
          maxLeftWidth={70}
          storageKey="documentReviewPanels"
        />
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setEditMode(false);
            setConfirmed(false);
          }}
        >
          Reset
        </Button>
        
        <div className="flex gap-2">
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="mr-2 h-4 w-4" /> Export Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Extracted Data</DialogTitle>
                <DialogDescription>
                  Choose your preferred export format
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="export-format" className="text-right">
                    Format
                  </Label>
                  <Select
                    value={exportFormat}
                    onValueChange={setExportFormat}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="include-metadata" className="text-right">
                    Include Metadata
                  </Label>
                  <div className="col-span-3">
                    <Switch 
                      id="include-metadata" 
                      checked={includeMetadata}
                      onCheckedChange={setIncludeMetadata}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button
            onClick={handleConfirm}
            disabled={confirmed}
            className={confirmed ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {confirmed ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Confirmed
              </>
            ) : (
              "Confirm Data"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 