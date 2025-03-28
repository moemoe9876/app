Okay, let's break down the process of turning Ingestio.io into a production-ready SaaS application.

Based on your codebase and requirements, here's a comprehensive plan with detailed, AI-friendly instructions.

**Phase 1: Firebase Backend Foundation & Core Workflow Migration**

This phase focuses on replacing the local file system logic with Firebase Storage and Firestore, establishing the core data flow for document processing.

```markdown
# Phase 1: Firebase Backend Foundation & Core Workflow Migration

## Task 1: Set Up Firebase Admin SDK and Environment Variables
<task>
  <goal>Initialize Firebase Admin SDK for server-side operations and configure environment variables securely.</goal>
  <context>Server-side operations (like accessing Firestore/Storage securely, verifying auth tokens) require the Admin SDK, distinct from the client SDK already in use. Sensitive configuration must be kept out of the frontend code.</context>

  **1. Install Firebase Admin SDK:**
     ```bash
     npm install firebase-admin
     # or yarn add firebase-admin
     ```

  **2. Generate Firebase Service Account Key:**
     *   Go to your Firebase Project Settings > Service accounts.
     *   Click "Generate new private key" and confirm.
     *   A JSON file will be downloaded. **Treat this file securely!** Do not commit it to Git.

  **3. Configure Environment Variables:**
     *   Rename the downloaded JSON key file (e.g., `firebase-service-account.json`).
     *   **Option A (Recommended for Vercel):**
         *   Encode the *entire content* of the JSON file into a single-line Base64 string. You can use an online tool or command line:
             ```bash
             # macOS/Linux
             cat path/to/firebase-service-account.json | base64 | tr -d '\n'
             ```
         *   In your Vercel project settings (Environment Variables), create a variable named `FIREBASE_SERVICE_ACCOUNT_BASE64`. Paste the Base64 encoded string as the value.
         *   Also in Vercel, ensure your existing `NEXT_PUBLIC_FIREBASE_*` variables are set correctly for the client-side SDK.
     *   **Option B (Local Development):**
         *   Create a `.env.local` file in your project root (if it doesn't exist).
         *   Add the *path* to your service account key file:
             ```.env.local
             # --- FIREBASE ADMIN ---
             GOOGLE_APPLICATION_CREDENTIALS="./path/to/firebase-service-account.json" # Adjust path

             # --- FIREBASE CLIENT (Ensure these match your Firebase project config) ---
             NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
             NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
             NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
             NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
             NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
             NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
             NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id # Optional

             # --- GEMINI API ---
             GEMINI_API_KEY=your_gemini_api_key
             ```
         *   **Important:** Add `.env.local` and `firebase-service-account.json` (or whatever you named it) to your `.gitignore` file.

  **4. Create Firebase Admin Initialization File:**
     *   Create a new file: `lib/firebase/admin.ts`
     *   Add the following code:

     ```typescript
     // lib/firebase/admin.ts
     import * as admin from 'firebase-admin';

     // Function to decode Base64
     function decodeBase64(encodedString: string): string {
       return Buffer.from(encodedString, 'base64').toString('utf-8');
     }

     let app: admin.app.App;

     if (!admin.apps.length) {
       try {
         const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
         const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

         let serviceAccountJson: admin.ServiceAccount | undefined;

         if (serviceAccountBase64) {
           const decodedJson = decodeBase64(serviceAccountBase64);
           serviceAccountJson = JSON.parse(decodedJson);
           console.log("Firebase Admin SDK initialized using Base64 credentials.");
         } else if (serviceAccountPath) {
           // This path is mainly for local development or environments where the file path is set.
           // Vercel typically uses the Base64 method.
           serviceAccountJson = require(serviceAccountPath); // Use require for JSON
           console.log("Firebase Admin SDK initialized using GOOGLE_APPLICATION_CREDENTIALS path.");
         } else {
           console.warn("Firebase Admin SDK not initialized: No service account credentials found in environment variables.");
           // Handle the case where no credentials are provided, maybe throw an error or use default credentials if applicable
         }

         if (serviceAccountJson) {
           app = admin.initializeApp({
             credential: admin.credential.cert(serviceAccountJson),
             storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Use the client-side bucket name
           });
           console.log("Firebase Admin SDK Initialized Successfully.");
         } else if (process.env.NODE_ENV !== 'production') {
            // Attempt to initialize with default credentials for local emulators/dev environments
            try {
                app = admin.initializeApp({
                    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                });
                console.log("Firebase Admin SDK initialized using default application credentials (e.g., for emulators).");
            } catch (defaultInitError) {
                console.error("Failed to initialize Firebase Admin SDK with default credentials:", defaultInitError);
                throw new Error("Firebase Admin SDK initialization failed. Ensure credentials are set.");
            }
         } else {
            throw new Error("Firebase Admin SDK initialization failed. Service account credentials missing.");
         }

       } catch (error) {
         console.error('Firebase Admin SDK initialization error:', error);
         // Depending on your error handling strategy, you might want to re-throw the error
         // or handle it in a way that prevents the application from starting incorrectly.
         throw new Error(`Firebase Admin SDK initialization failed: ${error instanceof Error ? error.message : String(error)}`);
       }
     } else {
       app = admin.app();
       console.log("Firebase Admin SDK already initialized.");
     }

     export const adminAuth = admin.auth();
     export const adminDb = admin.firestore();
     export const adminStorage = admin.storage();
     export const adminApp = app;
     ```

  **5. Update `.gitignore`:**
     *   Ensure `.env.local` and your service account JSON file name (e.g., `firebase-service-account.json`) are listed in `.gitignore`.
</task>

## Task 2: Define Firestore Data Models
<task>
  <goal>Define the structure for storing user data, document metadata, and extracted results in Firestore.</goal>
  <context>A well-defined structure is crucial for efficient querying and security rules. We'll use separate collections for users and documents.</context>

  **1. User Data Model (`users` collection):**
     *   Document ID: `userId` (from Firebase Auth)
     *   Fields:
         *   `email`: string (user's email)
         *   `displayName`: string | null (user's display name)
         *   `photoURL`: string | null (URL to profile picture)
         *   `createdAt`: Timestamp (when the user account was created)
         *   `subscriptionTier`: string ('free', 'standard', 'pro') - *Added later in Stripe phase*
         *   `subscriptionId`: string | null - *Added later in Stripe phase*
         *   `stripeCustomerId`: string | null - *Added later in Stripe phase*
         *   `docCountMonth`: number (documents processed this billing cycle) - *Added later*
         *   `lastResetDate`: Timestamp (start of current billing cycle) - *Added later*

  **2. Document Data Model (`documents` collection):**
     *   Document ID: Auto-generated Firestore ID (or the UUID generated during upload)
     *   Fields:
         *   `userId`: string (ID of the user who uploaded the document, for ownership)
         *   `fileName`: string (Original name of the uploaded file)
         *   `storagePath`: string (Full path to the file in Firebase Storage, e.g., `user_uploads/{userId}/{documentId}/{fileName}`)
         *   `contentType`: string (MIME type of the file, e.g., 'application/pdf')
         *   `fileSize`: number (Size of the file in bytes)
         *   `uploadTimestamp`: Timestamp (When the file was uploaded)
         *   `status`: string ('uploaded', 'processing', 'completed', 'failed')
         *   `extractionPrompt`: string | null (The prompt used for extraction)
         *   `extractionOptions`: object | null (Options used for extraction)
         *   `extractedData`: object | null (The structured data extracted by Gemini)
         *   `extractionMetadata`: object | null (Metadata from the Gemini extraction process)
         *   `errorMessage`: string | null (If processing failed)
         *   `processingTimestamp`: Timestamp | null (When processing finished or failed)

  **3. Create TypeScript Interfaces (Optional but Recommended):**
     *   Create a file `types/firestore.ts` (or similar).
     *   Define interfaces for these models:

     ```typescript
     // types/firestore.ts
     import { Timestamp } from 'firebase/firestore'; // Use server timestamp if using admin SDK

     export interface UserProfile {
       email: string;
       displayName: string | null;
       photoURL: string | null;
       createdAt: Timestamp;
       subscriptionTier?: 'free' | 'standard' | 'pro';
       subscriptionId?: string | null;
       stripeCustomerId?: string | null;
       docCountMonth?: number;
       lastResetDate?: Timestamp;
     }

     export interface DocumentData {
       userId: string;
       fileName: string;
       storagePath: string;
       contentType: string;
       fileSize: number;
       uploadTimestamp: Timestamp;
       status: 'uploaded' | 'processing' | 'completed' | 'failed';
       extractionPrompt: string | null;
       extractionOptions: Record<string, any> | null; // Store options used
       extractedData: Record<string, any> | null;
       extractionMetadata: Record<string, any> | null;
       errorMessage: string | null;
       processingTimestamp: Timestamp | null;
     }
     ```
</task>

## Task 3: Configure Firebase Storage and Security Rules
<task>
  <goal>Set up Firebase Storage for file uploads and define basic security rules for Storage and Firestore.</goal>
  <context>Files need a secure place to live. Security rules are essential to protect user data and prevent unauthorized access.</context>

  **1. Enable Firebase Storage:**
     *   Go to the Firebase Console -> Storage.
     *   Click "Get started" if you haven't already. Follow the setup wizard. Choose a location for your default bucket (ideally close to your users/functions).

  **2. Define Storage Security Rules:**
     *   In the Firebase Console -> Storage -> Rules tab.
     *   Replace the default rules with rules that restrict access based on user authentication and path. **Start restrictive.**

     ```
     // Firebase Storage Rules
     rules_version = '2';

     service firebase.storage {
       match /b/{bucket}/o {
         // User-specific uploads folder
         // Allow users to read/write files only within their own folder
         match /user_uploads/{userId}/{documentId}/{allPaths=**} {
           allow read: if request.auth != null && request.auth.uid == userId;
           allow write: if request.auth != null && request.auth.uid == userId &&
                         request.resource.size < 100 * 1024 * 1024 && // Max 100MB
                         (request.resource.contentType.matches('application/pdf') ||
                          request.resource.contentType.matches('image/png') ||
                          request.resource.contentType.matches('image/jpeg'));
           // Allow delete only by the owner
           allow delete: if request.auth != null && request.auth.uid == userId;
         }

         // Deny access to all other paths by default
         match /{allPaths=**} {
           allow read, write: if false;
         }
       }
     }
     ```
     *   **Publish** these rules.

  **3. Define Firestore Security Rules:**
     *   In the Firebase Console -> Firestore Database -> Rules tab.
     *   Replace the default rules.

     ```
     // Firebase Firestore Rules
     rules_version = '2';

     service cloud.firestore {
       match /databases/{database}/documents {

         // Users Collection: Allow users to read/update their own profile, allow creation on signup
         match /users/{userId} {
           allow read, update: if request.auth != null && request.auth.uid == userId;
           // Allow create only if the user is authenticated (prevents anonymous creation)
           // You might refine this further during signup implementation if needed
           allow create: if request.auth != null;
           // Generally, don't allow deletion of user profiles via client SDK
           allow delete: if false;
         }

         // Documents Collection: Allow users to CRUD only their own documents
         match /documents/{documentId} {
           // Allow create if user is authenticated and the document belongs to them
           allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
           // Allow read, update, delete only if the user is authenticated and owns the document
           allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;

           // Allow backend functions (like extraction function) to update status/data
           // This requires more advanced rules or trusted server-side updates.
           // For now, we rely on Admin SDK bypassing rules.
           // A more secure approach involves checking function identity or using custom claims.
         }

         // Deny access to all other collections by default
         match /{document=**} {
           allow read, write: if false;
         }
       }
     }
     ```
     *   **Publish** these rules. **Note:** These are starting points. You'll refine them, especially for backend function access.
</task>

## Task 4: Refactor Upload Logic
<task>
  <goal>Modify the file upload process to save files to Firebase Storage and create corresponding metadata documents in Firestore.</goal>
  <context>Replace the current `/api/upload/route.ts` which saves to the local filesystem. Use Firebase Admin SDK for secure server-side operations.</context>

  **1. Modify `app/api/upload/route.ts`:**
     *   Remove `fs/promises`, `path`, `uuid`.
     *   Import Firebase Admin SDK components.
     *   Implement logic to upload to Storage and write to Firestore.

     ```typescript
     // app/api/upload/route.ts
     import { NextResponse } from 'next/server';
     import { adminDb, adminStorage, adminAuth } from '@/lib/firebase/admin';
     import { Timestamp } from 'firebase-admin/firestore'; // Use admin Timestamp
     import { getAuth } from 'firebase-admin/auth'; // To verify token

     interface ExtractionOptions {
       includeConfidence: boolean;
       includePositions: boolean;
       detectDocumentType: boolean;
       temperature: number;
     }

     export async function POST(request: Request) {
       try {
         // 1. Verify Authentication (Crucial for Security)
         const authorization = request.headers.get('Authorization');
         if (!authorization?.startsWith('Bearer ')) {
           return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
         }
         const idToken = authorization.split('Bearer ')[1];
         let decodedToken;
         try {
           // Use adminAuth directly if initialized correctly
           decodedToken = await adminAuth.verifyIdToken(idToken);
         } catch (error) {
           console.error('Error verifying auth token:', error);
           return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
         }
         const userId = decodedToken.uid;

         // 2. Process FormData
         const formData = await request.formData();
         const file = formData.get('file') as File;
         const extractionPrompt = formData.get('extractionPrompt') as string | null;
         const optionsJson = formData.get('options') as string | null;

         if (!file) {
           return NextResponse.json({ error: 'No file provided' }, { status: 400 });
         }

         // 3. Parse Options
         let extractionOptions: ExtractionOptions = {
           includeConfidence: true,
           includePositions: false,
           detectDocumentType: true,
           temperature: 0.1,
         };
         if (optionsJson && optionsJson !== 'undefined') {
           try {
             extractionOptions = { ...extractionOptions, ...JSON.parse(optionsJson) };
           } catch (error) {
             console.warn('Could not parse extraction options, using defaults.', error);
           }
         }

         // 4. Upload to Firebase Storage
         const bucket = adminStorage.bucket(); // Get default bucket
         const documentId = adminDb.collection('documents').doc().id; // Generate Firestore ID first
         const storagePath = `user_uploads/${userId}/${documentId}/${file.name}`;
         const fileRef = bucket.file(storagePath);

         const buffer = Buffer.from(await file.arrayBuffer());

         await fileRef.save(buffer, {
           metadata: {
             contentType: file.type,
             metadata: { // Custom metadata if needed
               firebaseStorageDownloadTokens: documentId, // Optional: Can help construct public URLs if needed, but signed URLs are safer
               userId: userId,
             }
           },
         });

         console.log(`File uploaded to Firebase Storage: ${storagePath}`);

         // 5. Create Firestore Document Entry
         const docRef = adminDb.collection('documents').doc(documentId);
         await docRef.set({
           userId: userId,
           fileName: file.name,
           storagePath: storagePath,
           contentType: file.type,
           fileSize: file.size,
           uploadTimestamp: Timestamp.now(),
           status: 'uploaded', // Initial status
           extractionPrompt: extractionPrompt || null,
           extractionOptions: extractionOptions,
           extractedData: null,
           extractionMetadata: null,
           errorMessage: null,
           processingTimestamp: null,
         });

         console.log(`Firestore document created: ${documentId}`);

         // 6. Return Success Response (including documentId for client)
         return NextResponse.json({
           documentId: documentId, // Send back the ID
           message: 'File uploaded successfully, processing started.',
         });

       } catch (error) {
         console.error('Error uploading file:', error);
         const message = error instanceof Error ? error.message : 'Unknown upload error';
         // Check for specific Firebase errors if needed
         return NextResponse.json(
           { error: 'Failed to upload file', details: message },
           { status: 500 }
         );
       }
     }
     ```

  **2. Update Frontend Upload Component (`app/(dashboard)/dashboard/upload/page.tsx`):**
     *   Modify the `handleUpload` function to include the Authorization header with the user's ID token.

     ```typescript
     // Inside UploadPage component in app/(dashboard)/dashboard/upload/page.tsx
     import { useAuth } from "@/context/AuthContext"; // Import useAuth

     // ... other imports and component setup

     const { user } = useAuth(); // Get user from context

     const handleUpload = async () => {
       if (!file) {
         setError("Please select a file to upload");
         return;
       }
       if (!user) { // Check if user is authenticated
         setError("You must be logged in to upload files.");
         toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
         return;
       }

       try {
         setLoading(true);
         setUploadStage(UploadStage.PROCESSING); // Keep UI showing processing
         setProgress(10); // Start progress

         const idToken = await user.getIdToken(); // Get the Firebase ID token

         const formData = new FormData();
         formData.append("file", file);
         if (extractionPrompt) {
           formData.append("extractionPrompt", extractionPrompt);
         }
         formData.append("options", JSON.stringify(extractionOptions));

         const uploadResponse = await fetch("/api/upload", {
           method: "POST",
           headers: {
             // Add the Authorization header
             'Authorization': `Bearer ${idToken}`,
           },
           body: formData,
         });

         // Simulate progress while waiting for backend (optional, better handled by function triggers)
         setProgress(50);

         if (!uploadResponse.ok) {
           const errorData = await uploadResponse.json();
           throw new Error(errorData.error || "Failed to upload document");
         }

         const { documentId: uploadedDocId } = await uploadResponse.json(); // Get documentId from response
         setDocumentId(uploadedDocId); // Store the document ID

         // Simulate remaining progress
         setProgress(90);
         setTimeout(() => {
             setProgress(100); // Trigger completion state
             setUploadStage(UploadStage.COMPLETE); // Move to complete stage
         }, 800);


       } catch (error) {
         console.error("Error processing request:", error);
         setError(error instanceof Error ? error.message : "An unknown error occurred");
         setUploadStage(UploadStage.ERROR);
       } finally {
         setLoading(false); // Ensure loading is set to false
       }
     };

     // ... rest of the component
     ```
</task>

## Task 5: Implement Extraction Logic with Firebase Functions
<task>
  <goal>Create a Firebase Function that triggers when a file is uploaded to Storage, calls the Gemini API for extraction, and updates the corresponding Firestore document.</goal>
  <context>This decouples the extraction process from the upload request, making it asynchronous and scalable. It's the standard way to handle background processing in Firebase.</context>

  **1. Set up Firebase Functions:**
     *   If you haven't already, install the Firebase CLI: `npm install -g firebase-tools`
     *   Log in: `firebase login`
     *   Navigate to your project's root directory in the terminal.
     *   Initialize Firebase Functions: `firebase init functions`
         *   Choose TypeScript.
         *   Choose to install dependencies with npm.
     *   This creates a `functions` directory.

  **2. Configure Function Environment:**
     *   Set the Gemini API key for the function environment:
         ```bash
         firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
         # You might also need to set Firebase project details if not inferred
         # firebase functions:config:set firebase.project_id="your-project-id"
         # firebase functions:config:set firebase.storage_bucket="your-storage-bucket.appspot.com"
         ```
     *   Get the config locally (optional, for testing): `firebase functions:config:get > .runtimeconfig.json` (Add `.runtimeconfig.json` to `.gitignore`)

  **3. Write the Extraction Function:**
     *   Open `functions/src/index.ts`.
     *   Replace the contents with the following:

     ```typescript
     // functions/src/index.ts
     import * as functions from 'firebase-functions';
     import * as admin from 'firebase-admin';
     import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
     import { logger } from 'firebase-functions'; // Use Firebase logger

     // Initialize Firebase Admin SDK (if not already done globally)
     if (!admin.apps.length) {
       admin.initializeApp();
     }

     const db = admin.firestore();
     const storage = admin.storage();

     // --- Gemini Configuration ---
     // Access the key securely from Functions config
     const GEMINI_API_KEY = functions.config().gemini?.key;
     if (!GEMINI_API_KEY) {
       logger.error("FATAL: Gemini API Key (gemini.key) not set in Firebase Functions config.");
       // Consider throwing an error or disabling the function if the key is missing
     }
     const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
     const MODEL_ID = "gemini-2.0-flash"; // Or "gemini-1.5-flash"

     // --- Types (duplicate from main app or share via a common package) ---
     interface PositionData {
       page_number: number;
       bounding_box: [number, number, number, number];
     }
     interface FieldData {
       value: string | number | null;
       confidence?: number;
       position?: PositionData;
     }
     type ExtractedValue = FieldData | ExtractedValue[] | { [key: string]: ExtractedValue };
     interface ExtractedData { [key: string]: ExtractedValue; }
     interface ExtractionOptions {
       includeConfidence?: boolean;
       includePositions?: boolean;
       detectDocumentType?: boolean;
       temperature?: number;
     }
     interface ExtractionMetadata {
       timestamp: string;
       model: string;
       prompt: string;
       processingTimeMs: number;
       options?: ExtractionOptions;
       documentType?: string | null; // Add detected type here
     }
     // --- End Types ---


     // --- Cloud Function Triggered by Firebase Storage ---
     export const processDocumentOnUpload = functions.storage
       .object()
       .onFinalize(async (object): Promise<void> => {
         if (!genAI) {
           logger.error("Gemini AI client not initialized. Skipping processing.");
           return; // Exit if API key is missing
         }

         const filePath = object.name; // Full path in the bucket
         const contentType = object.contentType; // File type
         const bucketName = object.bucket;

         // --- Basic Validation ---
         if (!filePath || !contentType) {
           logger.warn("Missing filePath or contentType for object:", object.name);
           return;
         }

         // Exit if not in the target directory 'user_uploads/'
         if (!filePath.startsWith('user_uploads/')) {
           logger.log(`File ${filePath} is not in user_uploads/. Skipping.`);
           return;
         }

         // Exit if not a supported file type (redundant with Storage rules but good practice)
         if (!contentType.startsWith('application/pdf') && !contentType.startsWith('image/')) {
           logger.log(`Unsupported content type ${contentType} for ${filePath}. Skipping.`);
           return;
         }

         // Extract userId and documentId from the path
         const pathParts = filePath.split('/');
         if (pathParts.length < 4) {
           logger.warn(`Invalid file path structure: ${filePath}. Skipping.`);
           return;
         }
         const userId = pathParts[1];
         const documentId = pathParts[2];
         const fileName = pathParts[pathParts.length - 1];

         logger.log(`Processing document: ID=${documentId}, User=${userId}, File=${fileName}`);

         const docRef = db.collection('documents').doc(documentId);

         try {
           // 1. Update Firestore status to 'processing'
           await docRef.update({ status: 'processing', processingTimestamp: admin.firestore.FieldValue.serverTimestamp() });
           logger.log(`Document ${documentId} status updated to 'processing'.`);

           // 2. Get Document Snapshot for Prompt and Options
           const docSnapshot = await docRef.get();
           if (!docSnapshot.exists) {
             throw new Error(`Firestore document ${documentId} not found.`);
           }
           const docData = docSnapshot.data();
           const extractionPrompt = docData?.extractionPrompt || null;
           const options: ExtractionOptions = docData?.extractionOptions || {
             includeConfidence: true,
             includePositions: false,
             detectDocumentType: true,
             temperature: 0.1,
           };

           // 3. Download file content from Storage
           const bucket = storage.bucket(bucketName);
           const file = bucket.file(filePath);
           const [fileBuffer] = await file.download();
           const base64 = fileBuffer.toString('base64');
           logger.log(`Downloaded file ${fileName} (${(fileBuffer.length / 1024).toFixed(2)} KB)`);

           const startTime = Date.now();

           // 4. Prepare Gemini Request
           const model = genAI.getGenerativeModel({
             model: MODEL_ID,
             generationConfig: {
               temperature: options.temperature ?? 0.1,
               maxOutputTokens: 8192,
               responseMimeType: "application/json",
             },
             // safetySettings: [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }] // Adjust if needed
           });

           // --- Document Type Detection (Inside Function) ---
           let documentType: string | null = null;
           if (options.detectDocumentType) {
             const detectionPrompt = `Analyze this document. What is its primary type? (e.g., Invoice, Receipt, Contract). Respond ONLY with the type name.`;
             try {
               const detectionModel = genAI.getGenerativeModel({ model: MODEL_ID, generationConfig: { temperature: 0.0, maxOutputTokens: 50, responseMimeType: "text/plain" } });
               const detectionResult = await detectionModel.generateContent([
                 { text: detectionPrompt },
                 { inlineData: { mimeType: contentType, data: base64 } },
               ]);
               documentType = detectionResult.response.text().trim().replace(/[^a-zA-Z0-9\s-]/g, '');
               logger.log(`Detected document type: ${documentType || 'Unknown'}`);
             } catch (error) {
               logger.warn("Warning: Error detecting document type:", error instanceof Error ? error.message : error);
             }
           }
           // --- End Document Type Detection ---

           // --- Build Enhanced Extraction Prompt (Inside Function) ---
           const userRequest = extractionPrompt || "Extract all key information and line items/table data found in the document.";
           const confidenceInstruction = options.includeConfidence ? "- 'confidence' score (0.0 to 1.0)." : "";
           const positionInstruction = options.includePositions ? "- 'position' data ('page_number', 'bounding_box' [x1, y1, x2, y2 percentages])." : "";
           const fieldStructureExample = `{ "value": "...",${options.includeConfidence ? ' "confidence": 0.95,' : ''}${options.includePositions ? ' "position": { ... }' : ''} }`.replace(/,\s*}/, '}'); // Clean trailing comma

           const prompt = `
            Analyze the document${documentType ? ` (likely a ${documentType})` : ''}. Extract data based on the user's request.

            USER REQUEST: "${userRequest}"

            RULES:
            1. Respond ONLY with valid JSON. No extra text or markdown.
            2. Structure: Use snake_case keys. Each field must be an object: ${fieldStructureExample}
               ${confidenceInstruction} ${positionInstruction}
            3. LINE ITEMS/TABLES: ALWAYS use an array of objects (e.g., "line_items": [ { "desc": {...}, "qty": {...} }, ... ]). NEVER a single string.
            4. Not Found: If requested field is missing, use \`{ "value": null${options.includeConfidence ? ', "confidence": 0.1' : ''} }\`.
            5. Hierarchy: Use nested objects for related data (e.g., address).
           `;
           // --- End Build Prompt ---

           // 5. Call Gemini API
           logger.log(`Calling Gemini for document ${documentId}...`);
           const result = await model.generateContent([
             { text: prompt },
             { inlineData: { mimeType: contentType, data: base64 } }
           ]);
           const response = result.response;
           const responseText = response.text();
           logger.log(`Gemini response received for ${documentId}.`);

           // 6. Parse and Validate Response
           let extractedData: ExtractedData;
           try {
             const cleanText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
             if (!cleanText) throw new Error("AI returned empty response.");
             extractedData = JSON.parse(cleanText);
             // Add post-processing for line items if needed (similar to API route)
             logger.log(`Successfully parsed Gemini JSON for ${documentId}.`);
           } catch (parseError) {
             logger.error(`Error parsing Gemini JSON for ${documentId}:`, parseError);
             logger.error("Raw Gemini Response Text (first 500 chars):", responseText.substring(0, 500));
             throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
           }

           // 7. Create Metadata
           const metadata: ExtractionMetadata = {
             timestamp: new Date().toISOString(),
             model: MODEL_ID,
             prompt: extractionPrompt || "General extraction",
             processingTimeMs: Date.now() - startTime,
             options: options,
             documentType: documentType,
           };

           // 8. Update Firestore with results
           await docRef.update({
             status: 'completed',
             extractedData: extractedData,
             extractionMetadata: metadata,
             errorMessage: null,
             processingTimestamp: admin.firestore.FieldValue.serverTimestamp(),
           });
           logger.log(`Document ${documentId} processing completed successfully.`);

         } catch (error) {
           logger.error(`Error processing document ${documentId}:`, error);
           // Update Firestore with error status
           await docRef.update({
             status: 'failed',
             errorMessage: error instanceof Error ? error.message : 'Unknown processing error',
             processingTimestamp: admin.firestore.FieldValue.serverTimestamp(),
           });
         }
       });

     ```

  **4. Deploy the Function:**
     *   Navigate to the `functions` directory: `cd functions`
     *   Build the TypeScript code: `npm run build` (or `yarn build`)
     *   Deploy only the function: `firebase deploy --only functions:processDocumentOnUpload`

  **5. Test:**
     *   Upload a new file through your application.
     *   Check the Firebase Functions logs in the Google Cloud Console or Firebase Console for output and errors.
     *   Check the Firestore document for the `status`, `extractedData`, and `extractionMetadata` fields being updated.
</task>

## Task 6: Update Review Page to Use Firebase Data
<task>
  <goal>Modify the document review page (`app/(dashboard)/dashboard/review/[id]/page.tsx`) to fetch data from Firestore and display the document from Firebase Storage.</goal>
  <context>The review page currently uses mock data. It needs to load real data based on the document ID from the URL.</context>

  **1. Modify `app/(dashboard)/dashboard/review/[id]/page.tsx`:**
     *   Import necessary Firebase client SDK functions (`getDoc`, `doc`, `getStorage`, `ref`, `getDownloadURL`).
     *   Use `useEffect` to fetch data when the component mounts or `id` changes.
     *   Fetch the Firestore document using the `id` from `params`.
     *   Fetch the download URL for the document from Firebase Storage using the `storagePath` from the Firestore document.
     *   Update component state with fetched data.
     *   Implement `handleConfirm` to save updated data back to Firestore using `updateDoc`.

     ```typescript
     // app/(dashboard)/dashboard/review/[id]/page.tsx
     "use client";

     import { useState, useEffect, useCallback } from "react";
     import { useRouter } from "next/navigation"; // Use next/navigation
     import { Button } from "@/components/ui/button";
     import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
     import { Check, Download, Edit, Eye, FileText, Save, RotateCw, AlertCircle, Loader2 } from "lucide-react"; // Added Loader2
     import { useToast } from "@/components/ui/use-toast";
     import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
     import { ResizablePanels } from "@/components/ResizablePanels";
     import { DataVisualizer } from "@/components/DataVisualizer";
     import DocumentViewer from "@/components/DocumentViewer"; // Your component that handles PDF/Image viewing
     import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"; // Import Firestore functions
     import { getStorage, ref, getDownloadURL } from "firebase/storage"; // Import Storage functions
     import { db, storage } from "@/lib/firebase/client"; // Import client instances
     import { useAuth } from "@/context/AuthContext"; // Import useAuth

     // --- Types (Ensure these match your Firestore structure) ---
     interface PositionData {
       page_number: number;
       bounding_box: [number, number, number, number];
     }
     interface FieldData {
       value: string | number | null;
       confidence?: number;
       position?: PositionData;
     }
     type ExtractedValue = FieldData | ExtractedValue[] | { [key: string]: ExtractedValue };
     interface ExtractedData { [key: string]: ExtractedValue; }
     interface ExtractionMetadata { /* ... define if needed ... */
        options?: { includePositions?: boolean };
     }
     interface DocumentData {
       userId: string;
       fileName: string;
       storagePath: string;
       // ... other fields from your model
       extractedData: ExtractedData | null;
       extractionMetadata: ExtractionMetadata | null;
       status: 'uploaded' | 'processing' | 'completed' | 'failed';
       errorMessage?: string | null;
     }
     interface HighlightRect {
        pageNumber: number;
        boundingBox: [number, number, number, number];
        color?: string;
        id: string;
     }
     // --- End Types ---

     interface PageProps {
       params: { id: string };
     }

     export default function ReviewPage({ params }: PageProps) {
       const { id: documentId } = params;
       const { toast } = useToast();
       const router = useRouter();
       const { user, loading: authLoading } = useAuth(); // Get user and auth loading state

       const [documentData, setDocumentData] = useState<DocumentData | null>(null);
       const [pdfUrl, setPdfUrl] = useState<string | null>(null);
       const [isLoading, setIsLoading] = useState(true);
       const [error, setError] = useState<string | null>(null);
       const [editMode, setEditMode] = useState(false); // State for edit mode
       // Add other states as needed (e.g., currentHighlight, selectedFieldPath)
       const [currentHighlight, setCurrentHighlight] = useState<HighlightRect | null>(null);
       const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);


       // Fetch document data and URL
       useEffect(() => {
         if (authLoading || !user || !documentId) {
           // Wait for auth or if no user/docId, don't fetch
           if (!authLoading && !user) {
               setError("Authentication required.");
               setIsLoading(false);
           }
           return;
         };

         const fetchDocument = async () => {
           setIsLoading(true);
           setError(null);
           setPdfUrl(null); // Reset URL on new fetch
           setDocumentData(null); // Reset data

           try {
             const docRef = doc(db, "documents", documentId);
             const docSnap = await getDoc(docRef);

             if (!docSnap.exists()) {
               throw new Error("Document not found.");
             }

             const data = docSnap.data() as DocumentData;

             // Security Check: Ensure the logged-in user owns this document
             if (data.userId !== user.uid) {
                throw new Error("Access denied. You do not own this document.");
             }

             setDocumentData(data);

             // Fetch the download URL from Firebase Storage
             if (data.storagePath) {
               try {
                 const storageRef = ref(storage, data.storagePath);
                 const url = await getDownloadURL(storageRef);
                 setPdfUrl(url);
               } catch (storageError) {
                 console.error("Error getting download URL:", storageError);
                 // Proceed without URL, DocumentViewer should handle null URL
                 toast({ title: "Warning", description: "Could not load document preview.", variant: "destructive" });
               }
             } else {
                console.warn("No storage path found for document:", documentId);
             }

           } catch (err) {
             console.error("Error fetching document:", err);
             setError(err instanceof Error ? err.message : "Failed to load document data.");
             toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load document.", variant: "destructive" });
           } finally {
             setIsLoading(false);
           }
         };

         fetchDocument();
       }, [documentId, user, authLoading, toast]); // Add dependencies

       // --- Handlers (handleHighlight, handleFieldSelect, handlePdfPositionClick, handleConfirm, etc.) ---
        const handleHighlight = useCallback((highlight: HighlightRect | null) => {
            // Only highlight if position data was included during extraction
            if (highlight && documentData?.extractionMetadata?.options?.includePositions === false) {
                return; // Don't highlight if positions weren't extracted
            }
            setCurrentHighlight(highlight);
        }, [documentData]); // Depend on documentData to access metadata

        const handleFieldSelect = useCallback((path: string, value: any) => {
            setSelectedFieldPath(path);
            // Potentially trigger highlight based on selected field's position
            if (value?.position && documentData?.extractionMetadata?.options?.includePositions !== false) {
                handleHighlight({
                    id: path,
                    pageNumber: value.position.page_number,
                    boundingBox: value.position.bounding_box,
                    color: '#3b82f6' // Example selection color
                });
            } else {
                 handleHighlight(null); // Clear highlight if no position
            }
            // Add logic for editing if needed
            if (editMode) {
                console.log("Edit mode: Selected field", path, value);
                // Open edit modal or inline edit logic here
            }
        }, [editMode, handleHighlight, documentData]); // Depend on editMode and handleHighlight

        const handlePdfPositionClick = useCallback((pageNumber: number, position: [number, number]) => {
            // Logic to find the field at the clicked position
            // This requires iterating through your extractedData structure
            // and checking if the click falls within any field's bounding_box
            // For now, just log the click
            console.log(`Clicked on PDF page ${pageNumber} at [${position[0].toFixed(2)}%, ${position[1].toFixed(2)}%]`);
            // Implement findFieldByPosition logic here if needed
            // const field = findFieldByPosition(pageNumber, position, documentData?.extractedData);
            // if (field) { handleFieldSelect(field.path, field.data); }
        }, []); // Add dependencies if findFieldByPosition is implemented

        const handleConfirm = async () => {
            if (!documentData || !user) return; // Ensure data and user exist

            // Add logic here if you allow editing and need to save changes
            // For now, just mark as confirmed (if you add a 'confirmed' field)
            try {
                const docRef = doc(db, "documents", documentId);
                await updateDoc(docRef, {
                    // confirmed: true, // Example: if you add a confirmed field
                    // lastReviewed: Timestamp.now(), // Example
                    status: 'completed' // Ensure status is completed on confirm
                });
                toast({ title: "Success", description: "Document review confirmed." });
                // Optionally navigate away or disable confirm button
            } catch (err) {
                console.error("Error confirming document:", err);
                toast({ title: "Error", description: "Failed to confirm document.", variant: "destructive" });
            }
        };

       // --- Render Logic ---
       if (isLoading || authLoading) {
         return (
           <div className="flex items-center justify-center h-[80vh]">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
         );
       }

       if (error) {
         return (
           <Alert variant="destructive" className="m-4">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error Loading Document</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
             <Button onClick={() => router.back()} variant="outline" size="sm" className="mt-4">Go Back</Button>
           </Alert>
         );
       }

       if (!documentData) {
         // This case should ideally be covered by the error state, but added for robustness
         return <div className="p-4">Document data could not be loaded.</div>;
       }

       // Main component render using documentData and pdfUrl
       return (
         <div className="flex flex-col gap-4 p-4 h-full"> {/* Adjust padding/layout */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    Review: {documentData.fileName}
                </h1>
                <div className="flex gap-2">
                    {/* Add Edit/Confirm buttons */}
                    <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
                        {editMode ? <><Eye className="mr-2 h-4 w-4"/>View Mode</> : <><Edit className="mr-2 h-4 w-4"/>Edit Mode</>}
                    </Button>
                    <Button size="sm" onClick={handleConfirm}>
                        <Check className="mr-2 h-4 w-4"/> Confirm
                    </Button>
                </div>
            </div>

            {documentData.status === 'processing' && (
                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertTitle>Processing</AlertTitle>
                    <AlertDescription>This document is still being processed. Extracted data may be incomplete.</AlertDescription>
                </Alert>
            )}
            {documentData.status === 'failed' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Processing Failed</AlertTitle>
                    <AlertDescription>{documentData.errorMessage || "An error occurred during processing."}</AlertDescription>
                    {/* Add a retry button? */}
                </Alert>
            )}

            <div className="flex-1 h-[calc(100vh-200px)]"> {/* Adjust height as needed */}
                <ResizablePanels
                    leftPanel={
                        <DataVisualizer
                            data={documentData.extractedData || {}}
                            onHighlight={handleHighlight}
                            onSelect={handleFieldSelect}
                            selectedFieldPath={selectedFieldPath}
                            options={{ includePositions: documentData.extractionMetadata?.options?.includePositions !== false }}
                            // Pass confidence threshold if you implement filtering
                        />
                    }
                    rightPanel={
                        <Card className="h-full flex flex-col overflow-hidden border-0">
                            <CardHeader className="pb-2">
                                <CardTitle>Document Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-auto p-0 bg-muted/50">
                                {pdfUrl ? (
                                    <DocumentViewer
                                        url={pdfUrl}
                                        highlights={currentHighlight ? [currentHighlight] : []}
                                        onPositionClick={handlePdfPositionClick}
                                        // Pass zoom controls if needed
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        {documentData.storagePath ? "Loading preview..." : "Preview not available."}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    }
                    defaultLeftWidth={45}
                    minLeftWidth={30}
                    maxLeftWidth={70}
                    storageKey={`reviewPanel-${documentId}`} // Unique key per document
                />
            </div>
         </div>
       );
     }

     ```
</task>

## Task 7: Update History Page to Use Firebase Data
<task>
  <goal>Modify the document history page (`app/(dashboard)/dashboard/history/page.tsx`) to fetch and display the list of documents from Firestore for the logged-in user.</goal>
  <context>The history page currently uses mock data. It needs to query Firestore based on the authenticated user.</context>

  **1. Modify `app/(dashboard)/dashboard/history/page.tsx`:**
     *   Import necessary Firebase client SDK functions (`collection`, `query`, `where`, `orderBy`, `getDocs`, `limit`, `startAfter`, `Timestamp`).
     *   Import `useAuth` hook.
     *   Use `useEffect` to fetch documents when the component mounts or filters/user changes.
     *   Implement filtering and pagination logic using Firestore queries.
     *   Update the UI to display fetched documents and handle loading/error states.
     *   Implement delete functionality (optional, requires updating Firestore document status or deleting).

     ```typescript
     // app/(dashboard)/dashboard/history/page.tsx
     "use client";

     import { useState, useEffect, useCallback } from "react";
     import { Button } from "@/components/ui/button";
     import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
     import { Input } from "@/components/ui/input";
     import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
     import { Download, Eye, Trash2, Search, Calendar, Loader2, AlertCircle } from "lucide-react"; // Added Loader2, AlertCircle
     import Link from "next/link";
     import { db } from "@/lib/firebase/client"; // Import db instance
     import { useAuth } from "@/context/AuthContext"; // Import useAuth
     import {
       collection,
       query,
       where,
       orderBy,
       limit,
       getDocs,
       Timestamp, // Import Timestamp
       deleteDoc, // Import deleteDoc
       doc // Import doc
     } from "firebase/firestore";
     import { useToast } from "@/components/ui/use-toast"; // Import useToast
     import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
        AlertDialogTrigger,
      } from "@/components/ui/alert-dialog" // Import AlertDialog

     // Interface for Firestore document data (simplified for history view)
     interface DocumentHistoryItem {
       id: string; // Firestore document ID
       fileName: string;
       status: 'uploaded' | 'processing' | 'completed' | 'failed';
       uploadTimestamp: Timestamp;
       contentType: string; // To determine icon/type
     }

     const ITEMS_PER_PAGE = 10; // Adjust as needed

     export default function HistoryPage() {
       const { user, loading: authLoading } = useAuth();
       const { toast } = useToast();
       const [documents, setDocuments] = useState<DocumentHistoryItem[]>([]);
       const [isLoading, setIsLoading] = useState(true);
       const [error, setError] = useState<string | null>(null);
       const [searchTerm, setSearchTerm] = useState(""); // Keep search term state
       const [filterStatus, setFilterStatus] = useState("all"); // Keep status filter state
       // Add state for pagination if needed

       const formatDate = (timestamp: Timestamp) => {
         if (!timestamp) return "N/A";
         return timestamp.toDate().toLocaleDateString('en-US', {
           year: 'numeric', month: 'short', day: 'numeric'
         });
       };

       const getDocumentType = (contentType: string): string => {
         if (contentType.includes('pdf')) return 'PDF';
         if (contentType.includes('image')) return 'Image';
         return 'File';
       }

       // Fetch documents function
       const fetchDocuments = useCallback(async () => {
         if (!user) return; // Don't fetch if user is not logged in

         setIsLoading(true);
         setError(null);

         try {
           const documentsRef = collection(db, "documents");
           let q = query(
             documentsRef,
             where("userId", "==", user.uid), // Filter by logged-in user
             orderBy("uploadTimestamp", "desc"), // Order by upload date
             limit(ITEMS_PER_PAGE) // Add pagination limit
           );

           // Apply status filter if not 'all'
           if (filterStatus !== "all") {
             q = query(q, where("status", "==", filterStatus));
           }

           // Note: Firestore doesn't support efficient text search on substrings like 'fileName'.
           // For production, consider using a dedicated search service (Algolia, Typesense)
           // or structuring data differently (e.g., keywords array).
           // Client-side filtering after fetching is done below for simplicity here.

           const querySnapshot = await getDocs(q);
           const fetchedDocs = querySnapshot.docs.map(doc => ({
             id: doc.id,
             ...doc.data(),
           })) as DocumentHistoryItem[];

           setDocuments(fetchedDocs);

         } catch (err) {
           console.error("Error fetching documents:", err);
           setError("Failed to load document history.");
           toast({ title: "Error", description: "Could not load history.", variant: "destructive" });
         } finally {
           setIsLoading(false);
         }
       }, [user, filterStatus, toast]); // Add dependencies

       // Fetch documents on mount and when user or filters change
       useEffect(() => {
         if (!authLoading) {
           fetchDocuments();
         }
       }, [user, authLoading, filterStatus, fetchDocuments]); // Include fetchDocuments

       // Client-side filtering based on search term (simple implementation)
       const filteredDocuments = documents.filter(doc =>
         doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
       );

        // --- Delete Document Function ---
        const handleDeleteDocument = async (docId: string) => {
            if (!user) return;

            try {
                const docRef = doc(db, "documents", docId);
                // Optional: Add logic here to delete the file from Firebase Storage first
                // const docSnap = await getDoc(docRef);
                // if (docSnap.exists()) {
                //   const storagePath = docSnap.data()?.storagePath;
                //   if (storagePath) {
                //     const storageRef = ref(storage, storagePath);
                //     await deleteObject(storageRef); // Requires importing storage functions
                //   }
                // }

                await deleteDoc(docRef); // Delete Firestore document

                // Refresh the list
                setDocuments(prev => prev.filter(d => d.id !== docId));

                toast({ title: "Success", description: "Document deleted successfully." });
            } catch (err) {
                console.error("Error deleting document:", err);
                toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
            }
        };


       return (
         <div className="flex flex-col gap-6">
           {/* Header */}
           <div className="flex flex-col gap-2">
             <h1 className="text-3xl font-bold tracking-tight text-foreground">Document History</h1>
             <p className="text-muted-foreground">
               View and manage your previously processed documents
             </p>
           </div>

           {/* Filters */}
           <Card className="border-border">
             <CardHeader>
               <CardTitle>Filters</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search by filename..."
                     className="pl-8"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 <Select value={filterStatus} onValueChange={setFilterStatus}>
                   <SelectTrigger className="w-full md:w-[200px]">
                     <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Status</SelectItem>
                     <SelectItem value="completed">Completed</SelectItem>
                     <SelectItem value="processing">Processing</SelectItem>
                     <SelectItem value="failed">Failed</SelectItem>
                     <SelectItem value="uploaded">Uploaded</SelectItem>
                   </SelectContent>
                 </Select>
                 {/* Add date range filters if needed */}
               </div>
             </CardContent>
           </Card>

           {/* Document List */}
           <Card className="border-border">
             <CardHeader>
               <CardTitle>Document List</CardTitle>
               <CardDescription>
                 {isLoading ? "Loading..." : `${filteredDocuments.length} document(s) found`}
               </CardDescription>
             </CardHeader>
             <CardContent>
               {isLoading ? (
                 <div className="flex justify-center items-center py-10">
                   <Loader2 className="h-6 w-6 animate-spin" />
                 </div>
               ) : error ? (
                 <Alert variant="destructive">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Error</AlertTitle>
                   <AlertDescription>{error}</AlertDescription>
                 </Alert>
               ) : (
                 <div className="rounded-md border">
                   <div className="grid grid-cols-6 p-4 bg-muted/50 font-medium text-sm">
                     <div className="col-span-2">Document</div>
                     <div>Type</div>
                     <div>Status</div>
                     <div>Date</div>
                     <div className="text-right">Actions</div>
                   </div>

                   {filteredDocuments.length > 0 ? (
                     filteredDocuments.map((doc) => (
                       <div key={doc.id} className="grid grid-cols-6 p-4 border-t items-center">
                         <div className="col-span-2 font-medium truncate pr-2">{doc.fileName}</div>
                         <div>{getDocumentType(doc.contentType)}</div>
                         <div>
                           <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                             doc.status === "completed" ? "bg-green-100 text-green-700"
                             : doc.status === "processing" ? "bg-blue-100 text-blue-700"
                             : doc.status === "failed" ? "bg-red-100 text-red-700"
                             : "bg-gray-100 text-gray-700" // uploaded or other
                           }`}>
                             {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                           </span>
                         </div>
                         <div className="flex items-center text-sm">
                           <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                           {formatDate(doc.uploadTimestamp)}
                         </div>
                         <div className="flex justify-end gap-1">
                           <Button variant="ghost" size="icon" asChild title="Review Document">
                             <Link href={`/dashboard/review/${doc.id}`}>
                               <Eye className="h-4 w-4" />
                               <span className="sr-only">Review</span>
                             </Link>
                           </Button>
                           {/* Add Download Button - Requires getting signed URL */}
                           {/* <Button variant="ghost" size="icon" title="Download">
                             <Download className="h-4 w-4" />
                             <span className="sr-only">Download</span>
                           </Button> */}
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Document">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the document
                                        and its associated data from our servers.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="p-8 text-center text-muted-foreground">
                       No documents found matching your criteria.
                     </div>
                   )}
                 </div>
               )}
               {/* Add Pagination controls here if needed */}
             </CardContent>
           </Card>
         </div>
       );
     }
     ```
</task>

**Phase 1 Summary:**

*   Firebase Admin SDK is set up.
*   Firestore models for `users` and `documents` are defined.
*   Basic security rules for Firestore and Storage are in place.
*   File uploads now go to Firebase Storage, and metadata is saved to Firestore.
*   A Firebase Function asynchronously processes documents using Gemini upon upload.
*   The Review and History pages fetch data from Firebase instead of using mock data.

---

**Phase 2: Stripe Integration and Pricing Tiers**

This phase focuses on monetizing the application using Stripe and implementing the defined pricing structure.

```markdown
# Phase 2: Stripe Integration and Pricing Tiers

## Task 8: Research Gemini Pricing & Define App Pricing
<task>
  <goal>Understand Gemini API costs and define a sustainable pricing model for Ingestio.io.</goal>
  <context>Pricing needs to cover API costs, infrastructure, and provide profit margin while remaining competitive.</context>

  **1. Research Gemini API Pricing:**
     *   Go to the official Google Cloud AI Platform pricing page for Vertex AI Gemini API (or the specific Gemini API you are using if it's standalone).
     *   Focus on the `gemini-1.5-flash` (or `gemini-2.0-flash` if that's what you meant) pricing. Note that pricing is typically based on:
         *   **Input Tokens:** Characters/words sent *to* the model (document content + prompt).
         *   **Output Tokens:** Characters/words received *from* the model (extracted JSON data).
     *   Pricing is often per 1,000 characters or per 1,000 tokens. Note the free tier limits if any.
     *   **Estimate Cost Per Document:** This is tricky and depends heavily on document size, complexity, and the prompt used.
         *   *Assumption:* Let's assume an average document + prompt uses ~10,000 input characters and generates ~2,000 output characters.
         *   *Example Calculation (Hypothetical Prices - **CHECK ACTUAL PRICES**):*
             *   Input: $0.000125 / 1k chars -> 10k chars = $0.00125
             *   Output: $0.000250 / 1k chars -> 2k chars = $0.00050
             *   *Estimated Gemini Cost per Document:* ~$0.00175
         *   **Your Task:** Replace the hypothetical prices above with the *actual, current* pricing for `gemini-1.5-flash` (or your chosen model) from Google Cloud. Recalculate the estimated cost per document.

  **2. Define Pricing Tiers:**
     *   **Goal:** Free, Standard, Pro tiers, max Pro price $20/month. Optimize for margin and value.
     *   **Cost Basis:** Use your calculated *Estimated Gemini Cost per Document*. Let's use $0.002 for this example (adjust based on your research).
     *   **Free Tier:**
         *   Price: $0/month
         *   Documents: 15-25 per month (e.g., 20 docs * $0.002 = $0.04 cost - acceptable for acquisition). Let's set it to **20 documents/month**.
         *   Features: Basic extraction, JSON/CSV export, Standard support.
     *   **Standard Tier (Proposed):**
         *   Price: **$9/month**
         *   Documents: Aim for a good value jump. 250 docs * $0.002 = $0.50 cost. Offers significant margin. Let's set it to **250 documents/month**.
         *   Features: All Free features + API access (limited rate), Email support.
     *   **Pro Tier:**
         *   Price: **$19/month** (Slightly under the $20 max for perceived value)
         *   Documents: Significant increase. 1000 docs * $0.002 = $2.00 cost. Still very high margin. Let's set it to **1000 documents/month**.
         *   Features: All Standard features + Higher API rate limits, Priority support, Advanced extraction options (if you add any).
     *   **(Optional) Overage:** Consider charging per document beyond the limit (e.g., $0.05/document) or requiring an upgrade.

  **3. Final Tiers (Example - Adjust based on your cost research):**
     *   **Free:** $0/month, 20 documents/month.
     *   **Standard:** $9/month, 250 documents/month.
     *   **Pro:** $19/month, 1000 documents/month.
</task>

## Task 9: Set Up Stripe Account and Products
<task>
  <goal>Configure Stripe account, create products representing the pricing tiers, and obtain API keys.</goal>
  <context>Stripe needs to know what you're selling before you can integrate payments.</context>

  **1. Create/Configure Stripe Account:**
     *   Sign up or log in at [dashboard.stripe.com](https://dashboard.stripe.com/).
     *   Complete account activation steps (business details, bank account, etc.).
     *   Toggle between Test mode and Live mode as needed. **Start in Test mode.**

  **2. Create Products and Prices in Stripe:**
     *   Go to Products > Add product.
     *   Create three products: "Ingestio Free", "Ingestio Standard", "Ingestio Pro".
     *   For "Ingestio Standard":
         *   Add a price: $9, Recurring, Monthly. Note the Price ID (e.g., `price_xxxxxxxxxxxx`).
         *   (Optional) Add a yearly price: $90 (or similar discount), Recurring, Yearly. Note the Price ID.
     *   For "Ingestio Pro":
         *   Add a price: $19, Recurring, Monthly. Note the Price ID.
         *   (Optional) Add a yearly price: $190 (or similar discount), Recurring, Yearly. Note the Price ID.
     *   For "Ingestio Free": You don't need a price, but having the product helps manage subscriptions conceptually.

  **3. Obtain Stripe API Keys:**
     *   Go to Developers > API keys.
     *   Note your **Publishable key** (starts with `pk_test_` or `pk_live_`).
     *   Reveal and note your **Secret key** (starts with `sk_test_` or `sk_live_`). **Keep the secret key secure!**

  **4. Set Environment Variables:**
     *   Add Stripe keys to your environment variables (Vercel and `.env.local`):
         ```.env.local
         # --- STRIPE ---
         NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key # Or pk_live_...
         STRIPE_SECRET_KEY=sk_test_your_secret_key # Or sk_live_...
         STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret # Get this in the next step
         ```
     *   Add `STRIPE_PRICE_ID_STANDARD_MONTHLY`, `STRIPE_PRICE_ID_PRO_MONTHLY` (and yearly if applicable) variables holding the Price IDs you noted.

  **5. Configure Stripe Webhook:**
     *   Go to Developers > Webhooks > Add endpoint.
     *   Endpoint URL: `your_deployed_url/api/stripe/webhook` (Use `https://your-domain.com/api/stripe/webhook` for production, or use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`).
     *   Select events to listen to:
         *   `checkout.session.completed`
         *   `customer.subscription.updated`
         *   `customer.subscription.deleted`
         *   `invoice.payment_succeeded` (Useful for tracking renewals)
         *   `invoice.payment_failed`
     *   Click "Add endpoint".
     *   After creation, find the **Signing secret** (starts with `whsec_`) and add it to your `STRIPE_WEBHOOK_SECRET` environment variable.
</task>

## Task 10: Implement Stripe Checkout
<task>
  <goal>Create a mechanism for users to select a plan and initiate a Stripe Checkout session.</goal>
  <context>This involves frontend UI for plan selection and a backend endpoint (or Server Action) to create the Stripe session.</context>

  **1. Install Stripe SDKs:**
     ```bash
     npm install stripe @stripe/stripe-js
     # or yarn add stripe @stripe/stripe-js
     ```

  **2. Create Stripe Client Utility:**
     *   Create `lib/stripe/client.ts`:
     ```typescript
     // lib/stripe/client.ts
     import { loadStripe, Stripe } from '@stripe/stripe-js';

     let stripePromise: Promise<Stripe | null>;

     export const getStripe = (): Promise<Stripe | null> => {
       if (!stripePromise) {
         const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
         if (!publicKey) {
           console.error("Stripe publishable key is not set.");
           return Promise.resolve(null);
         }
         stripePromise = loadStripe(publicKey);
       }
       return stripePromise;
     };
     ```

  **3. Create Stripe Server Utility:**
     *   Create `lib/stripe/server.ts`:
     ```typescript
     // lib/stripe/server.ts
     import Stripe from 'stripe';

     const secretKey = process.env.STRIPE_SECRET_KEY;

     if (!secretKey) {
       console.error("Stripe secret key is not set.");
       // Throw an error or handle appropriately based on your app's needs
       // throw new Error("Stripe secret key is missing.");
     }

     // Initialize Stripe with error handling for missing key
     export const stripe = secretKey
       ? new Stripe(secretKey, {
           apiVersion: '2024-04-10', // Use the latest API version
           typescript: true,
         })
       : null; // Handle the case where the key might be missing

     if (!stripe) {
        console.warn("Stripe server instance could not be initialized due to missing secret key.");
     }
     ```

  **4. Create API Route or Server Action for Checkout Session:**
     *   Create `app/api/stripe/checkout-session/route.ts` (or a Server Action).

     ```typescript
     // app/api/stripe/checkout-session/route.ts
     import { NextResponse } from 'next/server';
     import { stripe } from '@/lib/stripe/server'; // Use server instance
     import { adminAuth, adminDb } from '@/lib/firebase/admin';
     import { Stripe } from 'stripe';

     export async function POST(request: Request) {
       if (!stripe) {
            return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
       }
       try {
         const authorization = request.headers.get('Authorization');
         if (!authorization?.startsWith('Bearer ')) {
           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
         }
         const idToken = authorization.split('Bearer ')[1];
         const decodedToken = await adminAuth.verifyIdToken(idToken);
         const userId = decodedToken.uid;

         const { priceId, quantity = 1 } = await request.json(); // Get priceId from request body

         if (!priceId) {
           return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
         }

         // Get user's potential existing Stripe Customer ID from Firestore
         const userRef = adminDb.collection('users').doc(userId);
         const userSnap = await userRef.get();
         const userData = userSnap.data();
         let stripeCustomerId = userData?.stripeCustomerId;

         // Create Stripe Customer if they don't have one
         if (!stripeCustomerId) {
           const customer = await stripe.customers.create({
             email: decodedToken.email,
             metadata: { firebaseUID: userId }, // Link Stripe customer to Firebase user
           });
           stripeCustomerId = customer.id;
           // Update Firestore with the new Stripe Customer ID
           await userRef.update({ stripeCustomerId: stripeCustomerId });
         }

         const successUrl = `${request.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`; // Redirect back to dashboard
         const cancelUrl = `${request.headers.get('origin')}/dashboard/pricing`; // Or wherever appropriate

         // Create the Checkout Session
         const session = await stripe.checkout.sessions.create({
           payment_method_types: ['card'],
           mode: 'subscription', // For recurring payments
           customer: stripeCustomerId, // Use existing or newly created customer ID
           line_items: [
             {
               price: priceId,
               quantity: quantity,
             },
           ],
           success_url: successUrl,
           cancel_url: cancelUrl,
           metadata: {
             firebaseUID: userId, // Pass Firebase UID for webhook reference
             priceId: priceId,
           }
         });

         if (!session.url) {
            throw new Error("Stripe session URL not found");
         }

         return NextResponse.json({ sessionId: session.id, url: session.url });

       } catch (error) {
         console.error('Error creating checkout session:', error);
         const message = error instanceof Error ? error.message : 'Unknown error';
         return NextResponse.json({ error: 'Failed to create checkout session', details: message }, { status: 500 });
       }
     }
     ```

  **5. Implement Frontend Button Logic:**
     *   On your pricing page (or wherever users select a plan), add buttons that call a function to initiate checkout.

     ```typescript
     // Example in a Pricing component
     import { getStripe } from '@/lib/stripe/client';
     import { useAuth } from '@/context/AuthContext';
     import { Button } from '@/components/ui/button';
     import { useState } from 'react';
     import { Loader2 } from 'lucide-react';

     interface PricingCardProps {
        planName: string;
        priceId: string; // e.g., process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD_MONTHLY
     }

     function PricingCard({ planName, priceId }: PricingCardProps) {
       const { user } = useAuth();
       const [isLoading, setIsLoading] = useState(false);

       const handleCheckout = async () => {
         if (!user) {
           // Redirect to login or show message
           console.log("User not logged in");
           return;
         }
         setIsLoading(true);
         try {
           const idToken = await user.getIdToken();
           const response = await fetch('/api/stripe/checkout-session', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${idToken}`,
             },
             body: JSON.stringify({ priceId: priceId }),
           });

           const session = await response.json();

           if (response.ok && session.url) {
             // Redirect to Stripe Checkout
             const stripe = await getStripe();
             if (stripe) {
                // Redirecting via session.url is simpler and often preferred
                window.location.href = session.url;
                // Alternatively, use stripe.redirectToCheckout({ sessionId: session.sessionId });
             } else {
                throw new Error("Stripe.js failed to load.");
             }
           } else {
             throw new Error(session.error || 'Failed to create checkout session');
           }
         } catch (error) {
           console.error("Checkout error:", error);
           // Show error toast to user
           setIsLoading(false);
         }
         // No need to setIsLoading(false) on success because of redirect
       };

       return (
         <Button onClick={handleCheckout} disabled={isLoading}>
           {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
           Choose {planName}
         </Button>
       );
     }
     ```
</task>

## Task 11: Implement Stripe Webhook Handler
<task>
  <goal>Create an API route to securely handle incoming webhooks from Stripe and update Firestore accordingly.</goal>
  <context>Webhooks are essential for reliably updating subscription status, usage limits, etc., based on events happening in Stripe (like successful payments or cancellations).</context>

  **1. Create Webhook API Route:**
     *   Create `app/api/stripe/webhook/route.ts`.

     ```typescript
     // app/api/stripe/webhook/route.ts
     import { NextResponse } from 'next/server';
     import Stripe from 'stripe';
     import { stripe } from '@/lib/stripe/server'; // Use server instance
     import { adminDb } from '@/lib/firebase/admin';
     import { headers } from 'next/headers'; // Import headers
     import { Timestamp } from 'firebase-admin/firestore';

     const relevantEvents = new Set([
       'checkout.session.completed',
       'customer.subscription.updated',
       'customer.subscription.deleted',
       'invoice.payment_succeeded',
       'invoice.payment_failed',
     ]);

     export async function POST(request: Request) {
        if (!stripe) {
            console.error("Stripe webhook handler: Stripe not configured.");
            return new NextResponse('Stripe configuration error', { status: 500 });
        }

       const body = await request.text();
       const sig = headers().get('stripe-signature'); // Use headers() from next/headers
       const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

       if (!sig || !webhookSecret) {
         console.error("Stripe webhook handler: Missing signature or secret.");
         return new NextResponse('Webhook secret not configured', { status: 400 });
       }

       let event: Stripe.Event;

       try {
         event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
         console.log(`Stripe webhook received: ${event.type}`);
       } catch (err: any) {
         console.error(`Webhook signature verification failed: ${err.message}`);
         return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
       }

       // --- Handle Specific Events ---
       if (relevantEvents.has(event.type)) {
         try {
           switch (event.type) {
             case 'checkout.session.completed': {
               const session = event.data.object as Stripe.Checkout.Session;
               // Check if metadata exists before accessing it
               const firebaseUID = session.metadata?.firebaseUID;
               const priceId = session.metadata?.priceId; // Get priceId used for checkout

               if (!firebaseUID || !session.customer || !session.subscription || !priceId) {
                 console.error('Missing data in checkout.session.completed:', session.id);
                 break; // Or handle error more robustly
               }

               // Determine tier based on priceId
               let tier: 'standard' | 'pro' | 'free' = 'free'; // Default to free
               if (priceId === process.env.STRIPE_PRICE_ID_STANDARD_MONTHLY /* || priceId === process.env.STRIPE_PRICE_ID_STANDARD_YEARLY */) {
                 tier = 'standard';
               } else if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY /* || priceId === process.env.STRIPE_PRICE_ID_PRO_YEARLY */) {
                 tier = 'pro';
               }

               // Update user document in Firestore
               const userRef = adminDb.collection('users').doc(firebaseUID);
               await userRef.update({
                 subscriptionTier: tier,
                 subscriptionId: session.subscription,
                 stripeCustomerId: session.customer, // Ensure customer ID is stored
                 docCountMonth: 0, // Reset count on new subscription/checkout
                 lastResetDate: Timestamp.now(), // Set billing cycle start
               });
               console.log(`User ${firebaseUID} subscribed to ${tier} tier.`);
               break;
             }

             case 'customer.subscription.updated': {
               const subscription = event.data.object as Stripe.Subscription;
               const stripeCustomerId = subscription.customer as string;
               const priceId = subscription.items.data[0]?.price.id; // Get current priceId

               // Find user by Stripe Customer ID
               const usersRef = adminDb.collection('users');
               const q = usersRef.where('stripeCustomerId', '==', stripeCustomerId).limit(1);
               const userSnapshot = await q.get();

               if (userSnapshot.empty) {
                 console.error(`User not found for Stripe customer ID: ${stripeCustomerId}`);
                 break;
               }
               const userDoc = userSnapshot.docs[0];
               const firebaseUID = userDoc.id;

               // Determine tier based on priceId
               let tier: 'standard' | 'pro' | 'free' = 'free';
               if (priceId === process.env.STRIPE_PRICE_ID_STANDARD_MONTHLY /* || ... */) {
                 tier = 'standard';
               } else if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY /* || ... */) {
                 tier = 'pro';
               }

               // Handle subscription status changes (e.g., cancellation)
               const updateData: any = {
                 subscriptionTier: tier,
                 subscriptionId: subscription.id,
               };

               if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                 updateData.subscriptionTier = 'free'; // Downgrade on cancellation/failure
                 // Optionally keep subscriptionId for history?
               } else if (subscription.status === 'active') {
                 updateData.subscriptionTier = tier; // Ensure tier is correct on update
               }

               // Update Firestore
               await userDoc.ref.update(updateData);
               console.log(`Subscription updated for user ${firebaseUID}. New tier: ${updateData.subscriptionTier}, Status: ${subscription.status}`);
               break;
             }

             case 'customer.subscription.deleted': {
               const subscription = event.data.object as Stripe.Subscription;
               const stripeCustomerId = subscription.customer as string;

               // Find user and downgrade to free
               const usersRef = adminDb.collection('users');
               const q = usersRef.where('stripeCustomerId', '==', stripeCustomerId).limit(1);
               const userSnapshot = await q.get();

               if (!userSnapshot.empty) {
                 const userDoc = userSnapshot.docs[0];
                 await userDoc.ref.update({
                   subscriptionTier: 'free',
                   // Optionally clear subscriptionId: null
                 });
                 console.log(`Subscription deleted for user ${userDoc.id}. Downgraded to free.`);
               } else {
                 console.error(`User not found for Stripe customer ID during subscription deletion: ${stripeCustomerId}`);
               }
               break;
             }

             case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = invoice.subscription;
                const customerId = invoice.customer;

                if (invoice.billing_reason === 'subscription_cycle' && subscriptionId && customerId) {
                    // Payment for a renewal succeeded
                    // Find user by customer ID
                    const usersRef = adminDb.collection('users');
                    const q = usersRef.where('stripeCustomerId', '==', customerId).limit(1);
                    const userSnapshot = await q.get();

                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        // Reset monthly document count and update billing cycle date
                        await userDoc.ref.update({
                            docCountMonth: 0,
                            lastResetDate: Timestamp.now(),
                        });
                        console.log(`Monthly document count reset for user ${userDoc.id} after successful renewal.`);
                    }
                }
                break;
             }

             // Add case for 'invoice.payment_failed' if needed (e.g., notify user, temporarily restrict access)

             default:
               console.warn(`Unhandled relevant event type: ${event.type}`);
           }
         } catch (error) {
           console.error(`Error handling Stripe event ${event.type}:`, error);
           // Return 500 to signal Stripe to retry (if applicable)
           return new NextResponse('Webhook handler failed', { status: 500 });
         }
       } else {
         console.log(`Ignoring irrelevant Stripe event type: ${event.type}`);
       }

       // Return 200 OK to Stripe
       return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
     }

     ```
</task>

## Task 12: Implement Usage Tracking and Limit Enforcement
<task>
  <goal>Track document processing usage per user and enforce limits based on their subscription tier.</goal>
  <context>This prevents users from exceeding their plan limits and ensures the pricing model is effective.</context>

  **1. Update Firestore User Model:**
     *   Ensure the `UserProfile` interface and Firestore documents include:
         *   `docCountMonth`: number (Initialize to 0)
         *   `lastResetDate`: Timestamp (Initialize to when subscription starts/renews)
         *   `subscriptionTier`: 'free' | 'standard' | 'pro'

  **2. Increment Usage Count:**
     *   Modify the **Firebase Function** (`functions/src/index.ts`) to increment the user's `docCountMonth` *after* successful processing.

     ```typescript
     // Inside the processDocumentOnUpload function in functions/src/index.ts
     // AFTER successfully updating status to 'completed'

     // ... inside the try block, after updating status to 'completed'
     try {
         const userRef = db.collection('users').doc(userId);
         // Use Firestore atomic increment
         await userRef.update({
             docCountMonth: admin.firestore.FieldValue.increment(1)
         });
         logger.log(`Incremented docCountMonth for user ${userId}.`);
     } catch (incrementError) {
         logger.error(`Failed to increment docCountMonth for user ${userId}:`, incrementError);
         // Decide how to handle this - maybe log and continue, or retry?
     }
     // ... rest of the success logic
     ```

  **3. Implement Limit Check:**
     *   Modify the **Upload API Route** (`app/api/stripe/checkout-session/route.ts`) to check limits *before* allowing an upload.

     ```typescript
     // Inside the POST function in app/api/upload/route.ts
     // AFTER verifying authentication and getting userId

     // ... after verifying token and getting userId
     const userId = decodedToken.uid;

     // --- Check Usage Limits ---
     const userRef = adminDb.collection('users').doc(userId);
     const userSnap = await userRef.get();
     if (!userSnap.exists) {
         // This case might happen if user doc creation failed during signup
         // Handle appropriately - maybe create the doc here or deny upload
         return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
     }
     const userData = userSnap.data() as UserProfile | undefined; // Use your UserProfile type

     const tier = userData?.subscriptionTier || 'free';
     const currentCount = userData?.docCountMonth || 0;

     let limit = 20; // Default free limit
     if (tier === 'standard') {
         limit = 250;
     } else if (tier === 'pro') {
         limit = 1000;
     }

     if (currentCount >= limit) {
         console.log(`User ${userId} (${tier} tier) exceeded limit: ${currentCount}/${limit}`);
         return NextResponse.json({
             error: `Monthly document limit (${limit}) reached. Please upgrade your plan or wait until the next billing cycle.`,
             limitReached: true
         }, { status: 429 }); // 429 Too Many Requests is appropriate
     }
     // --- End Limit Check ---

     // ... rest of the upload logic (Process FormData, Upload to Storage, Create Firestore Doc)
     ```

  **4. Update Frontend Upload Component:**
     *   Handle the `429` status code or the `limitReached` flag in the response to inform the user.

     ```typescript
     // Inside handleUpload in app/(dashboard)/dashboard/upload/page.tsx

     // ... inside the try block, after making the fetch call
     if (!uploadResponse.ok) {
         const errorData = await uploadResponse.json();
         if (uploadResponse.status === 429 && errorData.limitReached) {
             // Specific handling for limit reached
             setError(errorData.error); // Show the specific error message
             toast({ title: "Limit Reached", description: errorData.error, variant: "destructive" });
             setUploadStage(UploadStage.ERROR); // Use error stage to show message
         } else {
             // General error handling
             throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
         }
         return; // Stop further processing in case of error
     }
     // ... rest of the success handling
     ```

  **5. Billing Cycle Reset:**
     *   The webhook handler for `invoice.payment_succeeded` (Task 11) already includes logic to reset `docCountMonth` and update `lastResetDate` upon successful renewal. Ensure this is correctly implemented.
</task>

**Phase 2 Summary:**

*   Gemini API costs are understood, and a pricing model is defined.
*   Stripe products and prices are created.
*   Stripe Checkout is integrated for subscribing to paid plans.
*   A webhook handler updates user subscription status and resets usage counts in Firestore based on Stripe events.
*   Usage limits are enforced before allowing document uploads.

---

**Phase 3: Security Hardening, Refinement & Launch Prep**

This phase focuses on improving security, refining the user experience, ensuring the landing page is accurate, and preparing for deployment.

```markdown
# Phase 3: Security Hardening, Refinement & Launch Prep

## Task 13: Enhance Security Rules
<task>
  <goal>Refine Firestore and Storage security rules for better granularity and protection.</goal>
  <context>The initial rules are basic. Production rules need to be more specific, especially regarding data validation and function access.</context>

  **1. Firestore Rule Refinements:**
     *   **Data Validation:** Add validation checks within `write` rules to ensure data integrity (e.g., `userId` matches auth uid, status transitions are valid, required fields exist).
       ```
       // Example for documents collection write rule
       allow write: if request.auth != null && request.auth.uid == request.resource.data.userId
                     // Allow creation with specific fields
                     && (request.method == 'create' && request.resource.data.keys().hasAll(['userId', 'fileName', 'storagePath', 'contentType', 'fileSize', 'uploadTimestamp', 'status']) && request.resource.data.status == 'uploaded')
                     // Allow updates only for specific fields by user (e.g., prompt) or backend (status, data)
                     || (request.method == 'update' && request.auth.uid == resource.data.userId
                         // Allow user to update prompt/options maybe?
                         // && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['extractionPrompt', 'extractionOptions'])
                         // OR allow backend updates (needs better mechanism than just checking auth != null)
                         // For now, rely on Admin SDK bypassing rules, but consider custom claims or function identity checks later.
                     );
       ```
     *   **User Profile Updates:** Be specific about which fields a user can update themselves (e.g., `displayName`, `photoURL`) vs. fields updated by backend (subscription status).
       ```
       // Example for users collection update rule
       allow update: if request.auth != null && request.auth.uid == userId
                      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName', 'photoURL' /* add other user-editable fields */]);
       ```

  **2. Storage Rule Refinements:**
     *   Consider adding rules based on file metadata if needed (e.g., restricting uploads based on custom metadata set during upload).
     *   Ensure rules correctly handle potential path variations if your structure changes.

  **3. Function Access (Advanced):**
     *   **Challenge:** Firebase Functions using the Admin SDK bypass security rules by default. This is convenient but less secure if rules are complex.
     *   **Potential Solutions (Consider later if needed):**
         *   **Custom Claims:** Set a custom claim (e.g., `isAdmin: true` or `isFunction: true`) on a service account or during function execution and check `request.auth.token.isFunction == true` in rules. This is complex to set up.
         *   **Callable Functions:** Use Callable Functions which provide user authentication context (`context.auth`).
         *   **Granular Admin SDK:** Initialize the Admin SDK with specific user credentials for specific operations (very complex).
     *   **Recommendation:** For now, rely on the Admin SDK bypass but ensure your *function logic* rigorously validates inputs and permissions.

  **4. Test Rules:**
     *   Use the Firebase Emulator Suite (`firebase emulators:start`) to test your security rules locally before deploying.
     *   Write unit tests for your security rules using `@firebase/rules-unit-testing`.
</task>

## Task 14: Secure API Keys and Environment Variables
<task>
  <goal>Ensure all sensitive keys (Firebase Service Account, Stripe Secret, Gemini API) are securely managed and not exposed client-side.</goal>
  <context>Accidental exposure of secret keys is a major security risk.</context>

  **1. Review Environment Variables:**
     *   Double-check that `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`, and `FIREBASE_SERVICE_ACCOUNT_BASE64` (or `GOOGLE_APPLICATION_CREDENTIALS`) are **NOT** prefixed with `NEXT_PUBLIC_`.
     *   Ensure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_FIREBASE_*` (client config) *are* prefixed correctly.

  **2. Vercel Configuration:**
     *   Verify all necessary environment variables are set in your Vercel project settings. Use the "Secret" type for sensitive keys.

  **3. Code Review:**
     *   Search your codebase (especially frontend components and client-side `lib` files) for any hardcoded keys or accidental usage of server-side environment variables.
     *   Ensure server-side logic (API routes, Server Actions, Firebase Functions) correctly accesses server-only variables using `process.env`.

  **4. `.gitignore`:**
     *   Confirm `.env.local` and any service account JSON files are in `.gitignore`.
</task>

## Task 15: Refactor Code and Improve Error Handling/Logging
<task>
  <goal>Improve code quality, consistency, error handling, and logging throughout the application.</goal>
  <context>Maintainable and robust code is crucial for a production application.</context>

  **1. Server Actions vs. API Routes:**
     *   Consider migrating some API routes (like `/api/upload`, `/api/stripe/checkout-session`) to Next.js Server Actions if it simplifies data fetching or mutations initiated from Server Components. Keep API routes for webhooks or external integrations.
     *   Ensure Server Actions use `use server;` directive and handle errors gracefully.

  **2. Error Handling:**
     *   Wrap critical operations (API calls, database writes, file operations) in `try...catch` blocks in both frontend and backend code.
     *   Provide informative error messages to the user via toasts (`useToast`).
     *   Log detailed errors server-side (using `console.error` in Next.js API/Server Actions, and `functions.logger` in Firebase Functions) for debugging.

  **3. Logging:**
     *   Implement structured logging in Firebase Functions (`logger.info`, `logger.warn`, `logger.error`).
     *   Add relevant logging in API routes/Server Actions to trace requests.
     *   Consider a dedicated logging service (like Sentry, Logtail) for production monitoring.

  **4. Code Consistency:**
     *   Review code against your Cursor rules (`.cursor/rules/`).
     *   Ensure consistent naming conventions, component structure (`use client`/`use server`), and import paths (`@/`).
     *   Refactor large components or functions into smaller, reusable units.

  **5. Frontend UX:**
     *   Ensure loading states (`Loader2`) are used consistently during data fetching, uploads, and processing.
     *   Provide clear feedback on success/failure of operations.
     *   Improve the `DocumentViewer` and `DataVisualizer` interaction (highlighting, selection).
</task>

## Task 16: Update Landing Page Content
<task>
  <goal>Ensure the landing page (`app/(marketing)/page.tsx`) accurately reflects the *actual* features and capabilities of the application.</goal>
  <context>Avoid misrepresenting features. Authenticity builds trust.</context>

  **1. Review `app/(marketing)/page.tsx`:**
     *   Read through all sections (Hero, Features, How It Works, Pricing, Testimonials, FAQ).
     *   **Features:** Verify that listed features (e.g., "99% accuracy", specific document types, integrations, batch processing, custom templates) are *actually implemented* or realistically planned for the near future. Remove or rephrase anything that isn't true.
     *   **How It Works:** Ensure the steps accurately describe the user flow (Upload -> AI Processing -> Review/Export).
     *   **Pricing:** Update the pricing section to match the tiers defined in Task 8. Ensure feature lists for each tier are correct.
     *   **Testimonials:** Use real testimonials if possible, or clearly mark them as examples if placeholders.
     *   **General Copy:** Ensure the language reflects the current state and value proposition.

  **2. Update Visuals:**
     *   Replace placeholder images/screenshots (like `/landing/ingestio_dashboard.png`, `/landing/document-extraction.jpg`) with actual screenshots or relevant visuals from your application.
</task>

## Task 17: Final Testing and Deployment Prep
<task>
  <goal>Conduct thorough testing across different scenarios and prepare the application for deployment.</goal>
  <context>Catch bugs and ensure a smooth user experience before going live.</context>

  **1. Functional Testing:**
     *   Test the entire user flow: Signup -> Login -> Upload (different file types) -> Review -> Confirm -> History -> Logout.
     *   Test plan selection and Stripe Checkout (in Test mode).
     *   Test webhook handling using Stripe CLI or test payments.
     *   Test usage limit enforcement (try uploading beyond the limit).
     *   Test error scenarios (invalid file type, failed extraction, failed payment).
     *   Test on different browsers and screen sizes (responsive design).

  **2. Security Testing:**
     *   Attempt to access/modify data belonging to other users (should be blocked by rules).
     *   Check browser developer tools for exposed keys.
     *   Review Firebase Security Rules simulator results.

  **3. Performance Testing (Basic):**
     *   Check page load times (Lighthouse in browser dev tools).
     *   Monitor function execution times in Firebase logs.

  **4. Deployment Configuration (Vercel):**
     *   Ensure all environment variables (Firebase client/admin, Stripe, Gemini) are correctly set in Vercel project settings.
     *   Verify build settings (framework preset should be Next.js).
     *   Connect your GitHub repository for automatic deployments.

  **5. Pre-Launch Checklist:**
     *   Set up custom domain.
     *   Switch Stripe to Live mode (update API keys in Vercel).
     *   Update Stripe webhook endpoint URL to the production URL.
     *   Consider setting up basic monitoring/alerting.
     *   Review Firebase usage quotas and set budget alerts.
</task>

```

**Important Considerations:**

1.  **Cost:** Be mindful of Firebase (Firestore reads/writes, Storage bandwidth/operations, Function invocations/runtime) and Gemini API costs. Monitor usage closely after launch.
2.  **Error Handling & Resilience:** Production apps need robust error handling, retries for transient errors (especially in functions), and monitoring.
3.  **Scalability:** While Firebase scales well, optimize Firestore queries (use indexes) and function performance as usage grows.
4.  **Security (Ongoing):** Regularly review security rules and dependencies. Stay updated on best practices.
5.  **Local Development:** Use the Firebase Emulator Suite (`firebase emulators:start`) to test Firestore, Functions, and Auth locally without incurring costs or affecting production data. Use the Stripe CLI (`stripe listen`) to test webhooks locally.

This plan provides a structured path. Remember to break down each task further as you work on it. Good luck!