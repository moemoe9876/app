"use client";

import { Button } from "@/components/ui/button";
import { Copy, RotateCcw } from "lucide-react";
import { useState } from "react";

interface ResultDisplayProps {
  result: any;
  onReset: () => void;
}

export function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Extracted Data</h2>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Process Another PDF
          </Button>
        </div>
      </div>

      <pre className="p-4 rounded-lg bg-muted overflow-auto">
        <code className="text-sm">
          {JSON.stringify(result, null, 2)}
        </code>
      </pre>
    </div>
  );
}