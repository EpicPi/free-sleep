import _ from 'lodash';
import { create } from 'zustand';
import { DeepPartial } from 'ts-essentials';

import { DeviceStatus } from '@api/deviceStatusSchema.ts';

type DeviceStatusStore = {
  deviceStatus: DeviceStatus | undefined;
  setDeviceStatus: (newDeviceStatus: DeepPartial<DeviceStatus>) => void;
};

export const mergeDeviceStatus = (
  currentDeviceStatus: DeepPartial<DeviceStatus> | undefined,
  deviceStatusPatch: DeepPartial<DeviceStatus>
) => _.merge({}, currentDeviceStatus, deviceStatusPatch) as DeviceStatus;

export const useDeviceStatusStore = create<DeviceStatusStore>((set, get) => ({
  deviceStatus: undefined,
  setDeviceStatus: (newDeviceStatus) => {
    const { deviceStatus } = get();
    set({ deviceStatus: mergeDeviceStatus(deviceStatus, newDeviceStatus) });
  },
}));
