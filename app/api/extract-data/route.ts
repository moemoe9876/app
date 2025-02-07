import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const schema = JSON.parse(formData.get("schema") as string);

    // Convert PDF to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
      Extract data from this PDF according to the following JSON schema:
      ${JSON.stringify(schema, null, 2)}
      
      Return the data in valid JSON format matching the provided schema.
      Only respond with the JSON data, no additional text.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64
        }
      }
    ]);

    const response = await result.response;
    const extractedData = JSON.parse(response.text());

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error("Error extracting data:", error);
    return NextResponse.json(
      { error: "Failed to extract data" },
      { status: 500 }
    );
  }
}