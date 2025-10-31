'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { type Ingredient } from '@/db/schema/ingredients';
import {
  createIngredient,
  updateIngredient,
  getIngredientCategories,
  getIngredientSuppliers,
} from '@/lib/actions/ingredients';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface IngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient?: Ingredient | null;
  onSuccess: () => void;
}

const ingredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  supplierCode: z.string().optional(),
  costPerUnit: z.number().min(0, 'Cost must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  dryMatterPercentage: z.number().min(0).max(100).optional(),
  density: z.number().positive().optional(),
  isAvailable: z.boolean().default(true),
  minimumOrder: z.number().positive().optional(),
  maximumAvailable: z.number().positive().optional(),
  isOrganic: z.boolean().default(false),
  isGMO: z.boolean().default(false),
  isHalal: z.boolean().default(true),
  safetyNotes: z.string().optional(),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

export function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
  onSuccess,
}: IngredientDialogProps) {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    description: '',
    category: '',
    supplier: '',
    supplierCode: '',
    costPerUnit: 0,
    unit: 'kg',
    dryMatterPercentage: undefined,
    density: undefined,
    isAvailable: true,
    minimumOrder: undefined,
    maximumAvailable: undefined,
    isOrganic: false,
    isGMO: false,
    isHalal: true,
    safetyNotes: '',
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const { toast } = useToast();
  const isEditing = !!ingredient;

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSuppliers();
    }
  }, [open]);

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name || '',
        description: ingredient.description || '',
        category: ingredient.category || '',
        supplier: ingredient.supplier || '',
        supplierCode: ingredient.supplierCode || '',
        costPerUnit: parseFloat(ingredient.costPerUnit?.toString() || '0'),
        unit: ingredient.unit || 'kg',
        dryMatterPercentage: ingredient.dryMatterPercentage
          ? parseFloat(ingredient.dryMatterPercentage.toString())
          : undefined,
        density: ingredient.density
          ? parseFloat(ingredient.density.toString())
          : undefined,
        isAvailable: ingredient.isAvailable ?? true,
        minimumOrder: ingredient.minimumOrder
          ? parseFloat(ingredient.minimumOrder.toString())
          : undefined,
        maximumAvailable: ingredient.maximumAvailable
          ? parseFloat(ingredient.maximumAvailable.toString())
          : undefined,
        isOrganic: ingredient.isOrganic ?? false,
        isGMO: ingredient.isGMO ?? false,
        isHalal: ingredient.isHalal ?? true,
        safetyNotes: ingredient.safetyNotes || '',
      });
    } else {
      // Reset form for new ingredient
      setFormData({
        name: '',
        description: '',
        category: '',
        supplier: '',
        supplierCode: '',
        costPerUnit: 0,
        unit: 'kg',
        dryMatterPercentage: undefined,
        density: undefined,
        isAvailable: true,
        minimumOrder: undefined,
        maximumAvailable: undefined,
        isOrganic: false,
        isGMO: false,
        isHalal: true,
        safetyNotes: '',
      });
      setErrors({});
      setActiveTab('basic');
    }
  }, [ingredient, open]);

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

  const handleInputChange = (field: keyof IngredientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      ingredientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          newErrors[err.path.join('.')] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isEditing
        ? await updateIngredient(ingredient!.id, formData)
        : await createIngredient(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: isEditing
            ? 'Ingredient updated successfully'
            : 'Ingredient created successfully',
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save ingredient',
          variant: 'destructive',
        });

        if (result.validationErrors) {
          setErrors(result.validationErrors);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the ingredient information below.'
              : 'Enter the ingredient details to add it to your database.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter ingredient name"
                    className={cn(errors.name && 'border-red-500')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter ingredient description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={formData.supplier}
                    onValueChange={(value) => handleInputChange('supplier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No supplier</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier} value={supplier}>
                          {supplier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplierCode">Supplier Code</Label>
                  <Input
                    id="supplierCode"
                    value={formData.supplierCode}
                    onChange={(e) => handleInputChange('supplierCode', e.target.value)}
                    placeholder="Enter supplier code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPerUnit">Cost per Unit *</Label>
                  <Input
                    id="costPerUnit"
                    type="number"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => handleInputChange('costPerUnit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={cn(errors.costPerUnit && 'border-red-500')}
                  />
                  {errors.costPerUnit && (
                    <p className="text-sm text-red-500">{errors.costPerUnit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleInputChange('unit', value)}
                  >
                    <SelectTrigger className={cn(errors.unit && 'border-red-500')}>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ton">ton</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                      <SelectItem value="bag">bag</SelectItem>
                      <SelectItem value=" liter">liter</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.unit && (
                    <p className="text-sm text-red-500">{errors.unit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isAvailable">Status</Label>
                  <div className="flex items-center space-x-2 mt-3">
                    <Switch
                      id="isAvailable"
                      checked={formData.isAvailable}
                      onCheckedChange={(checked) => handleInputChange('isAvailable', checked)}
                    />
                    <Label htmlFor="isAvailable" className="text-sm">
                      Available for use
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dryMatterPercentage">Dry Matter (%)</Label>
                  <Input
                    id="dryMatterPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.dryMatterPercentage || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'dryMatterPercentage',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="88.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="density">Density (kg/m³)</Label>
                  <Input
                    id="density"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.density || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'density',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="650.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumOrder">Minimum Order</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimumOrder || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'minimumOrder',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maximumAvailable">Maximum Available</Label>
                  <Input
                    id="maximumAvailable"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maximumAvailable || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'maximumAvailable',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="10000"
                  />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quality Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isOrganic">Organic</Label>
                    <Switch
                      id="isOrganic"
                      checked={formData.isOrganic}
                      onCheckedChange={(checked) => handleInputChange('isOrganic', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isGMO">GMO</Label>
                    <Switch
                      id="isGMO"
                      checked={formData.isGMO}
                      onCheckedChange={(checked) => handleInputChange('isGMO', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isHalal">Halal Certified</Label>
                    <Switch
                      id="isHalal"
                      checked={formData.isHalal}
                      onCheckedChange={(checked) => handleInputChange('isHalal', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="safetyNotes">Safety Notes</Label>
                <Textarea
                  id="safetyNotes"
                  value={formData.safetyNotes}
                  onChange={(e) => handleInputChange('safetyNotes', e.target.value)}
                  placeholder="Enter any safety or handling notes"
                  rows={4}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{formData.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Cost:</span>
                      <span>
                        ${formData.costPerUnit.toFixed(2)} per {formData.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant={formData.isAvailable ? 'default' : 'secondary'}>
                        {formData.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                    {formData.category && (
                      <div className="flex justify-between">
                        <span className="font-medium">Category:</span>
                        <Badge variant="outline">{formData.category}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                ? 'Update Ingredient'
                : 'Create Ingredient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}