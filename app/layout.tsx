import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ganadería Tavera",
  description: "Sistema de Gestión Ganadera",
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
