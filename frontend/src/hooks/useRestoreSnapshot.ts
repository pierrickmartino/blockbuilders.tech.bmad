import { useState } from "react";
import { useRouter } from "next/navigation";
import { StrategiesApiClient } from "@/lib/api/strategies-client";

export interface UseRestoreSnapshotReturn {
  restoreFromVersion: (versionNumber: number) => Promise<void>;
  isRestoring: boolean;
}

export function useRestoreSnapshot(strategyId: string): UseRestoreSnapshotReturn {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);

  const restoreFromVersion = async (versionNumber: number): Promise<void> => {
    setIsRestoring(true);
    try {
      const detail = await StrategiesApiClient.getVersionDetail(strategyId, versionNumber);
      await StrategiesApiClient.putDraft(strategyId, detail.definition_json);
      router.push(`/strategies/${strategyId}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return { restoreFromVersion, isRestoring };
}
