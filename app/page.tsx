"use client";
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PromptInput } from "@/components/PromptInput";
import { ResultDisplay } from "@/components/ResultDisplay";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handlePromptSubmit = async (prompt: string) => {
    try {
      // First, get the JSON schema
      setPrompt(prompt);
      const schemaResponse = await fetch("/api/schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const { schema } = await schemaResponse.json();

      setSchema(schema);
      setPrompt(prompt);
      // Then, process the PDF with the schema
      const formData = new FormData();
      formData.append("file", file!);
      formData.append("schema", JSON.stringify(schema));

      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await extractResponse.json();
      setResult(data);
    } catch (error) {
      console.error("Error processing request:", error);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setPrompt("");
    setSchema(null);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-col items-center justify-center ">
          <CardTitle className="flex">
            <FileText className="w-8 h-8 mr-2 text-primary" />
            <h1 className="text-3xl font-bold text-primary">
              PDF to Structured Data
            </h1>
          </CardTitle>
          <span className="text-sm font-mono text-muted-foreground">
            powered by Google DeepMind Gemini 2.0 Flash
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          {!result ? (
            <>
              <FileUpload onFileSelect={handleFileSelect} />
              <PromptInput onSubmit={handlePromptSubmit} file={file} />
            </>
          ) : (
            <ResultDisplay
              result={result}
              schema={schema}
              onReset={handleReset}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
