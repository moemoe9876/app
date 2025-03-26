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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
    const documentFiles = files.filter(file => 
      file.endsWith('.pdf') || 
      file.endsWith('.png') || 
      file.endsWith('.jpg') || 
      file.endsWith('.jpeg')
    );
    
    if (documentFiles.length === 0) {
      return NextResponse.json(
        { error: "No document files found for this document" },
        { status: 404 }
      );
    }
    
    const fileName = documentFiles[0]; // Get the first document file
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
      
      return NextResponse.json({
        documentId,
        fileName,
        extractedData,
        metadata: extractionMetadata
      });
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
        promptText = `USER'S REQUEST: ${customPrompt}

IMPORTANT INSTRUCTIONS:
1. You MUST return ONLY valid JSON. No text explanations.
2. For each field requested, use the following format:
{
  "field_name": {
    "value": "extracted value",
    "confidence": 0.95
  }
}
3. Example: If asked for "name and email", respond with:
{
  "name": {
    "value": "John Smith",
    "confidence": 0.95
  },
  "email": {
    "value": "john@example.com",
    "confidence": 0.9
  }
}

Please extract the following fields from the document and return them as JSON:
${customPrompt}`;

        console.log("Using enhanced prompt for extraction:", promptText);
      } else {
        promptText = "Extract all relevant information from this document and return as JSON.";
        console.log("No custom prompt found, using default extraction instructions");
      }
      
      try {
        // Use Gemini API to extract data
        let result;
        try {
          result = await model.generateContent([
            {
              text: promptText,
            },
            {
              inlineData: {
                mimeType: fileName.endsWith('.pdf') ? "application/pdf" : 
                          (fileName.endsWith('.png') ? "image/png" : 
                          (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? "image/jpeg" : "application/octet-stream")),
                data: base64,
              },
            },
          ]);
        } catch (apiError) {
          console.error("Error calling Gemini API:", apiError);
          
          // Check for specific API errors
          const errorMessage = (apiError as Error)?.message || "Unknown API error";
          
          if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
            return NextResponse.json(
              { error: "AI service quota exceeded. Please try again later.", details: errorMessage },
              { status: 429 }
            );
          } else if (errorMessage.includes("permission") || errorMessage.includes("access")) {
            return NextResponse.json(
              { error: "API access permission issue. Check your API key configuration.", details: errorMessage },
              { status: 403 }
            );
          } else {
            return NextResponse.json(
              { error: "Error calling the AI service", details: errorMessage },
              { status: 500 }
            );
          }
        }
        
        const response = result.response;
        const extractedText = response.text();
        
        // Add detailed logging for debugging
        console.log("====== AI RESPONSE START ======");
        console.log(extractedText.substring(0, 200) + (extractedText.length > 200 ? "..." : ""));
        console.log("====== AI RESPONSE END ======");
        
        // Create metadata about the extraction process
        extractionMetadata = {
          timestamp: new Date().toISOString(),
          model: MODEL_ID,
          prompt: promptText,
          processingTimeMs: Date.now() - startTime,
          options: extractionOptions
        };
        
        // Parse the extracted data
        try {
          // Clean up the response text by removing markdown code block markers
          const cleanText = extractedText
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/```\s*$/, '')
            .trim();
            
            console.log("====== CLEAN TEXT START ======");
            console.log(cleanText.substring(0, 200) + (cleanText.length > 200 ? "..." : ""));
            console.log("====== CLEAN TEXT END ======");
            
            // Additional check - if the text doesn't start with '{', attempt to convert to JSON
            if (!cleanText.trim().startsWith('{')) {
              console.log("Response is not in JSON format, attempting to format it");
              
              // Attempt to convert simple text format to JSON
              try {
                const lines = cleanText.split('\n');
                const formattedData: Record<string, any> = {};
                
                for (const line of lines) {
                  const colonIndex = line.indexOf(':');
                  if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
                    const value = line.substring(colonIndex + 1).trim();
                    
                    if (key && value) {
                      formattedData[key] = {
                        value: value,
                        confidence: 0.8 // Default confidence
                      };
                    }
                  }
                }
                
                if (Object.keys(formattedData).length > 0) {
                  console.log("Converted text to JSON format:", JSON.stringify(formattedData).substring(0, 200));
                  extractedData = formattedData as ExtractedData;
                } else {
                  throw new Error("Could not parse text into structured data");
                }
              } catch (conversionError) {
                console.error("Failed to convert text to JSON:", conversionError);
                throw new Error("Response is not in valid JSON format and conversion failed");
              }
            } else {
              // Original JSON parsing attempt
              extractedData = JSON.parse(cleanText) as ExtractedData;
            }
          
          // Save the extracted data and metadata for future requests
          await writeFile(
            extractedDataPath, 
            JSON.stringify({
              data: extractedData,
              metadata: extractionMetadata
            })
          );
          
          return NextResponse.json({
            documentId,
            fileName,
            extractedData,
            metadata: extractionMetadata
          });
        } catch (error) {
          console.error("Error parsing extracted data:", error);
          
          // Provide a more helpful error response with original text for debugging
          const responsePreview = extractedText.substring(0, 200) + (extractedText.length > 200 ? "..." : "");
          
          return NextResponse.json(
            { 
              error: "Failed to parse extracted data",
              details: (error as Error)?.message || "Unknown error",
              suggestion: "The AI response wasn't in the expected JSON format. Try making your prompt more specific, e.g. 'Find the invoice number and total amount'.",
              responsePreview: responsePreview,
              rawResponse: extractedText.length < 1000 ? extractedText : undefined // Only include if not too large
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
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to extract data from document" },
      { status: 500 }
    );
  }
}