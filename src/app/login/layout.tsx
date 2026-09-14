import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Acceso exclusivo para el equipo legal - Román y Delgado, C.A.",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
