import axios from './api';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeepPartial } from 'ts-essentials';
import { DeviceStatus } from './deviceStatusSchema';
import { mergeDeviceStatus, useDeviceStatusStore } from '@state/deviceStatusStore.ts';

export const DEVICE_STATUS_QUERY_KEY = ['useDeviceStatus'] as const;
export const DEVICE_STATUS_RECONCILE_DELAY_MS = 1_500;

type DeviceStatusMutationOptions = {
  optimistic?: boolean;
  optimisticPatch?: DeepPartial<DeviceStatus>;
  reconcileDelayMs?: number;
  trackPending?: boolean;
};

let pendingDeviceStatusPatch: DeepPartial<DeviceStatus> | undefined;
let pendingDeviceStatusRevision = 0;
let reconciliationTimer: ReturnType<typeof setTimeout> | undefined;

export const getDeviceStatus = async () => {
  return axios.get<DeviceStatus>('/deviceStatus');
};

const mergePendingDeviceStatus = (deviceStatus: DeviceStatus) => {
  if (!pendingDeviceStatusPatch) return deviceStatus;
  return mergeDeviceStatus(deviceStatus, pendingDeviceStatusPatch);
};

// Pod status reads can lag behind accepted commands, so keep a short-lived
// optimistic overlay and merge it into any refetch until reconciliation.
const stageOptimisticDeviceStatus = (
  queryClient: QueryClient,
  deviceStatusPatch: DeepPartial<DeviceStatus>
) => {
  pendingDeviceStatusPatch = mergeDeviceStatus(
    pendingDeviceStatusPatch as DeviceStatus | undefined,
    deviceStatusPatch
  );
  pendingDeviceStatusRevision += 1;

  useDeviceStatusStore.getState().setDeviceStatus(deviceStatusPatch);
  queryClient.setQueryData<DeviceStatus>(DEVICE_STATUS_QUERY_KEY, currentDeviceStatus => {
    if (!currentDeviceStatus) return currentDeviceStatus;
    return mergeDeviceStatus(currentDeviceStatus, deviceStatusPatch);
  });

  return pendingDeviceStatusRevision;
};

const reconcileDeviceStatus = (
  queryClient: QueryClient,
  revision: number,
  delayMs = DEVICE_STATUS_RECONCILE_DELAY_MS
) => {
  if (revision !== pendingDeviceStatusRevision) return;
  if (reconciliationTimer) clearTimeout(reconciliationTimer);
  reconciliationTimer = setTimeout(() => {
    if (revision !== pendingDeviceStatusRevision) return;
    pendingDeviceStatusPatch = undefined;
    pendingDeviceStatusRevision += 1;
    void queryClient.invalidateQueries({ queryKey: DEVICE_STATUS_QUERY_KEY });
  }, delayMs);
};

export const useDeviceStatus = () => useQuery<DeviceStatus>({
  queryKey: DEVICE_STATUS_QUERY_KEY,
  queryFn: async () => {
    const response = await getDeviceStatus();
    return mergePendingDeviceStatus(response.data);
  },
  refetchInterval: 30_000,
});

export const postDeviceStatus = (deviceStatus: DeepPartial<DeviceStatus>) => {
  return axios.post('/deviceStatus', deviceStatus);
};

export const useDeviceStatusMutation = () => {
  const queryClient = useQueryClient();
  const [pendingWrites, setPendingWrites] = useState(0);

  const applyOptimisticDeviceStatus = useCallback((deviceStatusPatch: DeepPartial<DeviceStatus>) => {
    void queryClient.cancelQueries({ queryKey: DEVICE_STATUS_QUERY_KEY });
    return stageOptimisticDeviceStatus(queryClient, deviceStatusPatch);
  }, [queryClient]);

  const mutateDeviceStatus = useCallback(async (
    deviceStatusPatch: DeepPartial<DeviceStatus>,
    options: DeviceStatusMutationOptions = {}
  ) => {
    const optimisticPatch = options.optimisticPatch ?? deviceStatusPatch;
    const revision = options.optimistic === false
      ? pendingDeviceStatusRevision
      : stageOptimisticDeviceStatus(queryClient, optimisticPatch);
    const trackPending = options.trackPending !== false;

    if (trackPending) {
      setPendingWrites(currentPendingWrites => currentPendingWrites + 1);
    }
    try {
      await postDeviceStatus(deviceStatusPatch);
    } catch (error) {
      pendingDeviceStatusPatch = undefined;
      pendingDeviceStatusRevision += 1;
      void queryClient.invalidateQueries({ queryKey: DEVICE_STATUS_QUERY_KEY });
      throw error;
    } finally {
      if (trackPending) {
        setPendingWrites(currentPendingWrites => Math.max(0, currentPendingWrites - 1));
      }
      reconcileDeviceStatus(queryClient, revision, options.reconcileDelayMs);
    }
  }, [queryClient]);

  return {
    applyOptimisticDeviceStatus,
    isPending: pendingWrites > 0,
    mutateDeviceStatus,
  };
};
