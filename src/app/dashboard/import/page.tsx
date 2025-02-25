import { PageHeader } from '@/components/dashboard/PageHeader';
import { CSVImporter } from '@/components/import/CSVImporter';
import { getCurrentUser, requireAuth } from '@/lib/auth';

export default async function ImportPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Get the current user
  const user = await getCurrentUser();

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Importer des transactions"
        backLink="/dashboard"
        backLabel="Retour au tableau de bord"
      />

      <div className="mt-6">
        <CSVImporter userId={user?.id || ''} />
      </div>
    </div>
  );
}
