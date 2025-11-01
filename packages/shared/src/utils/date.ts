import { format, parseISO, addMinutes } from 'date-fns';
import type { CalendarEvent } from '../types';

/**
 * Format a date to ISO string
 */
export function formatToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function parseISOString(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Format date for display
 */
export function formatDisplayDate(dateString: string, formatStr: string = 'PPp'): string {
  return format(parseISO(dateString), formatStr);
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = parseISO(event1.start);
  const end1 = parseISO(event1.end);
  const start2 = parseISO(event2.start);
  const end2 = parseISO(event2.end);

  return start1 < end2 && start2 < end1;
}

/**
 * Find free time slots in a given date range
 */
export function findFreeSlots(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  slotDuration: number = 60 // minutes
): { start: Date; end: Date }[] {
  const freeSlots: { start: Date; end: Date }[] = [];
  const sortedEvents = [...events].sort(
    (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()
  );

  let currentTime = startDate;

  for (const event of sortedEvents) {
    const eventStart = parseISO(event.start);

    if (currentTime < eventStart) {
      const gapDuration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
      if (gapDuration >= slotDuration) {
        freeSlots.push({
          start: currentTime,
          end: addMinutes(currentTime, Math.floor(gapDuration)),
        });
      }
    }

    const eventEnd = parseISO(event.end);
    if (eventEnd > currentTime) {
      currentTime = eventEnd;
    }
  }

  // Check for remaining time after last event
  if (currentTime < endDate) {
    const remainingDuration = (endDate.getTime() - currentTime.getTime()) / (1000 * 60);
    if (remainingDuration >= slotDuration) {
      freeSlots.push({
        start: currentTime,
        end: endDate,
      });
    }
  }

  return freeSlots;
}

/**
 * Check if a time slot is within working hours
 */
export function isWithinWorkingHours(
  dateTime: Date,
  workingHoursStart: string = '09:00',
  workingHoursEnd: string = '18:00'
): boolean {
  const timeString = format(dateTime, 'HH:mm');
  return timeString >= workingHoursStart && timeString <= workingHoursEnd;
}

/**
 * Calculate duration between two dates in minutes
 */
export function getDurationInMinutes(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
}
