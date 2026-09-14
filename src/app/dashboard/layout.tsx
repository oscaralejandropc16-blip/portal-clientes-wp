import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Gestión de expedientes y clientes - Román y Delgado, C.A.",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
