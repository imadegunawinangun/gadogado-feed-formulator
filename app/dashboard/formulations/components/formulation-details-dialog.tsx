// Simplified formulation details dialog component
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Formulation } from '@/db/schema/formulations';

interface FormulationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulation?: Formulation | null;
}

export function FormulationDetailsDialog({
  open,
  onOpenChange,
  formulation,
}: FormulationDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulation Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulation details view would go here */}
          <div>
            {formulation ? (
              <div>Showing details for: {formulation.name}</div>
            ) : (
              <div>No formulation selected</div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}