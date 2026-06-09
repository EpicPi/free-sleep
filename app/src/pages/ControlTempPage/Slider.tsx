import { CircularSliderWithChildren } from 'react-circular-slider-svg';
import { useAppStore } from '@state/appStore';
import styles from './Slider.module.scss';
import TemperatureLabel from './TemperatureLabel.tsx';
import TemperatureButtons from './TemperatureButtons.tsx';
import { useControlTempStore } from './controlTempStore.tsx';
import { useTheme } from '@mui/material/styles';
import { useResizeDetector } from 'react-resize-detector';
import { MAX_TEMP_F, MIN_TEMP_F, getTemperatureColor } from '@lib/temperatureConversions.ts';

type SliderProps = {
  isOn: boolean;
  currentTargetTemp: number;
  currentTemperatureF: number;
  refetch: any;
  displayCelsius: boolean;
}

const ignoreCircularSelectorChange = () => undefined;

export default function Slider({ isOn, currentTargetTemp, refetch, currentTemperatureF, displayCelsius }: SliderProps) {
  const { deviceStatus } = useControlTempStore();
  const { side } = useAppStore();
  const { width, ref } = useResizeDetector();
  const theme = useTheme();
  const sliderColor = getTemperatureColor(deviceStatus?.[side]?.targetTemperatureF);

  const arcBackgroundColor = theme.palette.grey[700];

  const sideStatus = deviceStatus?.[side];
  const minTemp = Math.min(sideStatus?.currentTemperatureF || 55, sideStatus?.targetTemperatureF || 55);
  const maxTemp = Math.max(sideStatus?.currentTemperatureF || 55, sideStatus?.targetTemperatureF || 55);

  return (
    <div
      ref={ ref }
      style={ { position: 'relative', display: 'inline-block', width: '100%', maxWidth: '400px' } }
    >
      { /* The circular selector is display-only; the buttons below change the target temperature. */ }
      <div className={ styles.Slider }>
        <CircularSliderWithChildren
          disabled
          size={ width }
          trackWidth={ 6 }
          minValue={ MIN_TEMP_F }
          maxValue={ MAX_TEMP_F }
          startAngle={ 60 }
          endAngle={ 300 }
          angleType={ {
            direction: 'cw',
            axis: '-y'
          } }
          handle1={ {
            value: minTemp,
            onChange: ignoreCircularSelectorChange,

          } }
          arcColor={ isOn ? sliderColor : arcBackgroundColor }
          arcBackgroundColor={ arcBackgroundColor }
          handle2={ {
            value: maxTemp,
            onChange: ignoreCircularSelectorChange,
          } }
          handleSize={ 8 }
        >
          <TemperatureLabel
            isOn={ isOn }
            sliderTemp={ deviceStatus?.[side]?.targetTemperatureF || 55 }
            sliderColor={ sliderColor }
            currentTargetTemp={ currentTargetTemp }
            currentTemperatureF={ currentTemperatureF }
            displayCelsius={ displayCelsius }
          />
        </CircularSliderWithChildren>
      </div>
      {
        isOn && (
          <TemperatureButtons refetch={ refetch } currentTargetTemp={ currentTargetTemp }/>
        ) }
    </div>
  );
};
