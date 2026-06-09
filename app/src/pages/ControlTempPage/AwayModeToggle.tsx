import { Button } from '@mui/material';
import { DeepPartial } from 'ts-essentials';

import { getDeviceStatus, postDeviceStatus, useDeviceStatus } from '@api/deviceStatus.ts';
import { Settings } from '@api/settingsSchema.ts';
import { postSettings, useSettings } from '@api/settings.ts';
import { useAppStore } from '@state/appStore.tsx';

export default function AwayModeToggle() {
  const { data: settings, refetch } = useSettings();
  const { refetch: refetchDeviceStatus } = useDeviceStatus();
  const { isUpdating, setIsUpdating, side } = useAppStore();

  const sideName = settings?.[side]?.name || `${side.charAt(0).toUpperCase()}${side.slice(1)} side`;
  const checked = settings?.[side]?.awayMode || false;

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
  };

  const handleClick = async () => {
    const awayMode = !checked;
    const nextSettings: DeepPartial<Settings> = side === 'left'
      ? { left: { awayMode } }
      : { right: { awayMode } };

    setIsUpdating(true);
    try {
      await postSettings(nextSettings);
      if (awayMode) {
        await syncAwaySideToActiveSide();
      }
    } catch (error) {
      console.error(error);
    } finally {
      await Promise.all([
        refetch(),
        refetchDeviceStatus(),
      ]).catch(error => {
        console.error(error);
      });
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant={ checked ? 'contained' : 'outlined' }
      disabled={ isUpdating || !settings }
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
