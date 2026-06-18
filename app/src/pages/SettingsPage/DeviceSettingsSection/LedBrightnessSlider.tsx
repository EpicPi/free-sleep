import { useEffect, useState } from 'react';
import { useDeviceStatus, useDeviceStatusMutation } from '@api/deviceStatus.ts';
import { DeviceStatus } from '@api/deviceStatusSchema.ts';
import _ from 'lodash';
import { useAppStore } from '@state/appStore.tsx';
import { Box, Slider, Typography } from '@mui/material';

export default function LedBrightnessSlider() {
  const { isUpdating } = useAppStore();
  const { data: deviceStatus } = useDeviceStatus();
  const { isPending, mutateDeviceStatus } = useDeviceStatusMutation();
  const [settingsCopy, setSettingsCopy] = useState<undefined | DeviceStatus['settings']>();
  useEffect(() => {
    if (!deviceStatus) return;
    const newDeviceStatus = _.cloneDeep(deviceStatus) as DeviceStatus;
    setSettingsCopy(newDeviceStatus.settings);
  }, [deviceStatus]);

  const handleChange = (settings: Partial<DeviceStatus['settings']>) => {
    const newSettings = _.merge({}, settingsCopy, settings);
    setSettingsCopy(newSettings);
  };

  const handleSave = () => {
    if (!settingsCopy) return;
    void mutateDeviceStatus({
      settings: settingsCopy,
    })
      .catch((error: unknown) => {
        console.error(error);
      });
  };
  return (

    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 1, width: '90%' } }>
      <Typography sx={ { } }>
        LED Brightness
      </Typography>
      <Slider
        value={ settingsCopy?.ledBrightness || 0 }
        onChangeCommitted={ handleSave }
        onChange={ (_, newValue) => {
          handleChange({
            ledBrightness: newValue as number,
          });
        } }
        min={ 0 }
        max={ 100 }
        step={ 1 }
        marks={ [
          { value: 0, label: 'Off' },
          { value: 100, label: '100%' },
        ] }
        disabled={ isUpdating || isPending }
        sx={ { width: '100%', ml: 2 } }
      />
    </Box>
  );
}
