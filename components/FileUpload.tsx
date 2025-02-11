"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { Upload as UploadIcon, File as FileIcon, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
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

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  return (
    <div className={`"w-full min-h-[150px] `}>
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`min-h-[150px] p-4 rounded-lg
          ${isDragActive ? "bg-blue-500/15" : "border-border"}
          transition-colors duration-200 ease-in-out hover:bg-blue-500/15
          bg-background
          cursor-pointer flex items-center justify-center gap-4
        `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-row items-center">
            <UploadIcon className="w-8 h-8 text-blue-500 mr-3 flex-shrink-0" />
            <div className="">
              <p className="text-sm font-medium">
                Drop your PDF here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 100MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex my-auto flex-row items-center p-4 rounded-lg">
          <FileIcon className="w-8 h-8 text-blue-500 mr-3 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile?.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile?.size ?? 0)}
            </p>
          </div>
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
  );
}
