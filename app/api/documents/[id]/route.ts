import { NextResponse } from "next/server";
import { join } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDocument, getFile, saveFile } from "lib/firebase/admin";

// Check if API key exists before initializing
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const MODEL_ID = "gemini-2.0-flash";

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
  document_type?: FieldData;
  [key: string]: FieldData | FieldData[] | { [key: string]: FieldData | FieldData[] } | undefined;
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

// Helper function to get MIME type from filename
const getMimeType = (fileName: string): string => {
  if (fileName.endsWith('.pdf')) return "application/pdf";
  if (fileName.endsWith('.png')) return "image/png";
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return "image/jpeg";
  return "application/octet-stream";
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const documentId = id;
    
    // Get document metadata from Firestore
    const documentData = await getDocument("documents", documentId);
    
    if (!documentData) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    const storagePath = documentData.storagePath;
    const fileName = documentData.fileName;
    
    // Check if we already have extracted data
    const extractedDataStoragePath = `user_uploads/${documentData.userId}/${documentId}/extracted_data.json`;
    let extractedData: ExtractedData | null = null;
    let extractionMetadata: ExtractionMetadata | null = null;
    
    try {
      // Try to get extracted data if it exists
      const extractedDataBuffer = await getFile(extractedDataStoragePath);
      
      if (extractedDataBuffer) {
        const parsedData = JSON.parse(extractedDataBuffer.toString());
        extractedData = parsedData.data;
        extractionMetadata = parsedData.metadata;
        
        return NextResponse.json({
          documentId,
          fileName,
          extractedData,
          metadata: extractionMetadata
        });
      }
    } catch (error) {
      // Extracted data doesn't exist, proceed with extraction
      console.log("No extracted data found, proceeding with extraction", error);
    }
    
    // Otherwise, extract data from the document
    const startTime = Date.now();
    const fileBuffer = await getFile(storagePath);
    
    if (!fileBuffer) {
      return NextResponse.json(
        { error: "Document file not found in storage" },
        { status: 404 }
      );
    }
    
    const base64 = fileBuffer.toString("base64");
    
    // Get custom extraction prompt from document data if available
    let customPrompt = documentData.extractionPrompt || "";
    
    // Use extraction options from document data if available
    let extractionOptions = documentData.extractionOptions || {
      includeConfidence: true,
      includePositions: false,
      detectDocumentType: true,
      temperature: 0.1
    };
      
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
          temperature: extractionOptions.temperature || 0.1,
          maxOutputTokens: 4096,
          topP: 0.1,
          topK: 40,
        },
      });
      
      // Build the prompt, incorporating the custom prompt if available
      const documentTypeDetection = extractionOptions.detectDocumentType 
        ? "First identify the document type (e.g., receipt, invoice, business card, Manifest, purchase order, email, contract) and include it in a 'document_type' field." 
        : "";
      
      const promptText = customPrompt 
        ? `USER'S REQUEST: ${customPrompt}

IMPORTANT INSTRUCTIONS:
1. You MUST return ONLY valid JSON with no text explanations.
2. ${documentTypeDetection}
3. For multi-entry fields such as "line items", "products", "transactions", etc., ALWAYS structure them as ARRAYS of OBJECTS, where each object represents one entry with its own subfields. Example:
   "line_items": [
     {
       "description": {"value": "Item 1", "confidence": 0.95},
       "quantity": {"value": 2, "confidence": 0.95},
       "price": {"value": 10.00, "confidence": 0.95}
     },
     {
       "description": {"value": "Item 2", "confidence": 0.9},
       "quantity": {"value": 1, "confidence": 0.9},
       "price": {"value": 15.00, "confidence": 0.9}
     }
   ]
4. For regular fields, use the format:
   "field_name": {
     "value": "extracted value",
     "confidence": 0.95
   }
5. Identify the document structure (tables, lists) and extract repeating patterns accordingly.
6. If the field contains multiple distinct entries (e.g., line items in an invoice), always return them as separate objects in an array, not as a single concatenated string.

Please extract the following fields from the document and return them as JSON:
${customPrompt}`
        : `Extract all relevant information from this document and return as JSON.

IMPORTANT INSTRUCTIONS:
1. ${documentTypeDetection}
2. For multi-entry fields such as "line items", "products", "transactions", etc., ALWAYS structure them as ARRAYS of OBJECTS, where each object represents one entry with its own subfields. Example:
   "line_items": [
     {
       "description": {"value": "Item 1", "confidence": 0.95},
       "quantity": {"value": 2, "confidence": 0.95},
       "price": {"value": 10.00, "confidence": 0.95}
     },
     {
       "description": {"value": "Item 2", "confidence": 0.9},
       "quantity": {"value": 1, "confidence": 0.9},
       "price": {"value": 15.00, "confidence": 0.9}
     }
   ]
3. For regular fields, use the format:
   "field_name": {
     "value": "extracted value",
     "confidence": 0.95
   }
4. Identify the document type and extract fields appropriate for that type:
   - Receipts: merchant, date, items, total, payment method, tax
   - Invoices: sender/recipient details, invoice number, date, line items, subtotal, tax, total
   - Business Cards: name, title, company, contact info, social media
   - Manifests: sender/recipient, items, quantities, weights, tracking numbers
   - Purchase Orders: buyer/seller details, PO number, date, line items, total
   - Emails: sender, recipient, subject, date, body
   - Contracts: parties involved, dates, terms, clauses, signatures`;
      
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
                mimeType: getMimeType(fileName),
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
            
          // Additional check - if the text doesn't start with '{', attempt to convert to JSON
          if (!cleanText.trim().startsWith('{')) {
            console.error("Response is not in JSON format:", cleanText.substring(0, 200));
            
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
            const parsedData = JSON.parse(cleanText) as ExtractedData;
            
            // Post-process the data to ensure line items are properly structured
            extractedData = parsedData;
            
            // Process any string-valued line items into proper arrays of objects
            Object.keys(parsedData).forEach(key => {
              // Check for any field that might contain multiple items
              if ((key.includes('item') || key.includes('product') || key.includes('line')) && 
                  parsedData[key] && 
                  typeof parsedData[key] === 'object' && 
                  'value' in (parsedData[key] as FieldData)) {
                
                const fieldData = parsedData[key] as FieldData;
                const value = fieldData.value;
                
                // If the value is a string that appears to contain multiple items
                if (typeof value === 'string' && value.includes('\n')) {
                  const items = value.split('\n').filter(item => item.trim().length > 0);
                  
                  if (items.length > 1) {
                    // Convert to array of objects with proper FieldData structure
                    const structuredItems = items.map(item => ({
                      value: item.trim(),
                      confidence: fieldData.confidence || 0.8
                    })) as FieldData[];
                    
                    // Replace the string value with the array of objects
                    if (extractedData) {
                      extractedData[key] = structuredItems;
                    }
                  }
                }
              }
            });
          }
          
          // Save the extracted data and metadata to Firebase Storage
          await saveFile(
            extractedDataStoragePath,
            Buffer.from(JSON.stringify({
              data: extractedData,
              metadata: extractionMetadata
            })),
            { contentType: 'application/json' }
          );
          
          // Update document status in Firestore
          await getDocument("documents", documentId, {
            status: "completed",
            extractedDataStoragePath: extractedDataStoragePath,
            updatedAt: new Date().toISOString()
          });
          
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
              suggestion: "The AI response wasn't in the expected JSON format. Try making your prompt more specific.",
              responsePreview: responsePreview
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
      { error: "Failed to extract data from document", details: (error as Error)?.message || "Unknown error" },
      { status: 500 }
    );
  }
}