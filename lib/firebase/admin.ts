import * as admin from 'firebase-admin';
import { getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// Import service account JSON directly for development
// In production, we'll use environment variables
import serviceAccount from '../../firebase-service-account.json';

// Initialize Firebase Admin SDK if it hasn't been initialized
function initializeFirebaseAdmin() {
  const apps = getApps();
  
  if (!apps.length) {
    try {
      // Check if we're in a production environment
      if (process.env.NODE_ENV === 'production') {
        // In production, use environment variables
        // The service account JSON should be stored as an environment variable
        // The environment variable should be a JSON string
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        
        if (!serviceAccountJson) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
        }
        
        // Parse the JSON string to an object
        const serviceAccountObject = JSON.parse(serviceAccountJson);
        
        admin.initializeApp({
          credential: cert(serviceAccountObject),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      } else {
        // In development, use the imported service account JSON file
        admin.initializeApp({
          credential: cert(serviceAccount as admin.ServiceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      }
      
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  
  return admin;
}

// Initialize Admin SDK
const adminInstance = initializeFirebaseAdmin();

// Get Firestore instance
export const db: Firestore = getFirestore();

// Get Storage instance
export const storage: Storage = getStorage();

/**
 * Utility functions for Firestore operations
 */

// Get a document by ID from a collection
export async function getDocument<T>(
  collection: string,
  id: string
): Promise<T | null> {
  try {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() } as T;
  } catch (error) {
    console.error(`Error getting document ${id} from ${collection}:`, error);
    throw error;
  }
}

// Create or update a document
export async function setDocument<T>(
  collection: string,
  id: string,
  data: T
): Promise<void> {
  try {
    await db.collection(collection).doc(id).set(data, { merge: true });
  } catch (error) {
    console.error(`Error setting document ${id} in ${collection}:`, error);
    throw error;
  }
}

// Update a document
export async function updateDocument<T>(
  collection: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  try {
    await db.collection(collection).doc(id).update(data);
  } catch (error) {
    console.error(`Error updating document ${id} in ${collection}:`, error);
    throw error;
  }
}

// Delete a document
export async function deleteDocument(
  collection: string,
  id: string
): Promise<void> {
  try {
    await db.collection(collection).doc(id).delete();
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collection}:`, error);
    throw error;
  }
}

/**
 * Utility functions for Storage operations
 */

// Generate a signed URL for accessing a file
export async function getSignedUrl(
  filePath: string,
  expirationMinutes = 15
): Promise<string> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expirationMinutes * 60 * 1000,
    });
    
    return url;
  } catch (error) {
    console.error(`Error generating signed URL for ${filePath}:`, error);
    throw error;
  }
}

// Upload a file to Storage from a buffer or stream
export async function uploadFile(
  filePath: string,
  fileBuffer: Buffer,
  metadata?: admin.storage.UploadOptions
): Promise<void> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    
    await file.save(fileBuffer, metadata);
  } catch (error) {
    console.error(`Error uploading file to ${filePath}:`, error);
    throw error;
  }
}

// Download a file from Storage
export async function downloadFile(filePath: string): Promise<Buffer> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    console.error(`Error downloading file from ${filePath}:`, error);
    throw error;
  }
}

// Delete a file from Storage
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    
    await file.delete();
  } catch (error) {
    console.error(`Error deleting file at ${filePath}:`, error);
    throw error;
  }
}

export default adminInstance;

