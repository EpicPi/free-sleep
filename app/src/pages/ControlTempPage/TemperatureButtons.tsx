import { useRef, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { Button, Box } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { DeepPartial } from 'ts-essentials';
import { useControlTempStore } from './controlTempStore.tsx';
import { useAppStore } from '@state/appStore.tsx';
import { postDeviceStatus } from '@api/deviceStatus.ts';
import { DeviceStatus } from '@api/deviceStatusSchema.ts';
import { useSettings } from '@api/settings.ts';
import { MIN_TEMP_F, MAX_TEMP_F } from '@lib/temperatureConversions.ts';
import { useOptimisticDeviceStatus } from './useOptimisticDeviceStatus.ts';

type TemperatureButtonsProps = {
  refetch: any;
  currentTargetTemp: number;
}

const DEBOUNCE_MS = 500;
export default function TemperatureButtons({ refetch, currentTargetTemp }: TemperatureButtonsProps) {
  const { side, isUpdating } = useAppStore();
  const { deviceStatus } = useControlTempStore();
  const setOptimisticDeviceStatus = useOptimisticDeviceStatus();
  const { data: settings } = useSettings();
  const theme = useTheme();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargetTemperatureF = useRef<number | undefined>(undefined);

  const postUpdate = useCallback(async (targetTemperatureF: number) => {
    try {
      await postDeviceStatus({
        [side]: { targetTemperatureF },
      });
    } catch (err) {
      console.error(err);
    } finally {
      void refetch?.().catch((error: unknown) => {
        console.error(error);
      });
    }
  }, [side, refetch]);

  const scheduleUpdate = useCallback((targetTemperatureF: number) => {
    pendingTargetTemperatureF.current = targetTemperatureF;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const nextTargetTemperatureF = pendingTargetTemperatureF.current;
      if (nextTargetTemperatureF === undefined) return;
      void postUpdate(nextTargetTemperatureF);
    }, DEBOUNCE_MS);
  }, [postUpdate]);


  const isInAwayMode = settings?.[side].awayMode;
  if (isInAwayMode) return null;

  const disabled = isUpdating || isInAwayMode;
  const borderColor = theme.palette.grey[800];
  const iconColor = theme.palette.grey[500];

  const handleClick = (change: number) => {
    if (!deviceStatus) return;
    const targetTemperatureF = Math.min(
      MAX_TEMP_F,
      Math.max(MIN_TEMP_F, deviceStatus[side].targetTemperatureF + change)
    );
    const nextDeviceStatus: DeepPartial<DeviceStatus> = {
      [side]: {
        targetTemperatureF,
      }
    };

    setOptimisticDeviceStatus(nextDeviceStatus);
    scheduleUpdate(targetTemperatureF);
  };

  const buttonStyle = {
    borderWidth: '2px',
    borderColor,
    width: 50,
    height: 50,
    borderRadius: '50%',
    minWidth: 0,
    padding: 0,
  };

  return (
    <Box
      sx={ {
        top: '75%',
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '100px',
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
      } }
    >
      <Button
        variant="outlined"
        color="primary"
        sx={ buttonStyle }
        onClick={ () => handleClick(-1) }
        disabled={ disabled || currentTargetTemp <= MIN_TEMP_F }
      >
        <Remove sx={ { color: iconColor } }/>
      </Button>
      <Button
        variant="outlined"
        sx={ buttonStyle }

        onClick={ () => handleClick(1) }
        disabled={ disabled || currentTargetTemp >= MAX_TEMP_F }
      >
        <Add sx={ { color: iconColor } }/>
      </Button>
    </Box>
  );
}
