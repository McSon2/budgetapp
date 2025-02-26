import { PageHeader } from '@/components/dashboard/PageHeader';
import { CSVExporter } from '@/components/export/CSVExporter';
import { getCurrentUser, requireAuth } from '@/lib/auth';

export default async function ExportPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Get the current user
  const user = await getCurrentUser();

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Exporter des transactions"
        backLink="/dashboard"
        backLabel="Retour au tableau de bord"
      />

      <div className="mt-6">
        <CSVExporter userId={user?.id || ''} />
      </div>
    </div>
  );
}
