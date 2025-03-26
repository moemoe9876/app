"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      console.log("Auth State Changed:", currentUser ? currentUser.uid : 'No user');
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (redirectPath: string = '/dashboard') => {
    toast({ title: "Success", description: "Authentication successful!" });
    router.push(redirectPath);
  };

  const handleAuthError = (error: any, action: string) => {
    console.error(`${action} Error:`, error);
    let description = "An unexpected error occurred. Please try again.";
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          description = "Invalid email or password.";
          break;
        case 'auth/email-already-in-use':
          description = "This email address is already in use.";
          break;
        case 'auth/weak-password':
          description = "Password is too weak. Please choose a stronger password.";
          break;
        case 'auth/popup-closed-by-user':
          description = "Google Sign-in popup closed before completion.";
          break;
        case 'auth/cancelled-popup-request':
           description = "Multiple sign-in popups opened. Please try again.";
           break;
        default:
          description = error.message || description;
      }
    }
    toast({ title: "Authentication Failed", description, variant: "destructive" });
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      handleAuthSuccess();
    } catch (error) {
      handleAuthError(error, "Google Sign-In");
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      handleAuthSuccess();
    } catch (error) {
      handleAuthError(error, "Email Sign-Up");
      throw error; // Re-throw to allow form to handle specific errors if needed
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleAuthSuccess();
    } catch (error) {
      handleAuthError(error, "Email Sign-In");
      throw error; // Re-throw to allow form to handle specific errors if needed
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/'); // Redirect to landing page after sign out
    } catch (error) {
      console.error("Sign Out Error:", error);
      toast({ title: "Sign Out Failed", description: "Could not sign out. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 