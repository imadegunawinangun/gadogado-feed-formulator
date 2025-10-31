'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { IngredientsTable } from './ingredients-table';
import { IngredientDialog } from './ingredient-dialog';
import { ImportDialog } from './import-dialog';
import { type Ingredient } from '@/db/schema/ingredients';
import {
  getIngredients,
  getIngredientCategories,
  getIngredientSuppliers,
  exportIngredientsToCSV,
  type SearchFilters
} from '@/lib/actions/ingredients';

export function IngredientsContent() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const filters: SearchFilters = {
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        supplier: selectedSupplier || undefined,
        isAvailable: showAvailableOnly || undefined,
      };

      const result = await getIngredients(filters, pagination, {
        field: 'name',
        direction: 'asc'
      });

      if (result.success && result.data) {
        setIngredients(result.data.data);
        setTotalCount(result.data.pagination.total);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch ingredients',
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
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const result = await getIngredientCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const result = await getIngredientSuppliers();
      if (result.success && result.data) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportIngredientsToCSV({
        category: selectedCategory || undefined,
        supplier: selectedSupplier || undefined,
        includeNutrients: true,
      });

      if (result.success && result.data) {
        // Create and download CSV file
        const blob = new Blob([result.data.csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Export successful',
          description: 'Ingredients exported to CSV file',
        });
      } else {
        toast({
          title: 'Export failed',
          description: result.error || 'Failed to export ingredients',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'An unexpected error occurred during export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingIngredient(null);
  };

  const handleIngredientSaved = () => {
    fetchIngredients();
    handleDialogClose();
    toast({
      title: 'Success',
      description: editingIngredient
        ? 'Ingredient updated successfully'
        : 'Ingredient created successfully',
    });
  };

  const handleImportComplete = (imported: number, skipped: number) => {
    setIsImportDialogOpen(false);
    fetchIngredients();
    fetchCategories();
    fetchSuppliers();

    toast({
      title: 'Import completed',
      description: `${imported} ingredients imported, ${skipped} skipped`,
    });
  };

  useEffect(() => {
    fetchIngredients();
    fetchCategories();
    fetchSuppliers();
  }, [searchQuery, selectedCategory, selectedSupplier, showAvailableOnly, pagination]);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier} value={supplier}>
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showAvailableOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAvailableOnly(!showAvailableOnly)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Available Only
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>

          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              In your database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ingredients.filter(i => i.isAvailable).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Different types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              Different suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ingredients table */}
      <IngredientsTable
        ingredients={ingredients}
        loading={loading}
        onEdit={handleEdit}
        pagination={pagination}
        totalCount={totalCount}
        onPaginationChange={setPagination}
        onRefresh={fetchIngredients}
      />

      {/* Dialogs */}
      <IngredientDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        ingredient={editingIngredient}
        onSuccess={handleIngredientSaved}
      />

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={handleImportComplete}
      />
    </div>
  );
}