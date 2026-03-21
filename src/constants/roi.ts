/**
 * ROI Calculation constants
 *
 * Centralizes projection parameters and default slider values
 * for the ROI calculator.
 */

/** 3-year projection horizon in weeks */
export const PROJECTION_WEEKS = 156;

/** Standard annual work hours (40hrs/wk x 52wks) */
export const WORK_HOURS_YR = 2080;

/** Default values for the ROI model sliders */
export const ROI_DEFAULTS = {
  userCount: 10,
  userSalary: 70000,
  userHours: 10,
  devSalary: 150000,
  buildWeeks: 4,
  runCostWeekly: 2500,
} as const;
