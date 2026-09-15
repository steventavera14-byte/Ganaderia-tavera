import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ganadería Tavera",
  description: "Sistema de Gestión Ganadera",

  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },

  appleWebApp: {
    capable: true,
    title: "Ganadería Tavera",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
