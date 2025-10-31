'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type Ingredient } from '@/db/schema/ingredients';
import { deleteIngredient, getIngredientWithNutrients } from '@/lib/actions/ingredients';
import { cn } from '@/lib/utils';

interface IngredientsTableProps {
  ingredients: Ingredient[];
  loading: boolean;
  onEdit: (ingredient: Ingredient) => void;
  pagination: { page: number; limit: number };
  totalCount: number;
  onPaginationChange: (pagination: { page: number; limit: number }) => void;
  onRefresh: () => void;
}

export function IngredientsTable({
  ingredients,
  loading,
  onEdit,
  pagination,
  totalCount,
  onPaginationChange,
  onRefresh,
}: IngredientsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedIngredientWithNutrients, setSelectedIngredientWithNutrients] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);

  const { toast } = useToast();

  const totalPages = Math.ceil(totalCount / pagination.limit);
  const startIndex = (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(startIndex + ingredients.length - 1, totalCount);

  const handleDelete = async (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!ingredientToDelete) return;

    try {
      setIsDeleting(true);
      const result = await deleteIngredient(ingredientToDelete.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Ingredient deleted successfully',
        });
        onRefresh(); // Refresh the table
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete ingredient',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setIngredientToDelete(null);
    }
  };

  const handleView = async (ingredient: Ingredient) => {
    try {
      setIsViewLoading(true);
      setSelectedIngredient(ingredient);

      const result = await getIngredientWithNutrients(ingredient.id);
      if (result.success && result.data) {
        setSelectedIngredientWithNutrients(result.data);
        setViewDialogOpen(true);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch ingredient details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsViewLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatNumber = (value: number | string | null, decimals: number = 2) => {
    if (value === null || value === undefined) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(decimals);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ingredients Database</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {startIndex}-{endIndex} of {totalCount} ingredients
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading rows
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="h-4 bg-muted animate-pulse rounded w-32" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted animate-pulse rounded w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted animate-pulse rounded w-28" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted animate-pulse rounded w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 bg-muted animate-pulse rounded w-16" />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <div className="h-4 bg-muted animate-pulse rounded w-12" />
                          <div className="h-4 bg-muted animate-pulse rounded w-12" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="h-8 bg-muted animate-pulse rounded w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">No ingredients found</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{ingredient.name}</div>
                          {ingredient.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {ingredient.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ingredient.category ? (
                          <Badge variant="secondary">{ingredient.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {ingredient.supplier || '—'}
                          {ingredient.supplierCode && (
                            <div className="text-xs text-muted-foreground">
                              Code: {ingredient.supplierCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-semibold">
                            {formatCurrency(ingredient.costPerUnit)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            per {ingredient.unit || 'kg'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ingredient.isAvailable ? 'default' : 'secondary'}
                          className={
                            ingredient.isAvailable
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : ''
                          }
                        >
                          {ingredient.isAvailable ? 'Available' : 'Unavailable'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ingredient.isOrganic && (
                            <Badge variant="outline" className="text-xs">
                              Organic
                            </Badge>
                          )}
                          {ingredient.isHalal && (
                            <Badge variant="outline" className="text-xs">
                              Halal
                            </Badge>
                          )}
                          {ingredient.isGMO && (
                            <Badge variant="outline" className="text-xs">
                              GMO
                            </Badge>
                          )}
                          {ingredient.dryMatterPercentage && (
                            <Badge variant="outline" className="text-xs">
                              DM: {formatNumber(ingredient.dryMatterPercentage)}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(ingredient)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(ingredient)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(ingredient)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPaginationChange({
                      ...pagination,
                      page: pagination.page - 1,
                    })
                  }
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber =
                      pagination.page <= 3
                        ? i + 1
                        : pagination.page >= totalPages - 2
                        ? totalPages - 4 + i
                        : pagination.page - 2 + i;

                    return (
                      <Button
                        key={pageNumber}
                        variant={pagination.page === pageNumber ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          onPaginationChange({
                            ...pagination,
                            page: pageNumber,
                          })
                        }
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPaginationChange({
                      ...pagination,
                      page: pagination.page + 1,
                    })
                  }
                  disabled={pagination.page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the ingredient "{ingredientToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Ingredient Details Dialog */}
      {/* TODO: Create a separate ingredient details dialog component */}
    </>
  );
}