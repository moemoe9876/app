// app/api/extract/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
  // Optionally, throw an error during server startup or handle appropriately
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_ID = "gemini-2.0-flash"; // Or consider "gemini-1.5-flash" if available and needed

interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
}

interface FieldData {
  value: string | number | null; // Allow null for not found fields
  confidence?: number;
  position?: PositionData;
}

// Allow for nested structures and arrays more explicitly
type ExtractedValue = FieldData | ExtractedValue[] | { [key: string]: ExtractedValue };

interface ExtractedData {
    [key: string]: ExtractedValue;
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

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("Extraction Prompt Received:", extractionPrompt || "<Default: Extract All>");
    console.log("Uploaded File:", file.name, file.type, file.size);

    // Parse options with defaults
    const options: ExtractionOptions = {
      includeConfidence: true, // Default to true
      includePositions: false, // Default to false
      detectDocumentType: true, // Default to true
      temperature: 0.1,       // Default temperature
      ...(optionsJson ? JSON.parse(optionsJson) : {}) // Merge provided options
    };

    console.log("Effective Extraction Options:", JSON.stringify(options));

    const startTime = Date.now();

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: options.temperature ?? 0.1, // Use default if undefined
        maxOutputTokens: 8192, // Keep max tokens high
        // Consider adjusting topP/topK if needed, but defaults are often fine
        // topP: 0.95,
        // topK: 40,
        // IMPORTANT: Ensure response format is JSON
        responseMimeType: "application/json",
      },
      // Safety settings can sometimes interfere with complex JSON output, adjust if necessary
      // safetySettings: [
      //   { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      //   // Add others if needed, but be cautious
      // ]
    });

    // --- Document Type Detection (Optional but Recommended) ---
    let documentType: string | null = null;
    if (options.detectDocumentType) {
      const detectionPrompt = `Analyze the content and layout of this document. What is its primary type? Examples: Invoice, Receipt, Purchase Order, Packing Slip, Manifest, Contract, Resume, Business Card, Email, Report, Form. Respond with ONLY the document type name.`;
      try {
        // Use a model optimized for quick classification if possible, or the same model
        const detectionModel = genAI.getGenerativeModel({ model: MODEL_ID, generationConfig: { temperature: 0.0, maxOutputTokens: 50, responseMimeType: "text/plain" } });
        const detectionResult = await detectionModel.generateContent([
          { text: detectionPrompt },
          { inlineData: { mimeType: file.type, data: base64 } },
        ]);
        documentType = detectionResult.response.text().trim().replace(/[^a-zA-Z0-9\s-]/g, ''); // Sanitize
        console.log(`Detected document type: ${documentType || 'Unknown'}`);
      } catch (error) {
        console.warn("Warning: Error detecting document type:", error instanceof Error ? error.message : error);
        // Continue extraction even if type detection fails
      }
    }

    // --- Build Enhanced Extraction Prompt ---
    const userRequest = extractionPrompt || "Extract all key information and line items/table data found in the document.";
    const confidenceInstruction = options.includeConfidence ? "- A 'confidence' score (0.0 to 1.0) indicating certainty." : "";
    const positionInstruction = options.includePositions ? "- 'position' data ('page_number', 'bounding_box' [x1, y1, x2, y2 percentages]) if available." : "";
    const fieldStructureExample = `{
          "value": "extracted value"${options.includeConfidence ? ',\n          "confidence": 0.95' : ''}${options.includePositions ? ',\n          "position": {\n            "page_number": 1,\n            "bounding_box": [10.5, 20.3, 30.2, 25.1]\n          }' : ''}
        }`;

    const prompt = `
      Analyze the following document${documentType ? ` (likely a ${documentType})` : ''}.
      Your goal is to extract specific data based on the user's request and structure it as valid JSON.

      USER'S REQUEST:
      "${userRequest}"

      EXTRACTION & FORMATTING RULES (Follow Strictly):

      1.  **Scope:** Extract ONLY the data fields explicitly mentioned or implied by the USER'S REQUEST. If the request is general (e.g., "extract all"), identify and extract common key fields relevant to the document type. Do NOT add extra fields not requested.
      2.  **JSON Output:** Respond ONLY with a single, valid JSON object. Do NOT include any text before or after the JSON, and do not use markdown backticks (\`\`\`).
      3.  **Field Structure:** For each extracted field, use the following JSON structure:
          \`\`\`json
          "field_name_in_snake_case": ${fieldStructureExample}
          \`\`\`
          ${confidenceInstruction ? `\n          ${confidenceInstruction}` : ''}
          ${positionInstruction ? `\n          ${positionInstruction}` : ''}
      4.  **LINE ITEMS STRUCTURE - YOUR TOP PRIORITY:**
          *   ALWAYS extract line items as individual objects in an array - NEVER as one string
          *   ABSOLUTELY FORBIDDEN: \`"line_items": { "value": "item1, item2, item3", "confidence": 0.9 }\`
          *   ALWAYS REQUIRED: \`"line_items": [ {object1}, {object2}, {object3} ]\`
          
          If you see multiple products or line items like "123456 - PRODUCT NAME", split each into its own object:
            \`\`\`json
            "line_items": [
              {
                "product_code": { "value": "123456", "confidence": 0.98 },
                "description": { "value": "PRODUCT NAME", "confidence": 0.95 }
              },
              {
                "product_code": { "value": "789012", "confidence": 0.98 },
                "description": { "value": "ANOTHER PRODUCT", "confidence": 0.95 }
              }
            ]
            \`\`\`
      5.  **Not Found:** If a specifically requested field cannot be found in the document, include its key in the JSON with a \`value\` of \`null\` and, if confidence is enabled, a low \`confidence\` score (e.g., 0.1).
          \`\`\`json
          "requested_but_missing_field": { "value": null${options.includeConfidence ? ', "confidence": 0.1' : ''} }
          \`\`\`
      6.  **Hierarchy:** If the data has a natural hierarchy (e.g., sender address with street, city, zip), represent it using nested JSON objects.
          \`\`\`json
          "sender_address": {
            "street": { "value": "123 Main St", "confidence": 0.98 },
            "city": { "value": "Anytown", "confidence": 0.97 },
            "zip_code": { "value": "12345", "confidence": 0.96 }
          }
          \`\`\`

      Now, analyze the document and provide the extracted data according to the USER'S REQUEST and these rules.
    `;

    // console.log("----- Full Extraction Prompt -----"); // Optional: Log full prompt for debugging
    // console.log(prompt);
    // console.log("---------------------------------");

    // --- Execute Extraction ---
    const result = await model.generateContent([
      // System Instruction (Optional but can sometimes help reinforce rules)
      // { text: "You are an expert data extraction AI. Follow all formatting rules precisely. Respond ONLY with valid JSON." },
      { text: prompt },
      { inlineData: { mimeType: file.type, data: base64 } }
    ]);

    const response = await result.response;
    const responseText = response.text(); // Get raw text first

    // --- Response Processing & Validation ---
    let extractedData: ExtractedData;
    try {
        // Basic cleanup (already done by Gemini with responseMimeType, but good fallback)
       const cleanText = responseText
         .replace(/^```json\s*/, '')
         .replace(/^```\s*/, '')
         .replace(/```\s*$/, '')
         .trim();

      if (!cleanText) {
          throw new Error("AI returned an empty response.");
      }

      extractedData = JSON.parse(cleanText); // Parse the cleaned JSON string

      // Post-process line items to ensure proper structure
      const processLineItems = (data: any, path = '') => {
        if (!data || typeof data !== 'object') return data;
        
        // For diagnostic logging
        console.log(`Processing path: ${path || 'root'}, type: ${Array.isArray(data) ? 'array' : 'object'}`);
        
        // Process each property
        Object.keys(data).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Look for common line item field names (expanded list)
          const isLineItemField = /items|products|details|lines|rows|entries|list/i.test(key);
          
          console.log(`Checking field: ${currentPath}, isLineItemField: ${isLineItemField}, type: ${typeof data[key]}, isArray: ${Array.isArray(data[key])}`);
          
          // If this is a line item field, log its structure in detail
          if (isLineItemField) {
            console.log(`Line item field found at ${currentPath}:`, JSON.stringify(data[key]).substring(0, 500));
          }
          
          // Check if this is a line item field and not already an array
          if (isLineItemField && data[key] && !Array.isArray(data[key])) {
            console.log(`Non-array line item found at ${currentPath}. Converting to structured array.`);
            
            // If it's a field with value property (direct string)
            if (typeof data[key] === 'object' && 'value' in data[key]) {
              const content = data[key].value;
              const confidence = data[key].confidence || 0.9;
              const position = data[key].position;
              
              console.log(`Line item value type: ${typeof content}, content: ${typeof content === 'string' ? content.substring(0, 100) : 'non-string'}`);
              
              // Only process strings
              if (typeof content === 'string') {
                // Try multiple splitting patterns
                let items: string[] = [];
                
                // First try to split by typical line item separators
                items = content.split(/,(?![^(]*\))|;|\n/).map(item => item.trim()).filter(Boolean);
                
                // If we only got one item, try more aggressive splitting
                if (items.length <= 1 && content.length > 30) {
                  // Look for product number patterns like "123456 - "
                  const productPattern = /(\d+[\s-]+[A-Z])/g;
                  const matches = content.match(productPattern);
                  
                  if (matches && matches.length > 1) {
                    console.log(`Using product number pattern splitting, found ${matches.length} potential product numbers`);
                    
                    // Use the product numbers as split points
                    items = [];
                    let startIndex = 0;
                    
                    // For each product pattern found after the first one, split at that point
                    for (let i = 1; i < matches.length; i++) {
                      const matchIndex = content.indexOf(matches[i], startIndex);
                      if (matchIndex > startIndex) {
                        items.push(content.substring(startIndex, matchIndex).trim());
                        startIndex = matchIndex;
                      }
                    }
                    
                    // Add the last segment
                    items.push(content.substring(startIndex).trim());
                  } else {
                    // Fall back to splitting by common separators
                    items = content.split(/[,;]|\s+(?=\d+\s*[-:])/g).map(item => item.trim()).filter(Boolean);
                  }
                }
                
                console.log(`Split into ${items.length} items:`, items);
                
                // Convert to structured items
                const structuredItems = items.map((item, index) => {
                  // Try multiple regex patterns for different formats
                  let matches = item.match(/^(\d+)[\s-]+(.+)$/);
                  if (!matches) {
                    matches = item.match(/^([A-Z0-9]+)[\s:-]+(.+)$/i);
                  }
                  
                  if (matches) {
                    // Has product code and description
                    return {
                      product_code: {
                        value: matches[1],
                        confidence: confidence * 0.95 // Slightly reduce confidence for extracted parts
                      },
                      description: {
                        value: matches[2],
                        confidence: confidence * 0.95
                      }
                    };
                  } else {
                    // Just a single value
                    return {
                      item: {
                        value: item,
                        confidence: confidence
                      }
                    };
                  }
                });
                
                console.log(`Created structured array with ${structuredItems.length} items`);
                
                // Replace with structured array
                data[key] = structuredItems;
              }
            }
          } 
          // Handle special case: if we have a "data" field that contains a nested line_items
          else if (key === 'data' && typeof data[key] === 'object') {
            console.log(`Found 'data' field at ${currentPath}, checking for nested line items`);
            data[key] = processLineItems(data[key], currentPath);
          }
          // Recursively process nested objects and arrays
          else if (typeof data[key] === 'object') {
            data[key] = processLineItems(data[key], currentPath);
          }
        });
        
        return data;
      };
      
      // Apply post-processing
      console.log("Starting line item post-processing");
      extractedData = processLineItems(extractedData);
      console.log("Line item post-processing complete");

      // --- Post-Processing & Logging (Optional but helpful) ---
      console.log("Successfully parsed JSON response.");

      // Specifically check and log line item structure if present
      const lineItemKeys = Object.keys(extractedData).filter(k => k.includes('items') || k.includes('products') || k.includes('details') || k.includes('table'));
      if (lineItemKeys.length > 0) {
          lineItemKeys.forEach(key => {
              const items = extractedData[key];
              if (Array.isArray(items)) {
                  console.log(`Found array key '${key}' with ${items.length} items.`);
                  // Log structure of the first item if it exists
                  if (items.length > 0) {
                      console.log(`Structure of first item in '${key}':`, JSON.stringify(items[0], null, 2));
                  }
              } else {
                  console.warn(`Warning: Found key '${key}' but its value is not an array:`, typeof items);
              }
          });
      } else {
          console.log("No common line item keys found in the root of the extracted data.");
      }

    } catch (parseError) {
      console.error("------------------------------------------");
      console.error("Error parsing AI JSON response:", parseError instanceof Error ? parseError.message : parseError);
      console.error("Raw AI Response Text (first 500 chars):");
      console.error(responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""));
      console.error("------------------------------------------");
      return NextResponse.json(
        {
          error: "Failed to parse extracted data from AI response.",
          details: parseError instanceof Error ? parseError.message : "Invalid JSON format received.",
          rawResponsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? "..." : "") // Send a preview back to client
        },
        { status: 500 }
      );
    }

    // --- Metadata Creation ---
    const metadata = {
      timestamp: new Date().toISOString(),
      model: MODEL_ID,
      documentType: documentType,
      prompt: extractionPrompt || "General extraction", // Store the original user prompt
      processingTimeMs: Date.now() - startTime,
      options
    };

    // --- Return Success Response ---
    return NextResponse.json({
      data: extractedData,
      metadata
    });

  } catch (error) {
    console.error("Error in /api/extract:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during extraction.";
    // Check for specific API errors (like quota, API key issues)
    if (errorMessage.includes("API key not valid")) {
        return NextResponse.json({ error: "Invalid Gemini API Key. Please check configuration.", details: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
        return NextResponse.json({ error: "Extraction service quota exceeded. Please try again later.", details: errorMessage }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Failed to extract data", details: errorMessage },
      { status: 500 }
    );
  }
}