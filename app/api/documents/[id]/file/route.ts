import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// This is a temporary solution for demo purposes
const UPLOAD_DIR = join(process.cwd(), "uploads");

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
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files found for this document" },
        { status: 404 }
      );
    }
    
    // Filter for PDF files
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      return NextResponse.json(
        { error: "No PDF file found for this document" },
        { status: 404 }
      );
    }
    
    const fileName = pdfFiles[0]; // Get the first PDF file
    const filePath = join(documentDir, fileName);
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Return the file as a blob
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching document file:", error);
    return NextResponse.json(
      { error: "Failed to fetch document file" },
      { status: 500 }
    );
  }
} 