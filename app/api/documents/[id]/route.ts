import { NextResponse } from "next/server";
import { readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { existsSync } from "fs";

// Check if API key exists before initializing
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
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
  options?: {
    includeConfidence?: boolean;
    includePositions?: boolean;
    detectDocumentType?: boolean;
    temperature?: number;
  };
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
        try {
          const promptBuffer = await readFile(promptPath);
          customPrompt = promptBuffer.toString().trim();
          
          if (customPrompt) {
            console.log("Retrieved custom prompt from file:", customPrompt);
          }
        } catch (error) {
          console.error("Error reading custom prompt:", error);
        }
      } else {
        console.log("No custom prompt file found at:", promptPath);
      }
      
      // Check for extraction options
      const optionsPath = join(documentDir, "extraction_options.json");
      let extractionOptions = {
        includeConfidence: true,
        includePositions: false,
        detectDocumentType: true,
        temperature: 0.1
      };
      
      if (existsSync(optionsPath)) {
        try {
          const optionsBuffer = await readFile(optionsPath);
          extractionOptions = JSON.parse(optionsBuffer.toString());
        } catch (error) {
          console.error("Error parsing extraction options:", error);
          // Continue with defaults
        }
      }
      
      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: "Gemini API key is not configured. Please add a valid API key to your .env.local file." },
          { status: 500 }
        );
      }

      // Check if genAI is properly initialized
      if (!genAI) {
        return NextResponse.json(
          { error: "Failed to initialize Gemini AI client. Please check your API key." },
          { status: 500 }
        );
      }
      
      // Use Gemini API to extract data
      const model = genAI.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          temperature: extractionOptions.temperature || 0.0,
          maxOutputTokens: 4096,
          topP: 0.1,
          topK: 40,
        },
      });
      
      // Build the prompt, incorporating the custom prompt if available
      let promptText = "";

      if (customPrompt) {
        promptText = `USER'S REQUEST: ${customPrompt}`;

        console.log("Using custom prompt for extraction:", customPrompt);
      } else {
        promptText = "Extract all relevant information from this document.";
        console.log("No custom prompt found, using default extraction instructions");
      }

      // Add instruction for JSON format but without assuming structure
      promptText += `
        
        IMPORTANT INSTRUCTIONS:
        1. Extract ONLY the data explicitly requested in the user's prompt above.
        2. Do NOT extract data that wasn't specifically mentioned in the user's prompt.
        3. STRICT ENFORCEMENT: If the user requests specific fields like "sender" or "invoice_number", 
           extract ONLY those fields and nothing else. DO NOT extract additional fields like "route" 
           or "delivery date" unless they were explicitly requested.
           
           IMPORTANT: A request to extract "name of sender" should ONLY result in a "sender" field.
           IMPORTANT: A request to extract "invoice details" should NOT extract unrelated fields like "salesperson".
           
        4. For each extracted field, include:
          - The field value
          ${extractionOptions.includeConfidence !== false ? "- A confidence score between 0 and 1" : ""}
          ${extractionOptions.includePositions ? `- The location in the document as:
            - page_number: The page where the information appears (1-indexed)
            - bounding_box: [x1, y1, x2, y2] coordinates as percentages of page dimensions
              where (x1,y1) is the top-left corner and (x2,y2) is the bottom-right corner` : ""}
        
        5. If a requested field is not found in the document, include it with a null value and low confidence score.
        
        6. For line items or tabular data (if specifically requested in the prompt):
          - Extract these as structured arrays of objects
          - Ensure each line item is a complete object with all its properties
          - DO NOT use objects with [object Object] notation
          - Use proper array syntax with each item as a discrete object with key-value pairs
          - ALWAYS structure tabular data as an array where each row is an object with named fields
          - Example for table data:
            "table": [
              { "column1": { "value": "row1value1", "confidence": 0.9 }, "column2": { "value": "row1value2", "confidence": 0.95 } },
              { "column1": { "value": "row2value1", "confidence": 0.9 }, "column2": { "value": "row2value2", "confidence": 0.95 } }
            ]
          - Maintain proper parent-child relationships

        Example format:
        {
          "field_name": {
            "value": "extracted value"${extractionOptions.includeConfidence !== false ? ',\n            "confidence": 0.95' : ""}${extractionOptions.includePositions ? ',\n            "position": {\n              "page_number": 1,\n              "bounding_box": [10.5, 20.3, 30.2, 25.1]\n            }' : ""}
          }
        }

        Return ONLY the data in valid JSON format without any markdown code block markers or explanations.
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
          
          // Add debugging for the extracted data
          console.log("Custom prompt used:", customPrompt);
          console.log("Fields actually extracted:", Object.keys(extractedData));
          
          // Validate that the extracted fields match the requested fields
          if (customPrompt) {
            // A simple check to log if fields seem unrelated to prompt
            const promptWords = customPrompt.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(word => word.length > 3); // Filter out short words
            
            const extractedFields = Object.keys(extractedData)
              .map(field => field.toLowerCase());
            
            const unexpectedFields = extractedFields.filter(field => 
              !promptWords.some(word => field.includes(word) || word.includes(field))
            );
            
            if (unexpectedFields.length > 0) {
              console.warn("Warning: Potential fields extracted that weren't in prompt:", unexpectedFields);
              
              // Post-processing to filter out fields not in prompt
              // Only do this if there's a custom prompt
              const filteredData: ExtractedData = {};
              
              Object.entries(extractedData).forEach(([key, value]) => {
                const keyLower = key.toLowerCase();
                // Special case for 'table' - always keep if it was explicitly extracted
                if (key === 'table' || promptWords.some(word => 
                    keyLower.includes(word) || 
                    word.includes(keyLower) ||
                    // Handle common variations
                    (keyLower === 'sender' && promptWords.includes('from')) ||
                    (keyLower === 'recipient' && promptWords.includes('to')) ||
                    // Check if the prompt contains words like "line items" or "table"
                    ((keyLower === 'table' || keyLower === 'items' || keyLower === 'line_items') && 
                     (promptWords.includes('table') || promptWords.includes('items')))
                  )) {
                  filteredData[key] = value;
                }
              });
              
              if (Object.keys(filteredData).length > 0) {
                console.log("After filtering, kept fields:", Object.keys(filteredData));
                extractedData = filteredData;
              }
            }
          }
          
          // Create metadata about the extraction process
          extractionMetadata = {
            timestamp: new Date().toISOString(),
            model: MODEL_ID,
            prompt: promptText,
            processingTimeMs: Date.now() - startTime,
            options: extractionOptions
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
          { error: "Failed to extract data from document", details: (error as Error)?.message || "Unknown error" },
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
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to extract data from document" },
      { status: 500 }
    );
  }
} 