import SearchIcon from '@mui/icons-material/Search';
import { Button, Box } from '@mui/material';
import { useDeviceStatusMutation } from '@api/deviceStatus.ts';
import { DeviceStatus } from '@api/deviceStatusSchema.ts';
import { DeepPartial } from 'ts-essentials';
import { useAppStore } from '@state/appStore.tsx';
import { useSettings } from '@api/settings.ts';
import { useState } from 'react';
import { useServices } from '@api/services.ts';
import { Job, postJobs } from '@api/jobs.ts';
import { useSchedules } from '@api/schedules.ts';
import { getScheduledTargetTemperature } from '@lib/scheduleTemperature.ts';
import AnalyzeSleepNotification from './AnalyzeSleepNotification.tsx';


type PowerButtonProps = {
  isOn: boolean;
}

export default function PowerButton({ isOn }: PowerButtonProps) {
  const { isUpdating, side } = useAppStore();
  const { data: settings } = useSettings();
  const { data: services } = useServices();
  const { isPending, mutateDeviceStatus } = useDeviceStatusMutation();
  const { data: schedules } = useSchedules();
  const isInAwayMode = settings?.[side].awayMode;
  const disabled = isPending || isUpdating || isInAwayMode;
  const [showAnalyzeSleep, setShowAnalyzeSleep] = useState(false);
  const [showAnalyzeNotification, setShowAnalyzeNotification] = useState(false);

  const handleOnClick = (powerOn: boolean) => {
    const scheduledTargetTemperature = powerOn
      ? getScheduledTargetTemperature(schedules?.[side], settings?.timeZone)
      : undefined;
    const deviceStatus: DeepPartial<DeviceStatus> = {
      [side]: {
        isOn: powerOn,
        ...(scheduledTargetTemperature === undefined ? {} : { targetTemperatureF: scheduledTargetTemperature }),
      }
    };
    if (powerOn) {
      setShowAnalyzeSleep(false);
    } else {
      setShowAnalyzeSleep(true);
      setTimeout(() => setShowAnalyzeSleep(false), 20_000);
    }

    void mutateDeviceStatus(deviceStatus)
      .catch((error: unknown) => {
        console.error(error);
      });
  };

  const handleAnalyzeSleep = () => {
    const capitalizedSide = side.charAt(0).toUpperCase() + side.slice(1) as 'Left' | 'Right';
    const analyzeSleepJob = `analyzeSleep${capitalizedSide}` as Job;
    setShowAnalyzeNotification(true);
    postJobs([analyzeSleepJob])
      .catch(error => {
        console.error(error);
      });
    setTimeout(() => setShowAnalyzeNotification(false), 120_000);
  };
  if (isInAwayMode) return null;

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 2 } }>
      <Button variant="outlined" disabled={ disabled } onClick={ () => handleOnClick(!isOn) }>
        { isOn ? 'Turn off' : 'Turn on' }
      </Button>
      {
        showAnalyzeSleep && !isUpdating && !isPending && services?.biometrics?.enabled && (
          <Button
            variant="contained"
            disabled={ disabled }
            onClick={ handleAnalyzeSleep }
          >
            <SearchIcon />
            Analyze sleep
          </Button>
        )
      }
      {
        showAnalyzeNotification && (
          <AnalyzeSleepNotification />
        )
      }
    </Box>
  );
}
