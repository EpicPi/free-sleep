import schedule from 'node-schedule';
import { Settings } from '../db/settingsSchema.js';
import { DailySchedule, Side } from '../db/schedulesSchema.js';
import { updateDeviceStatus } from '../routes/deviceStatus/updateDeviceStatus.js';
import { logJob } from './utils.js';
import { executeAnalyzeSleep } from './analyzeSleep.js';
import { TimeZone } from '../db/timeZones.js';
import moment from 'moment-timezone';
import serverStatus from '../serverStatus.js';
import logger from '../logger.js';
import servicesDB from '../db/services.js';
import memoryDB from '../db/memoryDB.js';



export const schedulePowerOn = (settingsData: Settings, side: Side, power: DailySchedule['power']) => {
  if (!power.enabled) return;
  if (settingsData[side].awayMode) return;
  if (settingsData.timeZone === null) return;

  const onRule = new schedule.RecurrenceRule();
  const [onHour, onMinute] = power.on.split(':').map(Number);
  const time = power.on;
  onRule.hour = onHour;
  onRule.minute = onMinute;
  onRule.tz = settingsData.timeZone;

  logJob('Scheduling power on job', side, time);
  schedule.scheduleJob(`${side}-${time}-power-on`, onRule, async () => {
    try {
      logJob('Executing power on job', side, time);

      await updateDeviceStatus({
        [side]: {
          isOn: true,
          targetTemperatureF: power.onTemperature
        }
      });
      serverStatus.status.powerSchedule.status = 'healthy';
      serverStatus.status.powerSchedule.message = '';
    } catch (error: unknown) {
      serverStatus.status.powerSchedule.status = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      serverStatus.status.powerSchedule.message = message;
      logger.error(error);
    }
  });
};


const scheduleAnalyzeSleep = (offHour: number, offMinute: number, timeZone: TimeZone, side: Side) => {
  const dailyRule = new schedule.RecurrenceRule();
  const adjustedOffMinute = offMinute;
  dailyRule.hour = offHour;
  dailyRule.minute = adjustedOffMinute;
  dailyRule.tz = timeZone;
  const time = `${String(offHour).padStart(2, '0')}:${String(adjustedOffMinute).padStart(2, '0')}`;
  logJob('Scheduling daily sleep analyzer job', side, time);
  schedule.scheduleJob(`daily-analyze-sleep-${time}-${side}`, dailyRule, async () => {
    await servicesDB.read();
    if (!servicesDB.data.biometrics.enabled) {
      logger.debug('Not executing sleep analyzer job, biometrics is disabled');
      return;
    }

    await memoryDB.read();
    const now = performance.now();
    if (memoryDB.data[side].analyzeSleep.lastRan) {
      const diffMs = now - memoryDB.data[side].analyzeSleep.lastRan;
      const tenMinutesMs = 10 * 60 * 1000;
      if (diffMs <= tenMinutesMs) {
        logJob('Duplicate job detected, exiting!', side, time);
        return;
      }
    }
    memoryDB.data[side].analyzeSleep.lastRan = now;
    await memoryDB.write();

    logJob('Executing daily sleep analyzer job', side, time);
    // Subtract a fixed start time
    executeAnalyzeSleep(side, moment().subtract(12, 'hours').toISOString(), moment().add(1, 'hours').toISOString());
  });
};


export const schedulePowerOffAndSleepAnalysis = (settingsData: Settings, side: Side, power: DailySchedule['power']) => {
  if (!power.enabled) return;
  if (settingsData[side].awayMode) return;
  if (settingsData.timeZone === null) return;

  const offRule = new schedule.RecurrenceRule();
  const time = power.off;
  const [offHour, offMinute] = time.split(':').map(Number);
  offRule.hour = offHour;
  offRule.minute = offMinute;
  offRule.tz = settingsData.timeZone;
  scheduleAnalyzeSleep(offHour, offMinute, settingsData.timeZone, side);
  logJob('Scheduling power off job', side, time);

  schedule.scheduleJob(`${side}-${time}-power-off`, offRule, async () => {
    try {
      logJob('Executing power off job', side, time);
      await updateDeviceStatus({
        [side]: {
          isOn: false,
        }
      });
      serverStatus.status.powerSchedule.status = 'healthy';
      serverStatus.status.powerSchedule.message = '';
    } catch (error: unknown) {
      serverStatus.status.powerSchedule.status = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      serverStatus.status.powerSchedule.message = message;
      logger.error(error);
    }
  });
};

