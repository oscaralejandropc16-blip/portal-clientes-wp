import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Gestión de expedientes y clientes - Intranet Legal Romany Delgado",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
