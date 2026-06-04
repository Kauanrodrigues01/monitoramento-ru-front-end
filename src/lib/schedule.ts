import type { RestaurantSchedule, ScheduleException } from '../api/types';

export function currentWeekday(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? -1 : day - 1; // -1 = Sunday (no schedule), 0=Mon..5=Sat
}

export function currentTimeStr(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOpenNow(
  schedules: RestaurantSchedule[],
  exceptions: ScheduleException[],
): boolean {
  const weekday = currentWeekday();
  if (weekday === -1) return false;

  const time = currentTimeStr();
  const date = todayDateStr();

  const exception = exceptions.find((e) => e.exception_date === date);
  if (exception) {
    if (exception.exception_type === 'CLOSED') return false;
    if (
      exception.exception_type === 'CUSTOM_HOURS' &&
      exception.opens_at &&
      exception.closes_at
    ) {
      return (
        time >= exception.opens_at.slice(0, 5) && time <= exception.closes_at.slice(0, 5)
      );
    }
    return false;
  }

  return schedules
    .filter((s) => s.is_active && s.weekday === weekday)
    .some((s) => time >= s.opens_at.slice(0, 5) && time <= s.closes_at.slice(0, 5));
}

export function getTodaySchedules(schedules: RestaurantSchedule[]): RestaurantSchedule[] {
  const weekday = currentWeekday();
  if (weekday === -1) return [];
  return schedules.filter((s) => s.is_active && s.weekday === weekday);
}

export function getUpcomingExceptions(
  exceptions: ScheduleException[],
  days = 14,
): ScheduleException[] {
  const today = todayDateStr();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return exceptions
    .filter((e) => e.exception_date >= today && e.exception_date <= cutoffStr)
    .sort((a, b) => a.exception_date.localeCompare(b.exception_date));
}
