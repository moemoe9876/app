"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.size <= 100 * 1024 * 1024) { // 100MB limit
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          onFileSelect(file);
        }
      }, 50);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12
          transition-colors duration-200 ease-in-out
          ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
          hover:border-primary hover:bg-primary/5
          cursor-pointer
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="w-12 h-12 text-primary" />
          <div className="text-center">
            <p className="text-lg font-medium">Drop your PDF here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-2">Maximum file size: 100MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}