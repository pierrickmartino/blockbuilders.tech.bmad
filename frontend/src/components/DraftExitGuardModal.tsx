"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DraftExitGuardModalProps {
  open: boolean;
  onKeep: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Confirm-on-exit guard modal (ADR-0012 §6, Module C). Shown when the user
 * navigates away in-app from an AI draft under review.
 */
export function DraftExitGuardModal({ open, onKeep, onDiscard, onCancel }: DraftExitGuardModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave this AI draft under review?</DialogTitle>
          <DialogDescription>
            Keep it in your strategy list as-is, discard it permanently, or stay to decide.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onDiscard}>
            Discard
          </Button>
          <Button onClick={onKeep}>Keep</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
