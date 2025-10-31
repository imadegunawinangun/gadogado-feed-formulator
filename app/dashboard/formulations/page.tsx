import { Suspense } from 'react';
import { FormulationsContent } from './components/formulations-content';
import { FormulationsTableSkeleton } from './components/formulations-table-skeleton';

export default async function FormulationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Feed Formulations</h2>
          <p className="text-muted-foreground">
            Manage and analyze your feed formulations with detailed nutritional breakdowns.
          </p>
        </div>
      </div>

      <Suspense fallback={<FormulationsTableSkeleton />}>
        <FormulationsContent />
      </Suspense>
    </div>
  );
}