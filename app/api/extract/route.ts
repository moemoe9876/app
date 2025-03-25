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
    
    // Add logging for prompt
    console.log("Extraction Prompt Received:", extractionPrompt);
    
    // Parse options with defaults - set includePositions to false by default
    const options: ExtractionOptions = optionsJson 
      ? JSON.parse(optionsJson) 
      : {
          includeConfidence: true,
          includePositions: false,
          detectDocumentType: true,
          temperature: 0.1
        };
    
    console.log("Extraction Options:", JSON.stringify(options));
    
    // Start timing for performance metrics
    const startTime = Date.now();

    // Convert PDF to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: options.temperature ?? 0.0,
        maxOutputTokens: 8192,
        topP: 0.1,
        topK: 40,
      },
    });

    // Build a more flexible and comprehensive prompt
    let prompt = "";
    
    // First phase: Document type detection (if enabled)
    let documentType = null;
    if (options.detectDocumentType) {
      const detectionPrompt = `
        Analyze this document and determine its type (e.g., invoice, receipt, contract, resume, manifest, shipping order, purchase order, business card, email, etc.).
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
    
    // Build the main extraction prompt with improved line item handling
    prompt = `
      Extract ONLY the specific data requested in the prompt below from this document${documentType ? ` (detected as: ${documentType})` : ''}.
      
      USER'S REQUEST: ${extractionPrompt || "Extract all relevant information from this document."}
      
      IMPORTANT INSTRUCTIONS:
      1. Extract ONLY the data explicitly requested in the user's prompt above.
      2. Do NOT extract data that wasn't specifically mentioned in the user's prompt.
      3. For each piece of information you extract, include:
         ${options.includeConfidence ? "- A confidence score between 0 and 1" : ""}
         ${options.includePositions ? "- The location in the document as position data" : ""}
      
      4. For line items or tabular data (if specifically requested in the prompt):
         - Extract these as structured arrays of objects
         - Each line item should be a complete object with all its properties
         - Maintain proper parent-child relationships in the data structure
         - Example structure for line items:
           "line_items": [
             {
               "item_number": { "value": "1", ${options.includeConfidence ? '"confidence": 0.98,' : ''} },
               "description": { "value": "Widget XYZ", ${options.includeConfidence ? '"confidence": 0.95,' : ''} },
               "quantity": { "value": 5, ${options.includeConfidence ? '"confidence": 0.99,' : ''} },
               "unit_price": { "value": 10.99, ${options.includeConfidence ? '"confidence": 0.97,' : ''} },
               "total": { "value": 54.95, ${options.includeConfidence ? '"confidence": 0.96,' : ''} }
             }
           ]
      
      5. For nested information, maintain proper hierarchical structure
      
      Return the data in valid JSON format with this structure for each field:
      {
        "field_name": {
          "value": "extracted value"${options.includeConfidence ? ',\n          "confidence": 0.95' : ''}${options.includePositions ? ',\n          "position": {\n            "page_number": 1,\n            "bounding_box": [10.5, 20.3, 30.2, 25.1]\n          }' : ''}
        }
      }
      
      If a requested field is not found in the document, include it with a null value and low confidence score.
      
      Return ONLY the data in valid JSON format without any markdown code block markers or explanations.
    `;

    console.log("Full Extraction Prompt:", prompt);
    
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
      
      // Add debugging for the extracted data
      console.log("Requested fields:", extractionPrompt);
      console.log("Fields actually extracted:", Object.keys(extractedData));
      
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
