// Simplified production stage dialog component
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type ProductionStage, type Animal } from '@/db/schema/animals';

interface ProductionStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage?: ProductionStage | null;
  animal?: Animal | null;
  onSuccess: () => void;
}

export function ProductionStageDialog({
  open,
  onOpenChange,
  stage,
  animal,
  onSuccess,
}: ProductionStageDialogProps) {
  const isEditing = !!stage;

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
            {isEditing ? 'Edit Production Stage' : 'Add Production Stage'}
            {animal && ` for ${animal.displayName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form fields would go here */}
          <div>Production stage form fields</div>
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