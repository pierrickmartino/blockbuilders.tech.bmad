"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface RestoreSnapshotButtonProps {
  versionNumber: number;
  onRestore: () => Promise<void>;
  isRestoring: boolean;
}

export function RestoreSnapshotButton({
  versionNumber,
  onRestore,
  isRestoring,
}: RestoreSnapshotButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    setOpen(false);
    await onRestore();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isRestoring}
        className="gap-2"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {isRestoring ? "Restoring..." : "Restore this version"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore v{versionNumber} to working copy?</DialogTitle>
            <DialogDescription>
              Unsaved edits will be replaced by the snapshot from v{versionNumber}. This
              becomes your new working copy and autosaves normally.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
