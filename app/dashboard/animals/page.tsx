import { Suspense } from 'react';
import { AnimalsContent } from './components/animals-content';
import { AnimalsTableSkeleton } from './components/animals-table-skeleton';

export default async function AnimalsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Animals & Production Stages</h2>
          <p className="text-muted-foreground">
            Manage animal types and their production stages for feed formulation.
          </p>
        </div>
      </div>

      <Suspense fallback={<AnimalsTableSkeleton />}>
        <AnimalsContent />
      </Suspense>
    </div>
  );
}