'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import {
  importIngredients,
  validateImportData,
  getImportTemplate,
} from '@/lib/actions/import-export';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (imported: number, skipped: number) => void;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
  });
  const [activeTab, setActiveTab] = useState('upload');
  const [template, setTemplate] = useState<any>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { toast } = useToast();

  const fetchTemplate = useCallback(async () => {
    try {
      const result = await getImportTemplate();
      if (result.success && result.data) {
        setTemplate(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/json' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setValidation(null);
        setImportResult(null);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a JSON or CSV file',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setValidation(null);
        setImportResult(null);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a JSON or CSV file',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const parseFile = useCallback(async (file: File): Promise<any[]> => {
    const text = await file.text();

    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error('Invalid JSON file format');
      }
    }

    if (file.name.endsWith('.csv')) {
      try {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('CSV file must contain at least a header and one data row');
        }

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          const row: any = {};

          headers.forEach((header, index) => {
            let value = values[index] || '';

            // Try to parse numbers
            if (!isNaN(Number(value)) && value !== '') {
              value = Number(value);
            }

            // Parse booleans
            if (value === 'true' || value === 'false') {
              value = value === 'true';
            }

            // Map CSV headers to field names
            const fieldName = mapHeaderToField(header);
            if (fieldName) {
              row[fieldName] = value;
            }
          });

          data.push(row);
        }

        return data;
      } catch (error) {
        throw new Error('Invalid CSV file format');
      }
    }

    throw new Error('Unsupported file format');
  }, []);

  const mapHeaderToField = (header: string): string | null => {
    const mapping: Record<string, string> = {
      'name': 'name',
      'description': 'description',
      'category': 'category',
      'supplier': 'supplier',
      'supplier code': 'supplierCode',
      'cost per unit': 'costPerUnit',
      'cost_per_unit': 'costPerUnit',
      'unit': 'unit',
      'dry matter %': 'dryMatterPercentage',
      'dry_matter_percentage': 'dryMatterPercentage',
      'density': 'density',
      'is available': 'isAvailable',
      'is_available': 'isAvailable',
      'minimum order': 'minimumOrder',
      'minimum_order': 'minimumOrder',
      'maximum available': 'maximumAvailable',
      'maximum_available': 'maximumAvailable',
      'is organic': 'isOrganic',
      'is_organic': 'isOrganic',
      'is gmo': 'isGMO',
      'is_gmo': 'isGMO',
      'is halal': 'isHalal',
      'is_halal': 'isHalal',
      'safety notes': 'safetyNotes',
      'safety_notes': 'safetyNotes',
    };

    return mapping[header.toLowerCase()] || null;
  };

  const validateFile = useCallback(async () => {
    if (!file) return;

    try {
      setIsImporting(true);
      const data = await parseFile(file);

      if (!Array.isArray(data) || data.length === 0) {
        toast({
          title: 'Invalid file',
          description: 'File must contain an array of ingredients',
          variant: 'destructive',
        });
        return;
      }

      const result = await validateImportData(data);
      if (result.success && result.data) {
        setValidation(result.data);
        if (result.data.valid) {
          toast({
            title: 'Validation successful',
            description: `Ready to import ${data.length} ingredients`,
          });
        } else {
          toast({
            title: 'Validation failed',
            description: 'Please fix the errors before importing',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Validation failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }, [file, parseFile, toast]);

  const handleImport = useCallback(async () => {
    if (!file || !validation?.valid) return;

    try {
      setIsImporting(true);
      setImportProgress(0);

      const data = await parseFile(file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await importIngredients(data, importOptions);

      clearInterval(progressInterval);
      setImportProgress(100);

      if (result.success && result.data) {
        setImportResult(result.data);
        onSuccess(result.data.imported, result.data.skipped);
        toast({
          title: 'Import completed',
          description: `Successfully imported ${result.data.imported} ingredients`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: result.error || 'Failed to import ingredients',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }, [file, validation, importOptions, parseFile, onSuccess, toast]);

  const downloadTemplate = useCallback(async () => {
    try {
      const templateData = [
        {
          name: 'Sample Ingredient',
          description: 'This is a sample ingredient',
          category: 'Energy Source',
          supplier: 'Sample Supplier',
          supplierCode: 'SUP001',
          costPerUnit: 2.50,
          unit: 'kg',
          dryMatterPercentage: 88.0,
          density: 650.0,
          isAvailable: true,
          minimumOrder: 1000,
          maximumAvailable: 100000,
          isOrganic: false,
          isGMO: false,
          isHalal: true,
          safetyNotes: 'Store in dry place',
        }
      ];

      const json = JSON.stringify(templateData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ingredient_import_template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Template downloaded',
        description: 'Use this template to prepare your data for import',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const resetDialog = useCallback(() => {
    setFile(null);
    setValidation(null);
    setImportResult(null);
    setImportProgress(0);
    setActiveTab('upload');
  }, []);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      resetDialog();
      onOpenChange(false);
    }
  }, [isImporting, onOpenChange, resetDialog]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Ingredients</DialogTitle>
          <DialogDescription>
            Import ingredients from a CSV or JSON file. You can download a template to see the expected format.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="preview">Preview & Validate</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* File Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Select File</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                    file && 'border-primary bg-primary/5'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {file ? file.name : 'Drop your file here or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports JSON and CSV files up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="mt-4 cursor-pointer">
                      Choose File
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Import Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Import Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Skip duplicates</Label>
                    <p className="text-sm text-muted-foreground">
                      Skip ingredients that already exist in the database
                    </p>
                  </div>
                  <Switch
                    checked={importOptions.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setImportOptions(prev => ({ ...prev, skipDuplicates: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Update existing</Label>
                    <p className="text-sm text-muted-foreground">
                      Update existing ingredients with matching names
                    </p>
                  </div>
                  <Switch
                    checked={importOptions.updateExisting}
                    onCheckedChange={(checked) =>
                      setImportOptions(prev => ({ ...prev, updateExisting: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Template Download */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Download Import Template</p>
                    <p className="text-xs text-muted-foreground">
                      Get a pre-formatted template with all required fields
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={validateFile}
                disabled={!file || isImporting}
              >
                {isImporting ? 'Validating...' : 'Validate & Continue'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {validation && (
              <>
                {/* Validation Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      {validation.valid ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
                      )}
                      Validation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {validation.errors.length > 0 && (
                        <div>
                          <p className="font-medium text-red-600 mb-2">Errors:</p>
                          <ScrollArea className="h-32 w-full rounded-md border p-2">
                            <ul className="space-y-1 text-sm">
                              {validation.errors.map((error, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-red-600 mr-2">•</span>
                                  {error}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </div>
                      )}

                      {validation.warnings.length > 0 && (
                        <div>
                          <p className="font-medium text-yellow-600 mb-2">Warnings:</p>
                          <ScrollArea className="h-24 w-full rounded-md border p-2">
                            <ul className="space-y-1 text-sm">
                              {validation.warnings.map((warning, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-yellow-600 mr-2">•</span>
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </div>
                      )}

                      {validation.valid && (
                        <div className="text-green-600 text-sm">
                          <CheckCircle className="inline mr-2 h-4 w-4" />
                          File validation passed! Ready to import.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Import Actions */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('upload')}>
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!validation.valid || isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import Ingredients'}
                  </Button>
                </div>

                {/* Progress */}
                {isImporting && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Importing ingredients...</span>
                          <span>{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="w-full" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {importResult && (
              <>
                {/* Results Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Import Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult.imported}
                        </div>
                        <p className="text-sm text-muted-foreground">Imported</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {importResult.skipped}
                        </div>
                        <p className="text-sm text-muted-foreground">Skipped</p>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium text-red-600 mb-2">Errors:</p>
                        <ScrollArea className="h-32 w-full rounded-md border p-2">
                          <ul className="space-y-1 text-sm">
                            {importResult.errors.map((error, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-red-600 mr-2">•</span>
                                {error}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Close Actions */}
                <div className="flex justify-end">
                  <Button onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}