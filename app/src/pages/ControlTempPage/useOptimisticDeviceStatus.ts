import _ from 'lodash';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DeepPartial } from 'ts-essentials';

import { DeviceStatus } from '@api/deviceStatusSchema.ts';
import { useControlTempStore } from './controlTempStore.tsx';

export function useOptimisticDeviceStatus() {
  const queryClient = useQueryClient();
  const setDeviceStatus = useControlTempStore(state => state.setDeviceStatus);

  return useCallback((deviceStatus: DeepPartial<DeviceStatus>) => {
    setDeviceStatus(deviceStatus);
    queryClient.setQueryData<DeviceStatus>(['useDeviceStatus'], currentDeviceStatus => {
      if (!currentDeviceStatus) return currentDeviceStatus;
      return _.merge({}, currentDeviceStatus, deviceStatus);
    });
  }, [queryClient, setDeviceStatus]);
}
