import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Utilisation de l'alias @ pour être sûr que TypeScript le trouve
import { AuthProvider } from '@/app/context/AuthContext'; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tchitchen",
  description: "L'appli de la brigade",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="bg-black" style={{ backgroundColor: 'black' }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} bg-black antialiased text-white`} style={{ backgroundColor: 'black' }}>
        
        {/* On enveloppe ici : tout ce qui est dans l'appli passera par l'AuthProvider */}
        <AuthProvider>
          {children}
        </AuthProvider>

      </body>
    </html>
  );
}