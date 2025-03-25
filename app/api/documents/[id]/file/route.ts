import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// This is a temporary solution for demo purposes
const UPLOAD_DIR = join(process.cwd(), "uploads");

// Get the content type for a file based on its extension
function getContentType(fileName: string): string {
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
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
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files found for this document" },
        { status: 404 }
      );
    }
    
    // Filter for document files (PDF, PNG, JPG, JPEG)
    const docFiles = files.filter(file => 
      file.endsWith('.pdf') || 
      file.endsWith('.png') || 
      file.endsWith('.jpg') || 
      file.endsWith('.jpeg')
    );
    
    if (docFiles.length === 0) {
      return NextResponse.json(
        { error: "No document file found" },
        { status: 404 }
      );
    }
    
    const fileName = docFiles[0]; // Get the first document file
    const filePath = join(documentDir, fileName);
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Return the file as a blob with appropriate content type
    const contentType = getContentType(fileName);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
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