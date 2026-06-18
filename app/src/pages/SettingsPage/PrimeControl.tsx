import PrimeButton from './PrimeButton.tsx';
import PrimingNotification from './PrimingNotification.tsx';
import { useDeviceStatus } from '@api/deviceStatus.ts';

export default function PrimeControl() {
  const { data: deviceStatus } = useDeviceStatus();
  return (
    deviceStatus?.isPriming ?
      <PrimingNotification />
      :
      <PrimeButton/>
  );
}
