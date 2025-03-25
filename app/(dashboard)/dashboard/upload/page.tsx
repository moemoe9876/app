"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileIcon, FileText, Upload, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Define the stages of the upload process
enum UploadStage {
  UPLOAD = "upload",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error"
}

interface ExtractionOptions {
  includeConfidence: boolean;
  includePositions: boolean;
  detectDocumentType: boolean;
  temperature: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [extractionPrompt, setExtractionPrompt] = useState<string>("");
  const [extractionOptions, setExtractionOptions] = useState<ExtractionOptions>({
    includeConfidence: true,
    includePositions: false,
    detectDocumentType: true,
    temperature: 0.1
  });
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>(UploadStage.UPLOAD);
  const [progress, setProgress] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handlePromptChange = (prompt: string, options: ExtractionOptions) => {
    setExtractionPrompt(prompt);
    setExtractionOptions(options);
  };

  // Simulate progress updates during processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (uploadStage === UploadStage.PROCESSING) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadStage]);

  // When progress reaches 100%, move to complete stage after a short delay
  useEffect(() => {
    if (progress === 100 && uploadStage === UploadStage.PROCESSING) {
      const timeout = setTimeout(() => {
        setUploadStage(UploadStage.COMPLETE);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [progress, uploadStage]);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setLoading(true);
      setUploadStage(UploadStage.PROCESSING);
      setProgress(0);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      
      // Add the extraction prompt if provided
      if (extractionPrompt) {
        formData.append("extractionPrompt", extractionPrompt);
      }
      
      // Add extraction options
      formData.append("options", JSON.stringify(extractionOptions));
      
      // Upload the file to the server
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload document");
      }

      const { documentId } = await uploadResponse.json();
      setDocumentId(documentId);
      
      // Update progress to almost complete
      setProgress(90);
      
      // Simulate a short delay before completing
      setTimeout(() => {
        setProgress(100);
      }, 500);
      
    } catch (error) {
      console.error("Error processing request:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStage(UploadStage.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractionPrompt("");
    setLoading(false);
    setUploadStage(UploadStage.UPLOAD);
    setProgress(0);
    setError(null);
  };

  const handleGoToReview = () => {
    if (documentId) {
      router.push(`/dashboard/review/${documentId}`);
    }
  };

  const renderUploadStage = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <h3 className="text-2xl font-medium mb-3">Upload Document</h3>
          <p className="text-muted-foreground mx-auto" style={{ maxWidth: "calc(28rem * 1.2)" }}>
            Upload a document for automated data extraction. We support PDF files up to 100MB.
          </p>
        </div>
        
        <FileUpload 
          onFileSelect={handleFileSelect} 
          onPromptChange={handlePromptChange}
          initialPrompt={extractionPrompt}
        />
        
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full" 
            style={{ maxWidth: "calc(20rem * 1.2)" }}
          >
            {loading ? (
              <>
                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Extract Data
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderProcessingStage = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <RotateCw className="h-14 w-14 text-primary animate-spin mb-5" />
          <h3 className="text-2xl font-medium mb-3">Processing Your Document</h3>
          <p className="text-muted-foreground mx-auto" style={{ maxWidth: "calc(28rem * 1.2)" }}>
            We're extracting data from your document. This may take a moment depending on the document size and complexity.
          </p>
        </div>
        
        <div className="space-y-3 mx-auto" style={{ maxWidth: "calc(28rem * 1.2)" }}>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Extracting data...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        
        <div className="space-y-4 mx-auto pt-2" style={{ maxWidth: "calc(28rem * 1.2)" }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${progress >= 30 ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={progress >= 30 ? "text-foreground" : "text-muted-foreground"}>
              Document uploaded
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${progress >= 60 ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={progress >= 60 ? "text-foreground" : "text-muted-foreground"}>
              Document analyzed
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${progress >= 90 ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={progress >= 90 ? "text-foreground" : "text-muted-foreground"}>
              Data extraction complete
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderCompleteStage = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mb-5" />
          <h3 className="text-2xl font-medium mb-3">Document Processed Successfully</h3>
          <p className="text-muted-foreground mx-auto" style={{ maxWidth: "calc(28rem * 1.2)" }}>
            Your document has been processed and the data has been extracted. You can now review and verify the extracted information.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-center justify-center mt-2">
          <Button onClick={handleGoToReview} className="w-full" style={{ maxWidth: "calc(20rem * 1.2)" }}>
            Review Extracted Data
          </Button>
          <Button variant="outline" onClick={handleReset} className="w-full" style={{ maxWidth: "calc(20rem * 1.2)" }}>
            Upload Another Document
          </Button>
        </div>
      </div>
    );
  };

  const renderErrorStage = () => {
    return (
      <div className="space-y-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-base font-medium">Error</AlertTitle>
          <AlertDescription className="mt-1">
            {error || "There was an error processing your document. Please try again."}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset} className="w-full" style={{ maxWidth: "calc(20rem * 1.2)" }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="w-full">
        <Card className="w-full mx-auto overflow-hidden" style={{ maxWidth: "calc(42rem * 1.2)" }}>
          <CardContent className="p-0">
            <div className="px-6 py-8 sm:px-8">
              {uploadStage === UploadStage.UPLOAD && renderUploadStage()}
              {uploadStage === UploadStage.PROCESSING && renderProcessingStage()}
              {uploadStage === UploadStage.COMPLETE && renderCompleteStage()}
              {uploadStage === UploadStage.ERROR && renderErrorStage()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
        <p className="text-muted-foreground">
          Upload a document to extract and process its data
        </p>
      </div>

      {renderContent()}
    </div>
  );
} 