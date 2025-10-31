import { Suspense } from 'react';
import { IngredientsContent } from './components/ingredients-content';
import { IngredientsTableSkeleton } from './components/ingredients-table-skeleton';

export default async function IngredientsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ingredients</h2>
          <p className="text-muted-foreground">
            Manage your feed ingredient database with nutritional information and pricing.
          </p>
        </div>
      </div>

      <Suspense fallback={<IngredientsTableSkeleton />}>
        <IngredientsContent />
      </Suspense>
    </div>
  );
}