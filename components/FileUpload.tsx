"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { Upload as UploadIcon, File as FileIcon, X } from "lucide-react";
import PdfViewer from "./PdfViewer";
import { PromptInput } from "./PromptInput";

interface ExtractionOptions {
  includeConfidence: boolean;
  includePositions: boolean;
  detectDocumentType: boolean;
  temperature: number;
}

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onPromptChange?: (prompt: string, options: ExtractionOptions) => void;
  initialPrompt?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

export function FileUpload({ onFileSelect, onPromptChange, initialPrompt = "" }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
      setFile(file);
    },
    [onFileSelect]
  );

  const handlePromptSubmit = (prompt: string, options: ExtractionOptions) => {
    if (onPromptChange) {
      onPromptChange(prompt, options);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  return (
    <div className="w-full space-y-6">
      <div className={`min-h-[150px] mb-7`}>
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`min-h-[170px] p-6 rounded-lg
            ${isDragActive ? "bg-secondary/50" : "bg-secondary"}
            transition-colors duration-200 ease-in-out hover:bg-secondary/50
            border-2 border-dashed border-secondary
            cursor-pointer flex items-center justify-center gap-4
          `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-row items-center">
              <UploadIcon className="w-10 h-10 text-primary mr-4 flex-shrink-0" />
              <div className="">
                <p className="text-base font-medium text-foreground mb-1">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 100MB
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex my-auto flex-row items-center p-5 rounded-lg bg-secondary">
            <FileIcon className="w-9 h-9 text-primary mr-4 flex-shrink-0" />
            <div className="flex-grow min-w-0">
              <p className="text-base font-medium truncate text-foreground mb-1">
                {selectedFile?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile?.size ?? 0)}
              </p>
            </div>
            {file && <PdfViewer file={file} />}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
              className="flex-shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        )}
      </div>

      <PromptInput 
        file={selectedFile} 
        onSubmit={handlePromptSubmit} 
      />
    </div>
  );
}
