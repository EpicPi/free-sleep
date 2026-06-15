import { useRef, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { Button, Box } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { DeepPartial } from 'ts-essentials';
import { type Side, useAppStore } from '@state/appStore.tsx';
import {
  DEVICE_STATUS_RECONCILE_DELAY_MS,
  useDeviceStatusMutation,
} from '@api/deviceStatus.ts';
import { DeviceStatus } from '@api/deviceStatusSchema.ts';
import { useSettings } from '@api/settings.ts';
import { MIN_TEMP_F, MAX_TEMP_F } from '@lib/temperatureConversions.ts';
import { useDeviceStatusStore } from '@state/deviceStatusStore.ts';

type TemperatureButtonsProps = {
  currentTargetTemp: number;
}

const DEBOUNCE_MS = 500;
export default function TemperatureButtons({ currentTargetTemp }: TemperatureButtonsProps) {
  const { side, isUpdating } = useAppStore();
  const { deviceStatus } = useDeviceStatusStore();
  const { applyOptimisticDeviceStatus, mutateDeviceStatus } = useDeviceStatusMutation();
  const { data: settings } = useSettings();
  const theme = useTheme();
  const debounceTimers = useRef<Partial<Record<Side, ReturnType<typeof setTimeout>>>>({});
  const pendingTargetTemperatures = useRef<Partial<Record<Side, number>>>({});

  const postUpdate = useCallback(async (updateSide: Side, targetTemperatureF: number) => {
    try {
      const nextDeviceStatus: DeepPartial<DeviceStatus> = {
        [updateSide]: { targetTemperatureF },
      };
      await mutateDeviceStatus(nextDeviceStatus, { optimistic: false, trackPending: false });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        if (pendingTargetTemperatures.current[updateSide] !== targetTemperatureF) return;
        delete pendingTargetTemperatures.current[updateSide];
      }, DEVICE_STATUS_RECONCILE_DELAY_MS);
    }
  }, [mutateDeviceStatus]);

  const scheduleUpdate = useCallback((updateSide: Side, targetTemperatureF: number) => {
    pendingTargetTemperatures.current[updateSide] = targetTemperatureF;
    const currentTimer = debounceTimers.current[updateSide];
    if (currentTimer) clearTimeout(currentTimer);
    debounceTimers.current[updateSide] = setTimeout(() => {
      const nextTargetTemperatureF = pendingTargetTemperatures.current[updateSide];
      if (nextTargetTemperatureF === undefined) return;
      void postUpdate(updateSide, nextTargetTemperatureF);
    }, DEBOUNCE_MS);
  }, [postUpdate]);


  const isInAwayMode = settings?.[side].awayMode;
  if (isInAwayMode) return null;

  const disabled = isUpdating || isInAwayMode;
  const borderColor = theme.palette.grey[800];
  const iconColor = theme.palette.grey[500];

  const handleClick = (change: number) => {
    if (!deviceStatus) return;
    const currentTargetTemperatureF = pendingTargetTemperatures.current[side] ?? deviceStatus[side].targetTemperatureF;
    const targetTemperatureF = Math.min(
      MAX_TEMP_F,
      Math.max(MIN_TEMP_F, currentTargetTemperatureF + change)
    );
    const nextDeviceStatus: DeepPartial<DeviceStatus> = {
      [side]: {
        targetTemperatureF,
      }
    };

    applyOptimisticDeviceStatus(nextDeviceStatus);
    scheduleUpdate(side, targetTemperatureF);
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
