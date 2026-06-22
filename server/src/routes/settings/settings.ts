import _ from 'lodash';
import express, { Request, Response } from 'express';
import logger from '../../logger.js';

const router = express.Router();

import settingsDB from '../../db/settings.js';
import schedulesDB from '../../db/schedules.js';
import { SettingsSchema } from '../../db/settingsSchema.js';
import { getScheduledTargetTemperature } from '../../lib/scheduleTemperature.js';
import { updateDeviceStatus } from '../deviceStatus/updateDeviceStatus.js';
import { Side } from '../../db/schedulesSchema.js';

const SIDES: Side[] = ['left', 'right'];

async function restoreReturningSidesToScheduledTargets(returningSides: Side[]) {
  if (returningSides.length === 0) return;

  await schedulesDB.read();

  for (const side of returningSides) {
    const scheduledTargetTemperature = getScheduledTargetTemperature(
      schedulesDB.data[side],
      settingsDB.data.timeZone,
    );

    if (scheduledTargetTemperature === undefined) {
      logger.info(`No scheduled target temperature to restore for ${side} side`);
      continue;
    }

    logger.info(`Restoring ${side} side to scheduled target temperature ${scheduledTargetTemperature}`);
    await updateDeviceStatus({
      [side]: {
        isOn: true,
        targetTemperatureF: scheduledTargetTemperature,
      }
    });
  }
}

router.get('/settings', async (req: Request, res: Response) => {
  await settingsDB.read();
  res.json(settingsDB.data);
});


router.post('/settings', async (req: Request, res: Response) => {
  const { body } = req;
  const validationResult = SettingsSchema.deepPartial().safeParse(body);
  if (!validationResult.success) {
    logger.error('Invalid settings update:', validationResult.error);
    res.status(400).json({
      error: 'Invalid request data',
      details: validationResult?.error?.errors,
    });
    return;
  }
  delete body.id;
  await settingsDB.read();
  const returningSides = SIDES.filter((side) => settingsDB.data[side].awayMode && body?.[side]?.awayMode === false);
  _.merge(settingsDB.data, body);
  await settingsDB.write();
  await restoreReturningSidesToScheduledTargets(returningSides);
  res.status(200).json(settingsDB.data);
});


export default router;
