"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="prompt" className="text-lg font-medium">
          What data would you like to extract?
        </label>
        <p className="text-sm text-muted-foreground">
          Describe the structure and type of data you want to extract from the PDF.
        </p>
      </div>

      <Textarea
        id="prompt"
        placeholder="Example: Extract all invoice details including invoice number, date, items, prices, and total amount..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[150px]"
      />

      <Button type="submit" disabled={!prompt.trim()} className="w-full">
        <Wand2 className="w-4 h-4 mr-2" />
        Generate Structure
      </Button>
    </form>
  );
}