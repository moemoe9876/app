import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

// This is a temporary solution for demo purposes
// In a production environment, you would use a proper storage solution like Firebase Storage
const UPLOAD_DIR = join(process.cwd(), "uploads");

interface ExtractionOptions {
  includeConfidence: boolean;
  includePositions: boolean;
  detectDocumentType: boolean;
  temperature: number;
}

export async function POST(request: Request) {
  try {
    // Ensure the upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error("Error creating upload directory:", error);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileId = formData.get("fileId") as string || uuidv4();
    const extractionPrompt = formData.get("extractionPrompt") as string || "";
    
    console.log("Upload API - File ID:", fileId);
    
    // Get extraction options or use defaults
    let extractionOptions: ExtractionOptions = {
      includeConfidence: true,
      includePositions: false,
      detectDocumentType: true,
      temperature: 0.1
    };
    
    // Parse options if provided
    const optionsJson = formData.get("options") as string;
    if (optionsJson) {
      try {
        extractionOptions = { ...extractionOptions, ...JSON.parse(optionsJson) };
      } catch (error) {
        console.error("Error parsing extraction options:", error);
      }
    }
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Generate a unique ID for the document
    const documentId = uuidv4();
    
    // Create a directory for this document
    const documentDir = join(UPLOAD_DIR, documentId);
    await mkdir(documentDir, { recursive: true });
    
    // Save the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(documentDir, file.name);
    await writeFile(filePath, buffer);
    
    // Save the extraction prompt if provided
    if (extractionPrompt && extractionPrompt.trim()) {
      const promptPath = join(documentDir, "extraction_prompt.txt");
      await writeFile(promptPath, extractionPrompt);
      console.log("Upload API - Saved extraction prompt to file:", promptPath);
    }
    
    // Save extraction options
    const optionsPath = join(documentDir, "extraction_options.json");
    await writeFile(optionsPath, JSON.stringify(extractionOptions, null, 2));
    console.log("Upload API - Saved extraction options to file:", optionsPath);
    
    // In a real application, you would also store metadata in a database
    // For now, we'll just return the document ID
    
    // Process the document with Gemini API (similar to the extract endpoint)
    // This would be done asynchronously in a production environment
    // You would use the extractionPrompt to guide the extraction process
    
    return NextResponse.json({ 
      documentId,
      message: "File uploaded successfully" 
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 