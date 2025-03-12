import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// This is a temporary solution for demo purposes
const UPLOAD_DIR = join(process.cwd(), "uploads");

export async function POST(
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
    
    // Get the request body
    const body = await request.json();
    const { extractedData } = body;
    
    if (!extractedData) {
      return NextResponse.json(
        { error: "No data provided" },
        { status: 400 }
      );
    }
    
    // Save the updated extracted data
    const extractedDataPath = join(documentDir, "extracted_data.json");
    await writeFile(extractedDataPath, JSON.stringify(extractedData));
    
    return NextResponse.json({
      message: "Document data updated successfully",
    });
  } catch (error) {
    console.error("Error updating document data:", error);
    return NextResponse.json(
      { error: "Failed to update document data" },
      { status: 500 }
    );
  }
} 