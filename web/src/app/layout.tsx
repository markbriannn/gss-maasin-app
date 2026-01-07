import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ToastNotification from "@/components/ToastNotification";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GSS Maasin - General Service System",
  description: "Connect with trusted local service providers in Maasin City",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <ToastNotification />
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            toastOptions={{
              duration: 5000,
              style: {
                background: 'white',
                border: '1px solid #e5e7eb',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
