import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_ID = "gemini-2.0-flash";

interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
}

interface FieldData {
  value: string | number;
  confidence?: number;
  position?: PositionData;
}

interface ExtractionOptions {
  includeConfidence?: boolean;
  includePositions?: boolean;
  detectDocumentType?: boolean;
  temperature?: number;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const extractionPrompt = formData.get("extractionPrompt") as string;
    const optionsJson = formData.get("options") as string;
    
    // Parse options with defaults
    const options: ExtractionOptions = optionsJson 
      ? JSON.parse(optionsJson) 
      : {
          includeConfidence: true,
          includePositions: true,
          detectDocumentType: true,
          temperature: 0.1
        };
    
    // Start timing for performance metrics
    const startTime = Date.now();

    // Convert PDF to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: options.temperature ?? 0.1,
        maxOutputTokens: 4096, // Increased for more detailed extraction
      },
    });

    // Build a more flexible and comprehensive prompt
    let prompt = "";
    
    // First phase: Document type detection (if enabled)
    let documentType = null;
    if (options.detectDocumentType) {
      const detectionPrompt = `
        Analyze this document and determine its type (e.g., invoice, receipt, contract, resume, etc.).
        Return only the document type as a single word or short phrase, without any additional text.
      `;
      
      try {
        const detectionResult = await model.generateContent([
          { text: detectionPrompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64,
            },
          },
        ]);
        
        documentType = detectionResult.response.text().trim();
        console.log(`Detected document type: ${documentType}`);
      } catch (error) {
        console.error("Error detecting document type:", error);
        // Continue with extraction even if type detection fails
      }
    }
    
    // Build the main extraction prompt
    prompt = `
      Extract structured data from the following document${documentType ? ` (detected as: ${documentType})` : ''}.
      
      ${extractionPrompt || "Extract all relevant information from this document."}
      
      For each piece of information you extract, include:
      ${options.includeConfidence ? "- A confidence score between 0 and 1" : ""}
      ${options.includePositions ? "- The location in the document as:\n        - page_number: The page where the information appears (1-indexed)\n        - bounding_box: [x1, y1, x2, y2] coordinates as percentages of page dimensions\n          where (x1,y1) is the top-left corner and (x2,y2) is the bottom-right corner" : ""}
      
      Return the data in valid JSON format with this structure for each field:
      {
        "field_name": {
          "value": "extracted value"${options.includeConfidence ? ',\n          "confidence": 0.95' : ''}${options.includePositions ? ',\n          "position": {\n            "page_number": 1,\n            "bounding_box": [10.5, 20.3, 30.2, 25.1]\n          }' : ''}
        },
        // For nested fields
        "section_name": {
          "field1": { 
            "value": "nested value"${options.includeConfidence ? ',\n            "confidence": 0.9' : ''}${options.includePositions ? ',\n            "position": {\n              "page_number": 1,\n              "bounding_box": [15.2, 35.7, 45.3, 40.1]\n            }' : ''}
          }
        },
        // For array fields
        "items": [
          {
            "item_field": {
              "value": "item value"${options.includeConfidence ? ',\n              "confidence": 0.85' : ''}${options.includePositions ? ',\n              "position": {\n                "page_number": 1,\n                "bounding_box": [12.3, 50.6, 42.8, 55.2]\n              }' : ''}
            }
          }
        ]
      }
      
      Return the data in valid JSON format without any markdown code block markers.
    `;

    // Execute the extraction
    const result = await model.generateContent([
      { text: prompt },
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
      .replace(/^```json\s*/, '')  // Remove opening ```json
      .replace(/^```\s*/, '')      // Remove opening ``` without json
      .replace(/```\s*$/, '')      // Remove closing ```
      .trim();                     // Remove any extra whitespace

    try {
      const extractedData = JSON.parse(cleanText);
      
      // Create metadata about the extraction process
      const metadata = {
        timestamp: new Date().toISOString(),
        model: MODEL_ID,
        documentType: documentType,
        prompt: extractionPrompt || "General extraction",
        processingTimeMs: Date.now() - startTime,
        options
      };
      
      return NextResponse.json({
        data: extractedData,
        metadata
      });
    } catch (parseError) {
      console.error("Error parsing extracted data:", parseError);
      return NextResponse.json(
        { 
          error: "Failed to parse extracted data",
          rawResponse: cleanText 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error extracting data:", error);
    return NextResponse.json(
      { error: "Failed to extract data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
