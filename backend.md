Okay, this is a significant and crucial step. Integrating Firestore and Cloud Storage requires careful planning, especially regarding data structure and security. Let's break down the process logically.

**Core Concepts:**

1.  **Firestore:** Our primary database for structured metadata. We'll store information *about* users and documents (like filenames, user IDs, extraction status, prompts, metadata, potentially small extracted results).
2.  **Cloud Storage:** Used for storing the actual large binary files (uploaded PDFs/images) and potentially the larger JSON files containing extracted data if they exceed Firestore's limits or if you prefer separation.
3.  **Firebase Authentication:** The source of truth for user identity (`uid`). We'll link Firestore data and Storage files to the authenticated user's `uid`.
4.  **Security Rules:** Essential for protecting user data. Rules will ensure users can only access/modify their *own* documents and files.
5.  **Firebase Admin SDK:** Used securely on the backend (API routes/Server Actions) for privileged operations if needed (though client SDK + security rules handle most cases here).
6.  **Firebase Client SDK:** Used on the frontend to interact with Firestore/Storage, respecting security rules.

**Integration Plan:**

**Phase 1: Setup & Configuration**

1.  **Enable Firestore & Storage:**
    *   Go to your Firebase Console.
    *   Navigate to "Firestore Database" -> "Create database". Choose **Native mode** and select a server location close to your users. Start in **Test mode** for initial development (`allow read, write: if true;`), but **immediately plan to replace these with secure rules (Phase 3)**.
    *   Navigate to "Storage" -> "Get started". Follow the prompts. Note your bucket URL (usually `your-project-id.appspot.com`). Again, start with test rules (`allow read, write: if true;`) and **plan to secure them (Phase 3)**.
2.  **Install Admin SDK (for Backend):**
    ```bash
    npm install firebase-admin
    # or
    yarn add firebase-admin
    # or
    pnpm add firebase-admin
    ```
3.  **Secure Service Account Key:**
    *   **Crucially:** Your `service_account.json` file grants *full admin access*. **NEVER** commit it or expose it client-side.
    *   **Best Practice:** Store the *entire JSON content* as a single environment variable.
    *   Add this to your `.env.local` (make sure this file is in `.gitignore`):
        ```bash
        # .env.local
        FIREBASE_SERVICE_ACCOUNT_JSON='{ "type": "service_account", "project_id": "...", ... }' # Paste the entire JSON content here as a single line string
        ```
    *   For production (Vercel, etc.), set this environment variable securely through the hosting provider's dashboard.
4.  **Initialize Admin SDK (Backend):** Create a file to initialize the Admin SDK *only for backend use*.
    ```typescript
    // lib/firebase/admin.ts
    import admin from 'firebase-admin';
    import { getApps, initializeApp, cert } from 'firebase-admin/app';
    import { getFirestore } from 'firebase-admin/firestore';
    import { getStorage } from 'firebase-admin/storage';

    // Parse the service account key from the environment variable
    let serviceAccount;
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Admin SDK might not initialize properly.");
      }
    } catch (error) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:", error);
      serviceAccount = undefined; // Ensure it's undefined if parsing fails
    }

    // Initialize Firebase Admin SDK only if it hasn't been initialized yet
    if (!getApps().length && serviceAccount) {
      try {
        initializeApp({
          credential: cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET // Get bucket name from public env vars
        });
        console.log("Firebase Admin SDK Initialized");
      } catch (error) {
        console.error("Firebase Admin SDK Initialization Error:", error);
      }
    } else if (!serviceAccount) {
       console.warn("Firebase Admin SDK not initialized because service account key is missing or invalid.");
    }


    const adminDb = admin.firestore();
    const adminStorage = admin.storage();
    const adminAuth = admin.auth(); // If needed for backend auth tasks

    export { adminDb, adminStorage, adminAuth };
    ```
5.  **Update Client SDK Initialization:** Add Firestore and Storage to the client setup.
    ```typescript
    // lib/firebase/client.ts
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getAuth, GoogleAuthProvider } from "firebase/auth";
    import { getFirestore } from "firebase/firestore"; // Add Firestore
    import { getStorage } from "firebase/storage";   // Add Storage

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app); // Initialize Firestore client
    const storage = getStorage(app); // Initialize Storage client
    const googleProvider = new GoogleAuthProvider();

    export { app, auth, db, storage, googleProvider }; // Export db and storage
    ```

**Phase 2: Data Modeling & User Profile Sync**

1.  **Firestore Collections:**
    *   **`users`**: Stores additional user data. Document ID = Firebase Auth `uid`.
        *   Fields: `email` (string), `name` (string, optional), `createdAt` (timestamp), `plan` (string, e.g., 'free', 'pro'), etc.
    *   **`documents`**: Stores metadata for each uploaded document.
        *   Fields:
            *   `userId`: (string, **indexed**) - Links to the `users` collection (`uid`). **Crucial for security rules.**
            *   `originalFileName`: (string) - Name of the uploaded file.
            *   `storagePath`: (string) - Full path in Firebase Storage (e.g., `uploads/{userId}/{documentId}/{fileName}`).
            *   `fileType`: (string) - Mime type (e.g., 'application/pdf').
            *   `fileSize`: (number) - Size in bytes.
            *   `uploadTimestamp`: (timestamp) - When uploaded.
            *   `status`: (string) - e.g., 'uploaded', 'processing', 'completed', 'failed', 'reviewing'. (**indexed**)
            *   `extractionPrompt`: (string) - User's prompt.
            *   `extractionOptions`: (map/object) - Options used.
            *   `extractedDataStoragePath`: (string, optional) - Path to the extracted JSON in Storage if stored separately.
            *   `extractedData`: (map/object, optional) - Store small results directly here (beware 1MB limit).
            *   `extractionMetadata`: (map/object, optional) - Metadata from the extraction API.
            *   `lastReviewedTimestamp`: (timestamp, optional)
            *   `errorMessage`: (string, optional) - If processing failed.
2.  **Cloud Storage Structure:**
    *   Use folders based on `userId` and `documentId` for organization and security rule simplicity.
    *   Example Path: `uploads/{userId}/{documentId}/{originalFileName.pdf}`
    *   Example Path for Extracted Data: `uploads/{userId}/{documentId}/extracted_data.json`
3.  **Sync User Profile on Signup/Login:** Modify `AuthContext` or use a Cloud Function trigger to create/update a user document in the `users` collection whenever a user signs up or logs in for the first time.
    ```typescript
    // context/AuthContext.tsx - Add Firestore interaction
    import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'; // Import Firestore functions
    import { db } from '@/lib/firebase/client'; // Import client db

    // ... inside AuthProvider ...

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { // Make async
        setUser(currentUser);
        if (currentUser) {
          // Check if user doc exists, create if not
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            try {
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                name: currentUser.displayName, // Get name from provider if available
                createdAt: serverTimestamp(),
                plan: 'free', // Default plan
              });
              console.log("Created user document in Firestore for:", currentUser.uid);
            } catch (dbError) {
              console.error("Error creating user document in Firestore:", dbError);
              // Handle error appropriately - maybe log out the user or show an error
            }
          }
        }
        setLoading(false);
        console.log("Auth State Changed:", currentUser ? currentUser.uid : 'No user');
      });

      return () => unsubscribe();
    }, []); // Add db to dependency array if needed, but it should be stable

    // ... rest of AuthContext ...
    ```

**Phase 3: Security Rules (CRITICAL)**

1.  **Create `firestore.rules`:** In your project root.
    ```firestore
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {

        // Users Collection: Only the user can read/write their own profile
        match /users/{userId} {
          allow read, update, delete: if request.auth != null && request.auth.uid == userId;
          allow create: if request.auth != null && request.auth.uid == userId; // Allow user to create their own doc
        }

        // Documents Collection: Only the owner can manage their documents
        match /documents/{documentId} {
          // Allow read only if the requesting user's ID matches the document's userId
          allow read: if request.auth != null && request.auth.uid == resource.data.userId;

          // Allow create only if the user is logged in AND the userId being set matches their own ID
          allow create: if request.auth != null && request.resource.data.userId == request.auth.uid
                        // Add validation for required fields on create
                        && request.resource.data.keys().hasAll(['userId', 'originalFileName', 'storagePath', 'fileType', 'fileSize', 'uploadTimestamp', 'status'])
                        && request.resource.data.userId is string
                        && request.resource.data.originalFileName is string
                        && request.resource.data.status == 'uploaded'; // Enforce initial status

          // Allow update only if the user owns the document
          // Prevent changing the userId
          allow update: if request.auth != null && request.auth.uid == resource.data.userId
                        && request.resource.data.userId == resource.data.userId; // Cannot change owner
                        // Add validation for updatable fields (e.g., status, extractedData, metadata)

          // Allow delete only if the user owns the document
          allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
        }
      }
    }
    ```
2.  **Create `storage.rules`:** In your project root.
    ```storage
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        // Match files within user-specific folders: uploads/{userId}/{documentId}/{fileName}
        match /uploads/{userId}/{documentId}/{allPaths=**} {
          // Allow read and write only if the userId in the path matches the authenticated user's ID
          allow read, write: if request.auth != null && request.auth.uid == userId;

          // More granular write (optional):
          // allow create: if request.auth != null && request.auth.uid == userId;
          // allow update: if request.auth != null && request.auth.uid == userId; // If needed
          // allow delete: if request.auth != null && request.auth.uid == userId;
        }

         // Deny access to all other paths by default
         match /{allPaths=**} {
           allow read, write: if false;
         }
      }
    }
    ```
3.  **Deploy Rules:** Use the Firebase CLI:
    ```bash
    firebase login
    firebase use your-project-id
    firebase deploy --only firestore:rules
    firebase deploy --only storage:rules
    ```
    **Replace your initial test rules immediately.**

**Phase 4: Backend API Route Modifications**

1.  **Refactor `/api/upload`:**
    *   Get the authenticated user's `uid` from the *client-side* context before making the API call (or pass ID token for backend verification if preferred, but client SDK + rules is often simpler). *Correction:* The API route itself doesn't easily get the client's auth state. The client needs to be authenticated, and the *Security Rules* will enforce ownership based on `request.auth.uid`.
    *   Modify the API route to accept `userId` (or derive it securely if using backend sessions/token verification). For now, we'll assume the client is authenticated and rules handle it.
    ```typescript
    // app/api/upload/route.ts
    import { NextResponse } from "next/server";
    import { v4 as uuidv4 } from "uuid";
    import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Use client SDK for storage upload
    import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore"; // Use client SDK for Firestore write
    import { storage, db, auth } from "@/lib/firebase/client"; // Use client SDK instances
    import { getCurrentUser } from "@/utils/auth"; // Helper to get current user (implement this)

    // Helper function (create this file or place appropriately)
    // utils/auth.ts
    import { auth } from '@/lib/firebase/client';
    export function getCurrentUser() {
        return new Promise((resolve, reject) => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe(); // Unsubscribe after getting the state once
                resolve(user);
            }, reject);
        });
    }


    // ... (keep ExtractionOptions interface) ...

    export async function POST(request: Request) {
      try {
        // --- Authentication Check ---
        // In a real API route, you'd ideally verify an ID token passed from the client
        // For simplicity here, we rely on the client being authenticated and security rules.
        // Let's simulate getting the user ID (replace with proper server-side auth if needed)
        const currentUser = auth.currentUser; // This might be null on the server!
        if (!currentUser) {
             // A better approach is to pass the ID token in the request header
             // and verify it using the Admin SDK. For now, rely on rules.
             // Or, make the client call Firestore/Storage directly.
             // Let's proceed assuming rules will catch unauthorized access.
             // A placeholder check:
             // return NextResponse.json({ error: "Authentication required" }, { status: 401 });
             console.warn("API Route: No authenticated user found on server-side check. Relying on Security Rules.");
             // We need the user ID for paths, this approach is flawed for serverless API routes
             // without passing the UID or verifying a token.

             // --- SAFER APPROACH: Client-Side Operations ---
             // It's often safer and simpler for the client to directly interact
             // with Firestore/Storage using the client SDK, letting Security Rules handle auth.
             // This API route might only be needed if there's complex backend logic
             // *before* saving, or if using the Admin SDK is necessary.

             // --- REVISED PLAN: Let client handle upload/doc creation ---
             // This API route might become unnecessary if the client does the work.
             // Let's comment out the backend logic and suggest client-side instead.

             /*
             const formData = await request.formData();
             const file = formData.get("file") as File;
             const extractionPrompt = formData.get("extractionPrompt") as string || "";
             const optionsJson = formData.get("options") as string;
             const userId = currentUser?.uid; // FLAWED: currentUser likely null here

             if (!userId) {
                 return NextResponse.json({ error: "User ID not found" }, { status: 401 });
             }
             if (!file) {
                 return NextResponse.json({ error: "No file provided" }, { status: 400 });
             }

             const options: ExtractionOptions = optionsJson ? JSON.parse(optionsJson) : { /* defaults * / };
             const documentId = uuidv4();
             const fileExtension = file.name.split('.').pop();
             const storageFileName = `original.${fileExtension}`; // Consistent naming
             const storagePath = `uploads/${userId}/${documentId}/${storageFileName}`;
             const storageRef = ref(storage, storagePath);

             // 1. Upload file to Storage
             await uploadBytes(storageRef, file);
             console.log("File uploaded to:", storagePath);

             // 2. Create Firestore document
             const docRef = doc(db, "documents", documentId);
             await setDoc(docRef, {
                 userId: userId,
                 originalFileName: file.name,
                 storagePath: storagePath,
                 fileType: file.type,
                 fileSize: file.size,
                 uploadTimestamp: serverTimestamp(),
                 status: 'uploaded',
                 extractionPrompt: extractionPrompt,
                 extractionOptions: options,
             });
             console.log("Firestore document created:", documentId);

             // 3. (Optional) Trigger extraction (e.g., via Cloud Function)

             return NextResponse.json({ documentId, message: "File uploaded successfully" });
             */

             // --- Suggestion ---
             return NextResponse.json({ error: "Deprecated: Client should handle upload directly to Firebase Storage and Firestore creation using the client SDK and Security Rules." }, { status: 400 });


      } catch (error) {
        console.error("Error in upload API:", error);
        return NextResponse.json(
          { error: "Failed to process upload request", details: (error as Error).message },
          { status: 500 }
        );
      }
    }
    ```
    *   **Conclusion:** Direct client-side upload/Firestore write is generally better for this use case when relying on security rules. The API route becomes less necessary unless doing complex pre-processing.

2.  **Refactor `/api/extract`:**
    *   This should ideally be an **asynchronous process**, perhaps triggered by a Cloud Function listening to new file uploads in Storage or new documents in Firestore.
    *   **If kept synchronous (simpler for now, but less robust):**
        *   Accept `documentId`.
        *   *Security:* Verify the requesting user owns the document (either via token verification + Admin SDK check or rely on client calling this *after* verifying ownership).
        *   Fetch the document metadata from Firestore using `documentId`.
        *   Get the `storagePath` from the metadata.
        *   Download the file from Storage (using Admin SDK is safer here if verifying token).
        *   Perform Gemini extraction.
        *   Save `extracted_data.json` to Storage (`uploads/{userId}/{documentId}/extracted_data.json`).
        *   Update the Firestore document: set `status: 'completed'`, `extractedDataStoragePath`, `extractionMetadata`, `extractionTimestamp`.
    *   **Recommendation:** Move extraction logic to the client *after* upload confirmation, or use Cloud Functions. Let's assume client-side for now.

3.  **Refactor `/api/documents/[id]` (GET):**
    *   This route is likely **unnecessary**. The client can fetch the document metadata directly from Firestore using the client SDK and `documentId`, relying on security rules.

4.  **Refactor `/api/documents/[id]/file` (GET):**
    *   This route is likely **unnecessary**. The client, after fetching the Firestore document metadata (which includes `storagePath`), can use the client Storage SDK's `getDownloadURL(ref(storage, storagePath))` function to get a publicly accessible (but potentially time-limited) URL for the file. Security rules on Storage ensure only the owner can get this URL.

5.  **Refactor `/api/documents/[id]/update` (POST):**
    *   This route is likely **unnecessary**. The client can update the Firestore document directly using the client SDK (`updateDoc`), relying on security rules to ensure ownership and field validation.

**Phase 5: Frontend Integration**

1.  **Upload Page (`app/(dashboard)/upload/page.tsx`):**
    *   Modify `handleUpload` to perform client-side operations:
        *   Get `currentUser` from `useAuth()`. Check if logged in.
        *   Generate `documentId` (UUID).
        *   Define `storagePath`.
        *   Use `uploadBytes` (from `firebase/storage`) to upload the file directly to the `storagePath`.
        *   Use `setDoc` (from `firebase/firestore`) to create the document metadata in the `documents` collection.
        *   Handle progress using `uploadTask` from `uploadBytesResumable` if needed.
        *   On success, store the `documentId` and transition to processing/complete state or redirect.
    *   **Trigger Extraction (Client-side approach):** After successful upload and Firestore document creation, make a call to your extraction logic (which might still be an API route like `/api/extract`, but now called *by the authenticated client* passing the `documentId`).
    ```typescript
    // app/(dashboard)/upload/page.tsx (Illustrative handleUpload modification)
    import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
    import { doc, setDoc, serverTimestamp } from "firebase/firestore";
    import { storage, db, auth } from "@/lib/firebase/client"; // Use client SDK
    import { useAuth } from "@/context/AuthContext";
    import { v4 as uuidv4 } from "uuid";
    // ... other imports

    // Inside UploadPage component
    const { user } = useAuth();

    const handleUpload = async () => {
        if (!file || !user) {
          setError(!user ? "You must be logged in to upload." : "Please select a file.");
          return;
        }

        setLoading(true);
        setUploadStage(UploadStage.PROCESSING);
        setProgress(0);
        setError(null);
        const documentId = uuidv4(); // Generate unique ID

        try {
            // 1. Upload file to Firebase Storage
            const fileExtension = file.name.split('.').pop();
            const storageFileName = `original.${fileExtension}`;
            const storagePath = `uploads/${user.uid}/${documentId}/${storageFileName}`;
            const storageRef = ref(storage, storagePath);

            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 50; // Upload is 50%
                    setProgress(progress);
                },
                (error) => {
                    console.error("Storage Upload Error:", error);
                    throw new Error(`Failed to upload file: ${error.code}`);
                },
                async () => {
                    // Upload completed successfully
                    console.log("File uploaded to Storage:", storagePath);
                    setProgress(50); // Mark upload as done

                    // 2. Create Firestore document metadata
                    const docRef = doc(db, "documents", documentId);
                    await setDoc(docRef, {
                        userId: user.uid,
                        originalFileName: file.name,
                        storagePath: storagePath,
                        fileType: file.type,
                        fileSize: file.size,
                        uploadTimestamp: serverTimestamp(),
                        status: 'uploaded', // Initial status
                        extractionPrompt: extractionPrompt,
                        extractionOptions: extractionOptions,
                    });
                    console.log("Firestore document created:", documentId);
                    setDocumentId(documentId); // Store for later use
                    setProgress(60); // Mark Firestore write done

                    // 3. Trigger Extraction (Client-side call to API or direct logic)
                    // Example: Calling an API route
                    const extractFormData = new FormData();
                    extractFormData.append('documentId', documentId);
                    // No need to send file again if API can fetch from Storage

                    // Simulate extraction progress
                    setProgress(70);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
                    setProgress(90);

                    // Assuming extraction happens elsewhere or is simulated
                    // In a real app, you'd poll status or use real-time updates
                    // For now, just transition to complete after a delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setProgress(100); // This triggers the useEffect to go to COMPLETE stage

                    // If extraction API returns data directly:
                    // const extractResponse = await fetch('/api/extract', { method: 'POST', body: extractFormData });
                    // if (!extractResponse.ok) throw new Error('Extraction failed');
                    // const extractionResult = await extractResponse.json();
                    // Update Firestore doc with extractionResult.data and metadata
                    // await updateDoc(docRef, { status: 'completed', extractedData: extractionResult.data, ... });
                    // setProgress(100);
                }
            );

        } catch (error) {
            console.error("Error processing upload:", error);
            setError(error instanceof Error ? error.message : "An unknown error occurred");
            setUploadStage(UploadStage.ERROR);
            setLoading(false);
        }
        // setLoading(false) will be handled by the uploadTask completion/error
    };

    // ... rest of component
    ```

2.  **History Page (`app/(dashboard)/dashboard/history/page.tsx`):**
    *   Use `useAuth` to get the current user's `uid`.
    *   Fetch documents directly from Firestore using the client SDK:
        *   Import `collection`, `query`, `where`, `orderBy`, `getDocs` from `firebase/firestore`.
        *   Create a query: `const q = query(collection(db, "documents"), where("userId", "==", user.uid), orderBy("uploadTimestamp", "desc"));`
        *   Use `getDocs(q)` to fetch the data within a `useEffect`.
        *   Map the results to your `sampleDocuments` structure.
3.  **Review Page (`app/(dashboard)/dashboard/review/[id]/page.tsx`):**
    *   Use `useAuth` to get `user`.
    *   Fetch document metadata directly from Firestore: `getDoc(doc(db, "documents", documentId))`. **Verify `docData.userId === user.uid` before proceeding.**
    *   Get the PDF download URL: Use `getDownloadURL(ref(storage, docData.storagePath))`. Pass this URL to `DocumentViewer`.
    *   Fetch extracted data: If stored in Firestore, use `docData.extractedData`. If stored in Storage (`docData.extractedDataStoragePath`), use `getDownloadURL` for the JSON file and fetch its content.
    *   Save Edits: Use `updateDoc(doc(db, "documents", documentId), { extractedData: updatedData, status: 'reviewing' })` directly from the client. Security rules handle permissions.

**Phase 6: Refinement**

1.  **Loading/Error States:** Implement robust loading and error states on all pages interacting with Firebase.
2.  **Indexing:** Add Firestore indexes for `userId` and `status` on the `documents` collection via the Firebase Console to optimize history queries.
3.  **Cleanup:** Consider adding Cloud Functions to delete Storage files when a Firestore document is deleted.
4.  **Code Quality:** Ensure consistent error handling, use async/await properly, add comments.

This detailed plan shifts primary data interaction to the client-side SDKs, leveraging Firebase's security rules for authorization, which is often more straightforward and secure for web applications than managing backend sessions or token verification in simple API routes. Remember to replace the test rules with the secure ones **early** in your development process.