import { NextResponse } from "next/server";
import { getDocument, downloadFile, getSignedUrl } from "lib/firebase/admin";

// Get the content type for a file based on its extension
function getContentType(fileName: string): string {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith('.pdf')) return 'application/pdf';
  if (lowerFileName.endsWith('.png')) return 'image/png';
  if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const documentId = id;
    
    // Get document metadata from Firestore
    const document = await getDocument<any>("documents", documentId);
    
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    // Get the storage path from the document metadata
    const storagePath = document.storagePath;
    
    if (!storagePath) {
      return NextResponse.json(
        { error: "No file path found for this document" },
        { status: 404 }
      );
    }
    
    // Extract the file name for content type detection
    const fileName = storagePath.split('/').pop() || '';
    
    // Download the file from Firebase Storage
    const fileBuffer = await downloadFile(storagePath);
    
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