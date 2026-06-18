import _ from 'lodash';
import { create } from 'zustand';
import { DailySchedule, Schedules } from '@api/schedulesSchema.ts';
import { DeepPartial } from 'ts-essentials';
import { AccordionExpanded } from './SchedulePage.types.ts';
import { useAppStore } from '@state/appStore.tsx';



type Validations = {
  powerOffTimeIsValid: boolean;
  alarmTimeIsValid: boolean;
  // TODO: Validate temperature adjustments
  // temperatureAdjustmentsValid: boolean,
};

const DEFAULT_VALIDATIONS: Validations = {
  powerOffTimeIsValid: true,
  alarmTimeIsValid: true,
  // temperatureAdjustmentsValid: true,
};

type ScheduleStore = {
  reloadScheduleData: () => void;

  changesPresent: boolean,
  checkForChanges: () => void;
  setAccordionExpanded: (accordion: AccordionExpanded) => void;
  accordionExpanded: AccordionExpanded;

  validations: Validations;
  setValidations: (newValidations: DeepPartial<Validations>) => void;
  isValid: () => boolean;

  selectedSchedule: DailySchedule | undefined;
  updateSelectedSchedule: (dailySchedule: DeepPartial<DailySchedule>) => void;
  updateSelectedTemperatures: (temperatures: DailySchedule['temperatures']) => void;

  // Keep a copy of the original schedules
  originalSchedules: Schedules | undefined;
  setOriginalSchedules: (originalSchedules: Schedules) => void;
};

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  selectedSchedule: undefined,

  reloadScheduleData: () => {
    const { side } = useAppStore.getState();
    const { originalSchedules } = get();
    if (!originalSchedules) return;
    const selectedSchedule = _.cloneDeep(originalSchedules[side]);

    set({
      accordionExpanded: undefined,
      validations: { ...DEFAULT_VALIDATIONS },
      selectedSchedule,
      changesPresent: false,
    });
  },

  accordionExpanded: undefined,
  setAccordionExpanded: (accordionExpanded) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    get().accordionExpanded === accordionExpanded ? set({ accordionExpanded: undefined }) : set({ accordionExpanded });
  },

  validations: {
    powerOffTimeIsValid: true,
    alarmTimeIsValid: true,
  },
  setValidations: (newValidations) => {
    const { validations } = get();
    set({ validations: _.merge(validations, newValidations) });
  },
  isValid: () => {
    const { validations } = get();
    return _.every(validations);
  },
  changesPresent: false,
  checkForChanges: () => {
    const { selectedSchedule, originalSchedules } = get();
    if (!originalSchedules || !selectedSchedule) return;
    const { side } = useAppStore.getState();
    const changesPresent = !_.isEqual(originalSchedules[side], selectedSchedule);

    set({ changesPresent });
  },

  // Updating schedules
  updateSelectedSchedule: (newSelectedSchedule) => {
    const { selectedSchedule, checkForChanges } = get();
    if (!selectedSchedule) return;
    const selectedScheduleCopy = _.cloneDeep(selectedSchedule);
    _.merge(selectedScheduleCopy, newSelectedSchedule);

    set({ selectedSchedule: selectedScheduleCopy });
    checkForChanges();
  },
  // Updating schedules - (Temperatures) - needs to replace the entire temperatures field instead of merging it
  updateSelectedTemperatures: (temperatures) => {
    const { selectedSchedule, checkForChanges } = get();
    const selectedScheduleCopy = _.cloneDeep(selectedSchedule);
    if (!selectedSchedule) return;
    set({
      // @ts-ignore
      selectedSchedule: {
        ...selectedScheduleCopy,
        temperatures,
      },
    });
    checkForChanges();
  },

  originalSchedules: undefined,
  setOriginalSchedules: (originalSchedules) => {
    const { side } = useAppStore.getState();
    if (originalSchedules[side] === undefined) return;
    const selectedSchedule = _.cloneDeep(originalSchedules[side]);

    set({ originalSchedules, selectedSchedule, changesPresent: false });
  },
}));
