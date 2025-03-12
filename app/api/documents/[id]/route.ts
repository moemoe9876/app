import { NextResponse } from "next/server";
import { readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { existsSync } from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_ID = "gemini-2.0-flash";

// This is a temporary solution for demo purposes
const UPLOAD_DIR = join(process.cwd(), "uploads");

// Define types for our data structure
interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: PositionData;
}

// More flexible data structure that can handle any type of document
interface ExtractedData {
  [key: string]: FieldData | FieldData[] | { [key: string]: FieldData | FieldData[] };
}

// Metadata about the extraction process
interface ExtractionMetadata {
  timestamp: string;
  model: string;
  prompt: string;
  processingTimeMs: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = id;
    const documentDir = join(UPLOAD_DIR, documentId);
    
    // Check if the document directory exists
    if (!existsSync(documentDir)) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    // Get the file from the document directory
    const files = await readdir(documentDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      return NextResponse.json(
        { error: "No PDF files found for this document" },
        { status: 404 }
      );
    }
    
    const fileName = pdfFiles[0]; // Get the first PDF file
    const filePath = join(documentDir, fileName);
    
    // Check if we already have extracted data
    const extractedDataPath = join(documentDir, "extracted_data.json");
    let extractedData: ExtractedData | null = null;
    let extractionMetadata: ExtractionMetadata | null = null;
    
    if (existsSync(extractedDataPath)) {
      // If we already have extracted data, return it
      const dataBuffer = await readFile(extractedDataPath);
      const parsedData = JSON.parse(dataBuffer.toString());
      extractedData = parsedData.data;
      extractionMetadata = parsedData.metadata;
    } else {
      // Otherwise, extract data from the document
      const startTime = Date.now();
      const fileBuffer = await readFile(filePath);
      const base64 = fileBuffer.toString("base64");
      
      // Check if there's a custom extraction prompt
      const promptPath = join(documentDir, "extraction_prompt.txt");
      let customPrompt = "";
      
      if (existsSync(promptPath)) {
        const promptBuffer = await readFile(promptPath);
        customPrompt = promptBuffer.toString();
      }
      
      // Use Gemini API to extract data
      const model = genAI.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });
      
      // Build the prompt, incorporating the custom prompt if available
      let promptText = "";

      if (customPrompt) {
        promptText = customPrompt;
      } else {
        promptText = "Extract all relevant information from this document.";
      }

      // Add instruction for JSON format but without assuming structure
      promptText += `
        Return the data in valid JSON format. For each extracted field, include:
        - The field value
        - A confidence score between 0 and 1
        - The location in the document as:
          - page_number: The page where the information appears (1-indexed)
          - bounding_box: [x1, y1, x2, y2] coordinates as percentages of page dimensions
            where (x1,y1) is the top-left corner and (x2,y2) is the bottom-right corner

        Example format:
        {
          "field_name": {
            "value": "extracted value",
            "confidence": 0.95,
            "position": {
              "page_number": 1,
              "bounding_box": [10.5, 20.3, 30.2, 25.1]
            }
          },
          "nested_field": {
            "sub_field": {
              "value": "nested value",
              "confidence": 0.8,
              "position": {
                "page_number": 1,
                "bounding_box": [15.2, 35.7, 45.3, 40.1]
              }
            }
          },
          "array_field": [
            {
              "value": "item 1",
              "confidence": 0.9,
              "position": {
                "page_number": 1,
                "bounding_box": [12.3, 50.6, 42.8, 55.2]
              }
            },
            {
              "value": "item 2",
              "confidence": 0.85,
              "position": {
                "page_number": 1,
                "bounding_box": [22.7, 60.1, 52.9, 65.4]
              }
            }
          ]
        }
      `;
      
      try {
        const result = await model.generateContent([
          {
            text: promptText,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64,
            },
          },
        ]);
        
        const response = await result.response;
        // Clean up the response text by removing markdown code block markers
        const cleanText = response.text()
          .replace(/^```json\s*/, '')
          .replace(/^```\s*/, '')
          .replace(/```\s*$/, '')
          .trim();
        
        try {
          extractedData = JSON.parse(cleanText) as ExtractedData;
          
          // Create metadata about the extraction process
          extractionMetadata = {
            timestamp: new Date().toISOString(),
            model: MODEL_ID,
            prompt: promptText,
            processingTimeMs: Date.now() - startTime
          };
          
          // Save the extracted data and metadata for future requests
          await writeFile(
            extractedDataPath, 
            JSON.stringify({
              data: extractedData,
              metadata: extractionMetadata
            })
          );
        } catch (error) {
          console.error("Error parsing extracted data:", error);
          return NextResponse.json(
            { 
              error: "Failed to parse extracted data",
              rawResponse: cleanText 
            },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error("Error generating content:", error);
        return NextResponse.json(
          { error: "Failed to extract data from document" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      documentId,
      fileName,
      extractedData,
      metadata: extractionMetadata
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
} 