import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata: Metadata = {
    title: "Softigo Mail | Kurumsal E-Posta",
    description: "Softigo Bilişim için özel tasarlanmış webmail istemcisi.",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="tr">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                {/* iOS Safari 100vh fix */}
                <script dangerouslySetInnerHTML={{
                    __html: `
                    function setAppHeight() {
                        document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
                    }
                    setAppHeight();
                    window.addEventListener('resize', setAppHeight);
                    window.addEventListener('orientationchange', function() { setTimeout(setAppHeight, 200); });
                ` }} />
            </head>
            <body>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
