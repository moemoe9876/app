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

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [extractionPrompt, setExtractionPrompt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>(UploadStage.UPLOAD);
  const [progress, setProgress] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handlePromptChange = (prompt: string) => {
    setExtractionPrompt(prompt);
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
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <h3 className="text-xl font-medium mb-2">Upload Document</h3>
          <p className="text-muted-foreground max-w-md">
            Upload a document for automated data extraction. We support PDF files up to 100MB.
          </p>
        </div>
        
        <FileUpload 
          onFileSelect={handleFileSelect} 
          onPromptChange={handlePromptChange}
          initialPrompt={extractionPrompt}
        />
        
        <div className="flex justify-center mt-6">
          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full max-w-xs"
          >
            {loading ? (
              <>
                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderProcessingStage = () => {
    return (
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center justify-center text-center">
          <RotateCw className="h-12 w-12 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-medium mb-2">Processing Your Document</h3>
          <p className="text-muted-foreground max-w-md">
            We're extracting data from your document. This may take a moment depending on the document size and complexity.
          </p>
        </div>
        
        <div className="space-y-2 max-w-md mx-auto">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Extracting data...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        
        <div className="space-y-4 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${progress >= 30 ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={progress >= 30 ? "text-foreground" : "text-muted-foreground"}>
              Document uploaded
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${progress >= 60 ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={progress >= 60 ? "text-foreground" : "text-muted-foreground"}>
              Document analyzed
            </span>
          </div>
          <div className="flex items-center gap-2">
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
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">Document Processed Successfully</h3>
          <p className="text-muted-foreground max-w-md">
            Your document has been processed and the data has been extracted. You can now review and verify the extracted information.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-center justify-center mt-6">
          <Button onClick={handleGoToReview} className="w-full max-w-xs">
            Review Extracted Data
          </Button>
          <Button variant="outline" onClick={handleReset} className="w-full max-w-xs">
            Upload Another Document
          </Button>
        </div>
      </div>
    );
  };

  const renderErrorStage = () => {
    return (
      <div className="space-y-6 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "There was an error processing your document. Please try again."}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={handleReset}>
            Try Again
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (uploadStage) {
      case UploadStage.UPLOAD:
        return renderUploadStage();
      case UploadStage.PROCESSING:
        return renderProcessingStage();
      case UploadStage.COMPLETE:
        return renderCompleteStage();
      case UploadStage.ERROR:
        return renderErrorStage();
      default:
        return renderUploadStage();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
        <p className="text-muted-foreground">
          Upload a document to extract and process its data
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
} 