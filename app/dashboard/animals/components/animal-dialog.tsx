// Simplified animal dialog component
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Animal } from '@/db/schema/animals';

interface AnimalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal?: Animal | null;
  onSuccess: () => void;
}

export function AnimalDialog({
  open,
  onOpenChange,
  animal,
  onSuccess,
}: AnimalDialogProps) {
  const isEditing = !!animal;

  const handleSubmit = () => {
    // Handle form submission
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Animal' : 'Add New Animal'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form fields would go here */}
          <div>Animal form fields</div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}