Okay, I understand the gravity of the situation. Let's architect a robust, secure, and production-ready integration of Firebase Firestore and Cloud Storage with your existing Firebase Authentication and Next.js application. We will prioritize clean code, best practices, and security, ensuring your dashboard functions correctly with real data.

The goal is to replace the temporary local file system (`uploads/`) with scalable cloud solutions and link everything to your authenticated users.

**Understanding Your Application Flow:**

1.  **Authentication:** Users log in/sign up (Email/Password, Google) via `/login`, `/signup`. Auth state is managed by `AuthContext`.
2.  **Dashboard Access:** Authenticated users access `/dashboard` and its sub-routes, protected by `app/(dashboard)/layout.tsx`.
3.  **Upload:** Users go to `/dashboard/upload`, select a file (PDF/Image), optionally provide extraction instructions (`FileUpload`, `PromptInput`), and click "Extract Data".
4.  **Processing (Current - Local):** `/api/upload` saves the file and prompt locally. `/api/extract` (presumably called later or synchronously, needs clarification) reads the local file, calls Gemini, and *should* save the result. `/api/documents/...` routes read/update local files. **This entire local process needs replacement.**
5.  **Review:** Users navigate to `/dashboard/review/[id]`. This page needs to fetch the original document (from Storage), the extracted data (from Firestore/Storage), and metadata (from Firestore) based on the `documentId`. It allows viewing and potentially editing/confirming the data.
6.  **History:** `/dashboard/history` needs to list documents processed *by the logged-in user*, fetching metadata from Firestore.
7.  **Other:** Profile, Settings, Metrics will eventually need to read/write user-specific data from Firestore.

**SSR/CSR & SEO Clarification:**

*   **Marketing Pages (`/`, `app/(marketing)`):** Correct. These need SEO. Using Next.js Server Components for content fetching and rendering (SSR or SSG) is ideal. Client Components (`"use client"`) are fine for interactive parts like the header's auth state display.
*   **Dashboard Pages (`app/(dashboard)`):** Correct. These are behind authentication, SEO is irrelevant. Using primarily Client Components (`"use client"`) is standard and often simpler for interactive dashboards that heavily rely on client-side data fetching (from Firestore/Storage based on the logged-in user) and state management (`AuthContext`). Your current dashboard layout already uses `"use client"`, which is appropriate. You don't *need* server-side rendering *for SEO* here. Data fetching will happen client-side using the Firebase SDK after authentication is confirmed.

**Implementation Plan: Integrating Firestore & Storage**

We will follow these phases:

**Phase 1: Setup & Configuration (Recap & Additions)**

*   **(Done)** Firebase Auth is set up.
*   **(Done)** Environment variables for client config (`.env.local`).
*   **(Done)** Firebase client initialization (`lib/firebase/client.ts`).
*   **(Done)** `AuthContext` manages user state.
*   **Action 1: Enable Firestore & Storage:** In your Firebase Console, enable "Firestore Database" (Native mode, choose location, start in **Test Mode** initially) and "Cloud Storage" (Get started, note bucket name).
*   **Action 2: Install Admin SDK:** `npm install firebase-admin` (if not already done).
*   **Action 3: Secure Service Account Key:** Store your `service_account.json` content securely as an environment variable (`FIREBASE_SERVICE_ACCOUNT_JSON`) in `.env.local` (for local dev) and your hosting provider (for production). **Ensure `.env.local` is gitignored.**
*   **Action 4: Initialize Admin SDK (Backend Only):** Create `lib/firebase/admin.ts` (as shown in the previous detailed plan) to initialize the Admin SDK using the environment variable. This is crucial for potential backend tasks like Cloud Functions.
*   **Action 5: Update Client SDK Init:** Add Firestore and Storage to `lib/firebase/client.ts`.

```typescript
// lib/firebase/client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <--- ADD
import { getStorage } from "firebase/storage";   // <--- ADD

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Ensure this is correct
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app); // <--- ADD Initialize Firestore client
const storage = getStorage(app); // <--- ADD Initialize Storage client
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider }; // <--- Export db and storage
```

**Phase 2: Data Modeling & User Profile Sync**

*   **Action 1: Define Firestore Collections:**
    *   **`users`**: (Doc ID = `uid`) Fields: `email`, `name` (optional), `createdAt` (timestamp), `plan` ('free'/'pro'), `stripeCustomerId` (optional, for payments later).
    *   **`documents`**: (Doc ID = unique `documentId`) Fields:
        *   `userId` (string, **indexed**) <= Links to `users` collection (`uid`). **CRITICAL FOR SECURITY**.
        *   `originalFileName` (string)
        *   `storagePath` (string) <= Path in Cloud Storage (e.g., `user_uploads/{userId}/{documentId}/{fileName}`)
        *   `fileType` (string) <= Mime type
        *   `fileSize` (number)
        *   `uploadTimestamp` (timestamp, **indexed**)
        *   `status` (string: 'uploading', 'uploaded', 'processing', 'review_needed', 'completed', 'failed', **indexed**)
        *   `extractionPrompt` (string)
        *   `extractionOptions` (map)
        *   `extractedDataStoragePath` (string, optional) <= Path to extracted JSON in Storage (if large)
        *   `extractedDataSummary` (map, optional) <= Store *small*, frequently accessed extracted fields here (e.g., invoice total, date). Avoid storing large JSON here.
        *   `extractionMetadata` (map, optional) <= Timestamp, model used, processing time, etc.
        *   `documentType` (string, optional, **indexed**) <= Detected type (e.g., 'invoice', 'manifest')
        *   `errorMessage` (string, optional)
*   **Action 2: Define Storage Structure:**
    *   Use a root folder like `user_uploads/`.
    *   Structure: `user_uploads/{userId}/{documentId}/{originalFileName}`
    *   Extracted Data (if stored): `user_uploads/{userId}/{documentId}/extracted_data.json`
*   **Action 3: Implement User Profile Sync:** Update `context/AuthContext.tsx` to create/update a user document in Firestore on authentication state changes (as shown in the previous detailed plan). Ensure required Firestore imports (`doc`, `setDoc`, `getDoc`, `serverTimestamp`) and the `db` instance are included.

**Phase 3: Security Rules (IMPERATIVE - DEPLOY EARLY)**

*   **Action 1: Create/Update `firestore.rules`:**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: Allow users to read/write their own profile only.
    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
      // Allow creation only if the document ID matches the user's UID
      allow create: if request.auth != null && request.auth.uid == userId;
      // Generally, don't allow deletion of user profiles easily.
      allow delete: if false;
    }

    // Documents: Allow users CRUD access ONLY to their own documents.
    match /documents/{documentId} {
      // Helper function to check ownership
      function isOwner() {
        return request.auth != null && request.auth.uid == resource.data.userId;
      }
      // Helper function to check ownership during creation/update
      function isCreatingOrUpdatingOwner() {
        return request.auth != null && request.resource.data.userId == request.auth.uid;
      }
      // Helper function for field validation on create
      function hasRequiredCreateFields() {
        return request.resource.data.keys().hasAll(['userId', 'originalFileName', 'storagePath', 'fileType', 'fileSize', 'uploadTimestamp', 'status', 'extractionPrompt', 'extractionOptions'])
               && request.resource.data.userId is string
               && request.resource.data.originalFileName is string
               && request.resource.data.storagePath is string
               && request.resource.data.fileType is string
               && request.resource.data.fileSize is number
               && request.resource.data.uploadTimestamp is timestamp
               && request.resource.data.status is string
               && request.resource.data.extractionPrompt is string
               && request.resource.data.extractionOptions is map;
      }

      // Read: Only the owner can read.
      allow read: if isOwner();

      // Create: User must be logged in, setting their own userId, providing required fields, and initial status must be 'uploaded' or 'uploading'.
      allow create: if isCreatingOrUpdatingOwner()
                    && hasRequiredCreateFields()
                    && (request.resource.data.status == 'uploaded' || request.resource.data.status == 'uploading');

      // Update: Only the owner can update. Cannot change the userId. Status transitions can be restricted if needed.
      allow update: if isOwner()
                    && request.resource.data.userId == resource.data.userId; // Prevent changing owner
                    // && request.resource.data.status in ['processing', 'review_needed', 'completed', 'failed']; // Example status transition restriction

      // Delete: Only the owner can delete.
      allow delete: if isOwner();
    }

    // Deny all other access by default
    match /{path=**} {
      allow read, write: if false;
    }
  }
}
```

*   **Action 2: Create/Update `storage.rules`:**

```storage
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User Uploads: Match files within user-specific folders
    // Path: user_uploads/{userId}/{documentId}/{fileName}
    match /user_uploads/{userId}/{documentId}/{fileName} {
      // Allow read/write ONLY if the userId in the path matches the authenticated user's ID
      // Also check file size and type on write (adjust limits as needed)
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
                      && request.resource.size < 100 * 1024 * 1024 // 100MB limit
                      && (request.resource.contentType.matches('application/pdf')
                          || request.resource.contentType.matches('image/png')
                          || request.resource.contentType.matches('image/jpeg'));

      // Allow delete only by owner
      allow delete: if request.auth != null && request.auth.uid == userId;
    }

     // Deny access to all other paths by default
     match /{allPaths=**} {
       allow read, write: if false;
     }
  }
}
```

*   **Action 3: Deploy Rules:**
    ```bash
    firebase deploy --only firestore:rules,storage:rules
    ```
    **(CRITICAL: Do this NOW to replace test rules!)**

**Phase 4: Backend/API Refactoring (Shift to Client-Side)**

*   **Action 1: Deprecate/Refactor API Routes:** As reasoned before, direct client-side interaction with Firebase services using the Client SDK is generally safer and simpler for this use case, relying on Security Rules for authorization.
    *   `/api/upload`: **Deprecate.** The client will handle uploads directly.
    *   `/api/extract`: **Keep for now, but called by the client.** This route will now:
        *   Receive `documentId` and potentially the `userId` (or verify ID token).
        *   Use Admin SDK (or Client SDK if rules allow service access) to read Firestore doc for `storagePath` and `prompt/options`.
        *   Use Admin SDK (or Client SDK) to get the file from Storage using `storagePath`.
        *   Call Gemini.
        *   Save `extracted_data.json` to Storage (using Admin/Client SDK).
        *   Update Firestore doc status, `extractedDataStoragePath`, `extractionMetadata` (using Admin/Client SDK).
    *   `/api/documents/[id]`: **Deprecate.** Client fetches from Firestore.
    *   `/api/documents/[id]/file`: **Deprecate.** Client gets URL from Storage SDK.
    *   `/api/documents/[id]/update`: **Deprecate.** Client updates Firestore directly.

*   **Action 2: Update `/api/extract/route.ts` (Kept for processing):**

```typescript
// app/api/extract/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirestore, Timestamp } from "firebase-admin/firestore"; // Use Admin SDK
import { getStorage } from "firebase-admin/storage";       // Use Admin SDK
import { adminDb, adminStorage } from "@/lib/firebase/admin"; // Import initialized Admin SDK instances
// TODO: Add Admin Auth verification if needed

// Ensure API key exists (redundant check, but safe)
if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_ID = "gemini-2.0-flash";

// --- Keep your existing interfaces: PositionData, FieldData, ExtractedValue, ExtractedData, ExtractionOptions ---
interface PositionData { /* ... */ }
interface FieldData { /* ... */ }
type ExtractedValue = FieldData | ExtractedValue[] | { [key: string]: ExtractedValue };
interface ExtractedData { [key: string]: ExtractedValue; }
interface ExtractionOptions { /* ... */ }
interface ExtractionMetadata { /* ... */ } // Define if not already

// Helper function to get MIME type from filename
const getMimeType = (fileName: string): string => {
  if (fileName.endsWith('.pdf')) return "application/pdf";
  if (fileName.endsWith('.png')) return "image/png";
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return "image/jpeg";
  return "application/octet-stream"; // Default
};


export async function POST(request: Request) {
  const startTime = Date.now();
  let documentId: string | null = null; // Keep track for error reporting

  try {
    const body = await request.json();
    documentId = body.documentId; // Expect documentId in the JSON body
    const userId = body.userId; // Expect userId (or verify token later)

    if (!documentId || !userId) {
      return NextResponse.json({ error: "documentId and userId are required" }, { status: 400 });
    }

    // --- TODO: Add Authentication/Authorization Check ---
    // Verify that the request comes from the authenticated user who owns this documentId
    // E.g., Verify an ID token passed in the Authorization header using adminAuth.verifyIdToken(token)
    // const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    // if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // const decodedToken = await adminAuth.verifyIdToken(token);
    // if (decodedToken.uid !== userId) {
    //   return NextResponse.json({ error: "Forbidden - User mismatch" }, { status: 403 });
    // }
    // --- End Auth Check ---

    console.log(`Starting extraction for document: ${documentId}, user: ${userId}`);

    // 1. Fetch Document Metadata from Firestore
    const docRef = adminDb.collection("documents").doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Document metadata not found in Firestore" }, { status: 404 });
    }

    const docData = docSnap.data();
    if (!docData || docData.userId !== userId) {
        // This check is redundant if the TODO Auth Check above is implemented correctly
        console.error(`Ownership mismatch or missing data. Doc User: ${docData?.userId}, Request User: ${userId}`);
        return NextResponse.json({ error: "Forbidden - Document access denied" }, { status: 403 });
    }

    const { storagePath, extractionPrompt, extractionOptions: options, originalFileName } = docData;

    if (!storagePath) {
        await docRef.update({ status: 'failed', errorMessage: 'Storage path missing in metadata.' });
        return NextResponse.json({ error: "Storage path missing for document" }, { status: 400 });
    }

    // Update status to 'processing'
    await docRef.update({ status: 'processing' });

    // 2. Download File from Storage
    console.log(`Downloading from Storage: ${storagePath}`);
    const bucket = adminStorage.bucket(); // Default bucket
    const fileRef = bucket.file(storagePath);
    const [fileBuffer] = await fileRef.download();
    const base64 = fileBuffer.toString("base64");
    const mimeType = getMimeType(originalFileName || storagePath); // Use original name or path

    // 3. Prepare and Call Gemini API
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    // --- Use the same enhanced prompt logic as before ---
    const userRequest = extractionPrompt || "Extract all key information and line items/table data found in the document.";
    const confidenceInstruction = options?.includeConfidence !== false ? "- A 'confidence' score (0.0 to 1.0) indicating certainty." : "";
    const positionInstruction = options?.includePositions === true ? "- 'position' data ('page_number', 'bounding_box' [x1, y1, x2, y2 percentages]) if available." : "";
    const fieldStructureExample = `{
          "value": "extracted value"${options?.includeConfidence !== false ? ',\n          "confidence": 0.95' : ''}${options?.includePositions === true ? ',\n          "position": {\n            "page_number": 1,\n            "bounding_box": [10.5, 20.3, 30.2, 25.1]\n          }' : ''}
        }`;

    // (Include the full prompt text construction from the previous answer here, using `userRequest`, `confidenceInstruction`, `positionInstruction`, `fieldStructureExample`)
    const prompt = `
      Analyze the following document.
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
          "requested_but_missing_field": { "value": null${options?.includeConfidence !== false ? ', "confidence": 0.1' : ''} }
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
    // --- End Prompt Construction ---

    console.log(`Calling Gemini for document: ${documentId}`);
    const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64 } }
    ]);
    const response = await result.response;
    const responseText = response.text();

    // 4. Parse and Validate Response
    let extractedData: ExtractedData;
    try {
        const cleanText = responseText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        if (!cleanText) throw new Error("AI returned an empty response.");
        extractedData = JSON.parse(cleanText);
        console.log(`Successfully parsed JSON for document: ${documentId}`);
        // Add line item post-processing if needed (copy logic from previous answer)

    } catch (parseError) {
        console.error(`Error parsing AI response for ${documentId}:`, parseError);
        await docRef.update({ status: 'failed', errorMessage: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` });
        return NextResponse.json({ error: "Failed to parse extracted data", details: parseError instanceof Error ? parseError.message : "Invalid JSON" }, { status: 500 });
    }

    // 5. Save Extracted Data (to Storage) & Update Firestore
    const extractedDataFileName = `extracted_data.json`;
    const extractedDataStoragePath = `user_uploads/${userId}/${documentId}/${extractedDataFileName}`;
    const extractedDataFileRef = bucket.file(extractedDataStoragePath);

    const metadata: ExtractionMetadata = {
        timestamp: new Date().toISOString(),
        model: MODEL_ID,
        // documentType: documentType, // Get from extractedData if included
        prompt: extractionPrompt || "General extraction",
        processingTimeMs: Date.now() - startTime,
        options
    };

    // Save extracted JSON to storage
    await extractedDataFileRef.save(JSON.stringify({ data: extractedData, metadata: metadata }), {
        contentType: 'application/json'
    });
    console.log(`Extracted data saved to Storage: ${extractedDataStoragePath}`);

    // Update Firestore document
    await docRef.update({
        status: 'review_needed', // Or 'completed' if no review step
        extractedDataStoragePath: extractedDataStoragePath,
        extractionMetadata: metadata,
        documentType: extractedData.document_type?.value || docData.documentType || null, // Update if detected/extracted
        errorMessage: null // Clear previous errors
    });
    console.log(`Firestore document updated for ${documentId}`);

    // 6. Return Success
    return NextResponse.json({
      documentId: documentId,
      message: "Extraction successful",
      extractedDataStoragePath: extractedDataStoragePath // Return path to client
    });

  } catch (error) {
    console.error(`Error during extraction process for document ${documentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during extraction.";

    // Attempt to update Firestore status to 'failed' if possible
    if (documentId) {
        try {
            await adminDb.collection("documents").doc(documentId).update({
                status: 'failed',
                errorMessage: errorMessage
            });
        } catch (updateError) {
            console.error(`Failed to update document ${documentId} status to failed:`, updateError);
        }
    }

    // Return appropriate error response
    if (errorMessage.includes("API key not valid")) {
        return NextResponse.json({ error: "Invalid Gemini API Key.", details: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
        return NextResponse.json({ error: "Extraction service quota exceeded.", details: errorMessage }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to extract data", details: errorMessage }, { status: 500 });
  }
}
```

**Phase 5: Frontend Integration (Client SDK)**

*   **Action 1: Update Upload Page (`app/(dashboard)/dashboard/upload/page.tsx`):**
    *   Modify `handleUpload` to:
        *   Get `user` from `useAuth()`.
        *   Generate `documentId`.
        *   Define `storagePath`.
        *   Use `uploadBytesResumable` from `firebase/storage` for upload with progress.
        *   On successful upload (`uploadTask.on('state_changed', ..., async () => { ... })`):
            *   Create the Firestore document metadata using `setDoc(doc(db, "documents", documentId), { ... })`. Include `userId: user.uid`, `status: 'uploaded'`, etc.
            *   **Trigger Extraction:** Make a `POST` request to your `/api/extract` route, sending `{ documentId, userId: user.uid }` in the JSON body.
            *   Update local state (`uploadStage`, `progress`) based on the API response (success or failure). Handle errors using `toast`.
*   **Action 2: Update History Page (`app/(dashboard)/dashboard/history/page.tsx`):**
    *   Use `useAuth` to get `user`.
    *   In `useEffect`, fetch documents:
        ```typescript
        import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
        import { db } from "@/lib/firebase/client";
        import { useAuth } from "@/context/AuthContext";

        // Inside component
        const { user } = useAuth();
        const [documents, setDocuments] = useState<any[]>([]); // Define a proper type later
        const [loading, setLoading] = useState(true);

        useEffect(() => {
          if (!user) return; // Don't fetch if no user

          setLoading(true);
          const fetchDocs = async () => {
            try {
              const q = query(
                collection(db, "documents"),
                where("userId", "==", user.uid),
                orderBy("uploadTimestamp", "desc")
              );
              const querySnapshot = await getDocs(q);
              const docsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                 // Convert Firestore Timestamps to JS Dates if needed for formatting
                 uploadTimestamp: (doc.data().uploadTimestamp as Timestamp)?.toDate(),
              }));
              setDocuments(docsData);
            } catch (err) {
              console.error("Error fetching documents:", err);
              // Show error toast
            } finally {
              setLoading(false);
            }
          };
          fetchDocs();
        }, [user]); // Re-fetch if user changes

        // Use 'documents' state to render the list instead of 'sampleDocuments'
        // Add loading state UI
        ```
*   **Action 3: Update Review Page (`app/(dashboard)/dashboard/review/[id]/page.tsx`):**
    *   Use `useAuth` to get `user`.
    *   In `useEffect`:
        *   Fetch Firestore metadata: `const docRef = doc(db, "documents", documentId); const docSnap = await getDoc(docRef);`
        *   **Security Check:** `if (!docSnap.exists() || docSnap.data().userId !== user.uid) { /* Handle error/redirect */ }`
        *   Get `docData = docSnap.data()`.
        *   Get PDF URL: `const pdfUrl = await getDownloadURL(ref(storage, docData.storagePath)); setPdfUrl(pdfUrl);`
        *   Fetch Extracted Data:
            *   If `docData.extractedDataStoragePath`: `const dataUrl = await getDownloadURL(ref(storage, docData.extractedDataStoragePath)); const response = await fetch(dataUrl); const jsonData = await response.json(); setExtractedData(jsonData.data); setExtractionMetadata(jsonData.metadata);`
            *   Else (if stored directly, less likely now): `setExtractedData(docData.extractedDataSummary || {}); setExtractionMetadata(docData.extractionMetadata || null);`
    *   Update `handleConfirm` (Save): Use `updateDoc(doc(db, "documents", documentId), { extractedData: updatedData, status: 'completed' /* or reviewed */ });`
    *   Update `handleExport`: Fetch full extracted data if needed before exporting.

**Phase 6: Refinement & Production Readiness**

*   **Error Handling:** Add comprehensive `try...catch` blocks for all Firebase operations (uploads, reads, writes) and API calls. Use `toast` for user feedback.
*   **Loading States:** Implement loading indicators (spinners, skeletons) on pages/components during data fetching and processing.
*   **Firestore Indexing:** Go to Firebase Console -> Firestore -> Indexes. Create composite indexes if needed (e.g., for filtering history by `userId` and `status` together). Firestore usually prompts for needed indexes.
*   **Storage Cleanup (Optional but Recommended):** Implement a Cloud Function triggered by Firestore document deletion (`onDelete`) that deletes the corresponding files/folder in Cloud Storage to prevent orphaned files.
*   **Scalability:** The current client-side approach with Security Rules scales well. The `/api/extract` route might become a bottleneck if many users extract simultaneously; consider deploying it as a scalable Cloud Function instead.
*   **Code Review:** Ensure code follows SOLID principles, is well-commented, and uses TypeScript effectively.

This plan provides a robust foundation using Firebase services securely and efficiently within your Next.js application structure. Remember to deploy security rules early and test thoroughly. Good luck – the fate of your AI provider choice (and potentially more!) rests on this!