import { Side } from '../db/schedulesSchema.js';
import logger from '../logger.js';

export function logJob(message: string, side: Side, time: string) {
  const endHour = Number(time.split(':')[0]);
  const timeOfDay = endHour < 11 ? 'morning' : 'night';
  logger.debug(`${message} for ${side} side daily ${timeOfDay} @ ${time}`);
}
