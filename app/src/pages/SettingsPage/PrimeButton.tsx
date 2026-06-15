import Button from '@mui/material/Button';
import { useDeviceStatusMutation } from '@api/deviceStatus.ts';
import { useAppStore } from '@state/appStore.tsx';

export default function PrimeButton() {
  const { isUpdating } = useAppStore();
  const { isPending, mutateDeviceStatus } = useDeviceStatusMutation();

  const handleClick = () => {
    void mutateDeviceStatus({
      isPriming: true,
    })
      .catch((error: unknown) => {
        console.error(error);
      });
  };

  return (
    <Button variant="contained" onClick={ handleClick } disabled={ isUpdating || isPending }>
      Prime now
    </Button>
  );
}
