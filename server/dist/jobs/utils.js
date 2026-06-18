import logger from '../logger.js';
export function logJob(message, side, time) {
    const endHour = Number(time.split(':')[0]);
    const timeOfDay = endHour < 11 ? 'morning' : 'night';
    logger.debug(`${message} for ${side} side daily ${timeOfDay} @ ${time}`);
}
//# sourceMappingURL=utils.js.map