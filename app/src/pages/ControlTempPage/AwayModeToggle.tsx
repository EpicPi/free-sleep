import _ from 'lodash';
import { Button } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeepPartial } from 'ts-essentials';

import { getDeviceStatus, useDeviceStatusMutation } from '@api/deviceStatus.ts';
import { DeviceStatus } from '@api/deviceStatusSchema.ts';
import { getScheduledTargetTemperature } from '@lib/scheduleTemperature.ts';
import { Settings } from '@api/settingsSchema.ts';
import { postSettings, useSettings } from '@api/settings.ts';
import { useSchedules } from '@api/schedules.ts';
import { useAppStore } from '@state/appStore.tsx';

export default function AwayModeToggle() {
  const { data: settings, refetch } = useSettings();
  const { isUpdating, side } = useAppStore();
  const queryClient = useQueryClient();
  const { isPending, mutateDeviceStatus } = useDeviceStatusMutation();
  const { data: schedules } = useSchedules();
  const [isSaving, setIsSaving] = useState(false);

  const sideName = settings?.[side]?.name || `${side.charAt(0).toUpperCase()}${side.slice(1)} side`;
  const checked = settings?.[side]?.awayMode || false;

  const setOptimisticSettings = useCallback((nextSettings: DeepPartial<Settings>) => {
    queryClient.setQueryData<Settings>(['useSettings'], currentSettings => {
      if (!currentSettings) return currentSettings;
      return _.merge({}, currentSettings, nextSettings);
    });
  }, [queryClient]);

  const syncAwaySideToActiveSide = async () => {
    const activeSide = side === 'left' ? 'right' : 'left';
    const { data: status } = await getDeviceStatus();
    const activeSideStatus = status[activeSide];

    const deviceStatusPatch: DeepPartial<DeviceStatus> = {
      [activeSide]: {
        isOn: activeSideStatus.isOn,
        targetTemperatureF: activeSideStatus.targetTemperatureF,
      }
    };

    await mutateDeviceStatus(deviceStatusPatch, {
      optimisticPatch: {
        left: {
          isOn: activeSideStatus.isOn,
          targetTemperatureF: activeSideStatus.targetTemperatureF,
        },
        right: {
          isOn: activeSideStatus.isOn,
          targetTemperatureF: activeSideStatus.targetTemperatureF,
        },
      },
    });
  };

  const restoreReturnedSideToSchedule = async () => {
    const scheduledTargetTemperature = getScheduledTargetTemperature(schedules?.[side], settings?.timeZone);
    if (scheduledTargetTemperature === undefined) return;

    await mutateDeviceStatus({
      [side]: {
        isOn: true,
        targetTemperatureF: scheduledTargetTemperature,
      }
    });
  };

  const handleClick = async () => {
    const awayMode = !checked;
    const nextSettings: DeepPartial<Settings> = side === 'left'
      ? { left: { awayMode } }
      : { right: { awayMode } };

    setIsSaving(true);
    setOptimisticSettings(nextSettings);
    try {
      await postSettings(nextSettings);
      if (awayMode) {
        await syncAwaySideToActiveSide();
      } else {
        await restoreReturnedSideToSchedule();
      }
    } catch (error) {
      console.error(error);
    } finally {
      void refetch().catch(error => {
        console.error(error);
      });
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant={ checked ? 'contained' : 'outlined' }
      disabled={ isSaving || isPending || isUpdating || !settings }
      onClick={ () => void handleClick() }
      aria-pressed={ checked }
      aria-label={ checked ? `Mark ${sideName} back` : `Set ${sideName} away` }
      sx={ {
        minWidth: 84,
      } }
    >
      { checked ? "I'm back" : 'Away' }
    </Button>
  );
}
