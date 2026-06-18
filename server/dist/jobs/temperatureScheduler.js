import schedule from 'node-schedule';
import { logJob } from './utils.js';
import { updateDeviceStatus } from '../routes/deviceStatus/updateDeviceStatus.js';
import serverStatus from '../serverStatus.js';
import logger from '../logger.js';
const scheduleAdjustment = (timeZone, side, time, temperature) => {
    const onRule = new schedule.RecurrenceRule();
    const [onHour, onMinute] = time.split(':').map(Number);
    logJob('Scheduling temperature adjustment job', side, time);
    onRule.hour = onHour;
    onRule.minute = onMinute;
    onRule.tz = timeZone;
    schedule.scheduleJob(`${side}-${time}-${temperature}-temperature-adjustment`, onRule, async () => {
        try {
            logJob('Executing temperature adjustment job', side, time);
            await updateDeviceStatus({
                [side]: {
                    targetTemperatureF: temperature,
                }
            });
            serverStatus.status.temperatureSchedule.status = 'healthy';
            serverStatus.status.temperatureSchedule.message = '';
        }
        catch (error) {
            serverStatus.status.temperatureSchedule.status = 'failed';
            const message = error instanceof Error ? error.message : String(error);
            serverStatus.status.temperatureSchedule.message = message;
            logger.error(error);
        }
    });
};
export const scheduleTemperatures = (settingsData, side, temperatures) => {
    if (settingsData[side].awayMode)
        return;
    const { timeZone } = settingsData;
    if (timeZone === null)
        return;
    Object.entries(temperatures).forEach(([time, temperature]) => {
        scheduleAdjustment(timeZone, side, time, temperature);
    });
};
//# sourceMappingURL=temperatureScheduler.js.map