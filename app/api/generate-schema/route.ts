import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(`
      Generate a JSON schema based on this description: ${prompt}
      The schema should be detailed and match the expected data structure.
      Only respond with the JSON schema, no additional text.
    `);

    const response = await result.response;
    const schema = JSON.parse(response.text());

    return NextResponse.json({ schema });
  } catch (error) {
    console.error("Error generating schema:", error);
    return NextResponse.json(
      { error: "Failed to generate schema" },
      { status: 500 }
    );
  }
}