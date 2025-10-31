'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, ChevronRight } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { AnimalsTable } from './animals-table';
import { AnimalDialog } from './animal-dialog';
import { ProductionStageDialog } from './production-stage-dialog';
import { type Animal, type ProductionStage } from '@/db/schema/animals';
import {
  getAnimals,
  getProductionStages,
  getAnimalTypes,
  getCommonAnimals,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  createProductionStage,
  updateProductionStage,
  deleteProductionStage,
} from '@/lib/actions/animals';

export function AnimalsContent() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [commonAnimals, setCommonAnimals] = useState<Animal[]>([]);
  const [productionStages, setProductionStages] = useState<Record<string, ProductionStage[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCommonOnly, setShowCommonOnly] = useState(false);
  const [expandedAnimals, setExpandedAnimals] = useState<Set<string>>(new Set());
  const [isAnimalDialogOpen, setIsAnimalDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);
  const [selectedAnimalForStage, setSelectedAnimalForStage] = useState<Animal | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        animalType: selectedType || undefined,
        isCommon: showCommonOnly || undefined,
      };

      const result = await getAnimals(filters, pagination, {
        field: 'displayName',
        direction: 'asc'
      });

      if (result.success && result.data) {
        setAnimals(result.data.data);
        setTotalCount(result.data.pagination.total);

        // Fetch production stages for each animal
        const stagesData: Record<string, ProductionStage[]> = {};
        for (const animal of result.data.data) {
          const stagesResult = await getProductionStages(animal.id);
          if (stagesResult.success && stagesResult.data) {
            stagesData[animal.id] = stagesResult.data;
          }
        }
        setProductionStages(stagesData);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch animals',
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

  const fetchAnimalTypes = async () => {
    try {
      const result = await getAnimalTypes();
      if (result.success && result.data) {
        setAnimalTypes(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch animal types:', error);
    }
  };

  const fetchCommonAnimals = async () => {
    try {
      const result = await getCommonAnimals();
      if (result.success && result.data) {
        setCommonAnimals(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch common animals:', error);
    }
  };

  const toggleAnimalExpanded = (animalId: string) => {
    setExpandedAnimals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(animalId)) {
        newSet.delete(animalId);
      } else {
        newSet.add(animalId);
      }
      return newSet;
    });
  };

  const handleEditAnimal = (animal: Animal) => {
    setEditingAnimal(animal);
    setIsAnimalDialogOpen(true);
  };

  const handleAddStage = (animal: Animal) => {
    setSelectedAnimalForStage(animal);
    setIsStageDialogOpen(true);
  };

  const handleEditStage = (stage: ProductionStage, animal: Animal) => {
    setEditingStage(stage);
    setSelectedAnimalForStage(animal);
    setIsStageDialogOpen(true);
  };

  const handleDeleteAnimal = async (animal: Animal) => {
    try {
      const result = await deleteAnimal(animal.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Animal deleted successfully',
        });
        fetchAnimals();
        fetchAnimalTypes();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete animal',
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

  const handleDeleteStage = async (stage: ProductionStage) => {
    try {
      const result = await deleteProductionStage(stage.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Production stage deleted successfully',
        });
        fetchAnimals();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete production stage',
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

  const handleAnimalSaved = () => {
    fetchAnimals();
    fetchAnimalTypes();
    setIsAnimalDialogOpen(false);
    setEditingAnimal(null);
    toast({
      title: 'Success',
      description: editingAnimal ? 'Animal updated successfully' : 'Animal created successfully',
    });
  };

  const handleStageSaved = () => {
    fetchAnimals();
    setIsStageDialogOpen(false);
    setEditingStage(null);
    setSelectedAnimalForStage(null);
    toast({
      title: 'Success',
      description: editingStage ? 'Production stage updated successfully' : 'Production stage created successfully',
    });
  };

  useEffect(() => {
    fetchAnimals();
    fetchAnimalTypes();
    fetchCommonAnimals();
  }, [searchQuery, selectedType, showCommonOnly, pagination]);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search animals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Animal Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {animalTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showCommonOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCommonOnly(!showCommonOnly)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Common Only
          </Button>
        </div>

        <Button onClick={() => setIsAnimalDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Animal
        </Button>
      </div>

      {/* Quick access cards */}
      {commonAnimals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Access - Common Animals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {commonAnimals.slice(0, 8).map((animal) => (
                <Badge
                  key={animal.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery(animal.displayName)}
                >
                  {animal.displayName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
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
            <CardTitle className="text-sm font-medium">Animal Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{animalTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              Different species
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(productionStages).reduce((sum, stages) => sum + stages.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total stages configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Animals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {animals.filter(a => a.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Animals list with expandable stages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Animals Database</CardTitle>
              <CardDescription>
                Click on animals to view and manage their production stages
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-48" />
                      <div className="h-3 bg-muted animate-pulse rounded w-32" />
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-muted animate-pulse rounded w-20" />
                      <div className="h-8 bg-muted animate-pulse rounded w-8" />
                    </div>
                  </div>
                </div>
              ))
            ) : animals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No animals found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or add a new animal to get started
                </p>
              </div>
            ) : (
              animals.map((animal) => (
                <Collapsible
                  key={animal.id}
                  open={expandedAnimals.has(animal.id)}
                  onOpenChange={() => toggleAnimalExpanded(animal.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedAnimals.has(animal.id) ? 'rotate-90' : ''
                          }`}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{animal.displayName}</h3>
                            {animal.isCommon && <Badge variant="secondary">Common</Badge>}
                            {!animal.isActive && <Badge variant="outline">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {animal.species} {animal.breed && `• ${animal.breed}`}
                            {animal.primaryPurpose && `• ${animal.primaryPurpose}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddStage(animal);
                          }}
                        >
                          Add Stage
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAnimal(animal);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      {productionStages[animal.id]?.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Production Stages</h4>
                          {productionStages[animal.id].map((stage) => (
                            <div
                              key={stage.id}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <div>
                                <div className="font-medium">{stage.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {stage.stageType} • Stage {stage.sequenceOrder}
                                  {stage.startAgeDays && stage.endAgeDays && (
                                    ` • Days ${stage.startAgeDays}-${stage.endAgeDays}`
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditStage(stage, animal)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStage(stage)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">No production stages configured</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleAddStage(animal)}
                          >
                            Add First Stage
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AnimalDialog
        open={isAnimalDialogOpen}
        onOpenChange={setIsAnimalDialogOpen}
        animal={editingAnimal}
        onSuccess={handleAnimalSaved}
      />

      <ProductionStageDialog
        open={isStageDialogOpen}
        onOpenChange={setIsStageDialogOpen}
        stage={editingStage}
        animal={selectedAnimalForStage}
        onSuccess={handleStageSaved}
      />
    </div>
  );
}