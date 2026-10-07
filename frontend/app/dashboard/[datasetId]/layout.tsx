import { DatasetProvider } from "@/lib/dataset-context";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return (
    <DatasetProvider datasetId={datasetId}>
      <AppShell datasetId={datasetId}>{children}</AppShell>
    </DatasetProvider>
  );
}
