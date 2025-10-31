'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, Copy, Eye, Settings } from 'lucide-react';
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
import { FormulationsTable } from './formulations-table';
import { FormulationDialog } from './formulation-dialog';
import { FormulationDetailsDialog } from './formulation-details-dialog';
import { type Formulation } from '@/db/schema/formulations';
import {
  getFormulations,
  getFormulationTypes,
  duplicateFormulation,
  toggleFormulationStatus,
} from '@/lib/actions/formulations';

export function FormulationsContent() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [formulationTypes, setFormulationTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isFormulationDialogOpen, setIsFormulationDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingFormulation, setEditingFormulation] = useState<Formulation | null>(null);
  const [viewingFormulation, setViewingFormulation] = useState<Formulation | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  const fetchFormulations = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        formulationType: selectedType || undefined,
        status: selectedStatus || undefined,
      };

      const result = await getFormulations(filters, pagination, {
        field: 'createdAt',
        direction: 'desc'
      });

      if (result.success && result.data) {
        setFormulations(result.data.data);
        setTotalCount(result.data.pagination.total);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch formulations',
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

  const fetchFormulationTypes = async () => {
    try {
      const result = await getFormulationTypes();
      if (result.success && result.data) {
        setFormulationTypes(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch formulation types:', error);
    }
  };

  const handleEdit = (formulation: Formulation) => {
    setEditingFormulation(formulation);
    setIsFormulationDialogOpen(true);
  };

  const handleView = (formulation: Formulation) => {
    setViewingFormulation(formulation);
    setIsDetailsDialogOpen(true);
  };

  const handleDuplicate = async (formulation: Formulation) => {
    try {
      const newName = `${formulation.name} (Copy)`;
      const result = await duplicateFormulation(formulation.id, newName);

      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Formulation duplicated successfully',
        });
        fetchFormulations();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to duplicate formulation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (formulation: Formulation) => {
    try {
      const activate = formulation.status !== 'active';
      const result = await toggleFormulationStatus(formulation.id, activate);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || `Formulation ${activate ? 'activated' : 'deactivated'} successfully`,
        });
        fetchFormulations();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update formulation status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleFormulationSaved = () => {
    fetchFormulations();
    setIsFormulationDialogOpen(false);
    setEditingFormulation(null);
    toast({
      title: 'Success',
      description: editingFormulation ? 'Formulation updated successfully' : 'Formulation created successfully',
    });
  };

  useEffect(() => {
    fetchFormulations();
    fetchFormulationTypes();
  }, [searchQuery, selectedType, selectedStatus, pagination]);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search formulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {formulationTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsFormulationDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Formulation
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Formulations</CardTitle>
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formulations.filter(f => f.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formulations.filter(f => f.status === 'draft').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Being edited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formulations.length > 0
                ? `$${(formulations.reduce((sum, f) => sum + parseFloat(f.costPerUnit?.toString() || '0'), 0) / formulations.length).toFixed(2)}`
                : '$0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Per unit average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulations table */}
      <FormulationsTable
        formulations={formulations}
        loading={loading}
        onEdit={handleEdit}
        onView={handleView}
        onDuplicate={handleDuplicate}
        onToggleStatus={handleToggleStatus}
        pagination={pagination}
        totalCount={totalCount}
        onPaginationChange={setPagination}
        onRefresh={fetchFormulations}
      />

      {/* Dialogs */}
      <FormulationDialog
        open={isFormulationDialogOpen}
        onOpenChange={setIsFormulationDialogOpen}
        formulation={editingFormulation}
        onSuccess={handleFormulationSaved}
      />

      <FormulationDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        formulation={viewingFormulation}
      />
    </div>
  );
}