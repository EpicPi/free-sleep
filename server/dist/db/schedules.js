// LowDB, stores the schedules in /persistent/free-sleep-data/lowdb/schedulesDB.json
import _ from 'lodash';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DailyScheduleSchema } from './schedulesSchema.js';
import config from '../config.js';
const defaultDailySchedule = {
    temperatures: {},
    power: {
        on: '21:00',
        off: '09:00',
        enabled: false,
        onTemperature: 82,
    },
    alarm: {
        time: '09:00',
        vibrationIntensity: 100,
        vibrationPattern: 'rise',
        duration: 10,
        enabled: false,
        alarmTemperature: 82,
    }
};
const defaultData = {
    left: _.cloneDeep(defaultDailySchedule),
    right: _.cloneDeep(defaultDailySchedule),
};
const DAY_KEYS = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
];
const isRecord = (value) => (typeof value === 'object' && value !== null);
const parseScheduleWithDefaults = (schedule) => {
    const parsedSchedule = DailyScheduleSchema.deepPartial().safeParse(schedule);
    if (!parsedSchedule.success)
        return undefined;
    return DailyScheduleSchema.parse(_.merge({}, defaultDailySchedule, parsedSchedule.data));
};
// Converts existing seven-day data to the single shared daily schedule.
const getMostCommonLegacySchedule = (sideSchedule) => {
    const groupedSchedules = [];
    DAY_KEYS.forEach(day => {
        const dailySchedule = parseScheduleWithDefaults(sideSchedule[day]);
        if (!dailySchedule)
            return;
        const matchingGroup = groupedSchedules.find(group => _.isEqual(group.schedule, dailySchedule));
        if (matchingGroup) {
            matchingGroup.count += 1;
        }
        else {
            groupedSchedules.push({ count: 1, schedule: dailySchedule });
        }
    });
    return _.cloneDeep(_.maxBy(groupedSchedules, group => group.count)?.schedule ?? defaultDailySchedule);
};
const normalizeSideSchedule = (sideSchedule) => {
    const dailySchedule = parseScheduleWithDefaults(sideSchedule);
    if (dailySchedule)
        return dailySchedule;
    if (isRecord(sideSchedule))
        return getMostCommonLegacySchedule(sideSchedule);
    return _.cloneDeep(defaultDailySchedule);
};
const normalizeSchedules = (schedules) => {
    const schedulesRecord = isRecord(schedules) ? schedules : {};
    return {
        left: normalizeSideSchedule(schedulesRecord.left),
        right: normalizeSideSchedule(schedulesRecord.right),
    };
};
const file = new JSONFile(`${config.lowDbFolder}schedulesDB.json`);
const schedulesDB = new Low(file, defaultData);
await schedulesDB.read();
// Allows us to add default values and migrate existing per-day schedules.
schedulesDB.data = normalizeSchedules(schedulesDB.data);
await schedulesDB.write();
export default schedulesDB;
//# sourceMappingURL=schedules.js.map