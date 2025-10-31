import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function IngredientsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Table header */}
            <div className="grid grid-cols-6 gap-4 p-4 border-b">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>

            {/* Table rows */}
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-4 p-4 border-b">
                {Array.from({ length: 6 }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between p-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8" />
              ))}
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}