// /Users/moe/app/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <-- Your OLD global CSS (KEEP THIS)
import "./auth-theme.css"; // <-- Your NEW scoped auth CSS (ADD THIS) - Assuming it's in the /app directory
// If auth-theme.css is in /styles, use: import "@/styles/auth-theme.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ingestio.io - Streamline Your Document Workflow",
  description: "Automated data extraction and document processing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Body will inherit styles from the OLD globals.css by default */}
      <body className={`${inter.className} antialiased`}>
        {/* Providers likely handles theme, etc. Keep it wrapping AuthProvider */}
        <Providers>
          {/* AuthProvider handles authentication state */}
          <AuthProvider>
            {/* Children will be the page content (e.g., Login, Signup, Dashboard) */}
            {children}
            {/* Toaster for notifications */}
            <Toaster />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}