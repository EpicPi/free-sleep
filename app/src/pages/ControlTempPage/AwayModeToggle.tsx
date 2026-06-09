import _ from 'lodash';
import { Button } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeepPartial } from 'ts-essentials';

import { getDeviceStatus, postDeviceStatus, useDeviceStatus } from '@api/deviceStatus.ts';
import { Settings } from '@api/settingsSchema.ts';
import { postSettings, useSettings } from '@api/settings.ts';
import { useAppStore } from '@state/appStore.tsx';
import { useOptimisticDeviceStatus } from './useOptimisticDeviceStatus.ts';

export default function AwayModeToggle() {
  const { data: settings, refetch } = useSettings();
  const { refetch: refetchDeviceStatus } = useDeviceStatus();
  const { isUpdating, side } = useAppStore();
  const queryClient = useQueryClient();
  const setOptimisticDeviceStatus = useOptimisticDeviceStatus();
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

    await postDeviceStatus({
      [activeSide]: {
        isOn: activeSideStatus.isOn,
        targetTemperatureF: activeSideStatus.targetTemperatureF,
      }
    });
    setOptimisticDeviceStatus({
      left: {
        isOn: activeSideStatus.isOn,
        targetTemperatureF: activeSideStatus.targetTemperatureF,
      },
      right: {
        isOn: activeSideStatus.isOn,
        targetTemperatureF: activeSideStatus.targetTemperatureF,
      },
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
      }
    } catch (error) {
      console.error(error);
    } finally {
      void Promise.all([
        refetch(),
        refetchDeviceStatus(),
      ]).catch(error => {
        console.error(error);
      });
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant={ checked ? 'contained' : 'outlined' }
      disabled={ isSaving || isUpdating || !settings }
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
