import { Course, CustomTimeBlock } from '../types';

const DAY_NAME_TO_CODE: { [key: string]: string } = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'R',
  Friday: 'F',
};

function timeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
  return totalMinutes;
}

export function customBlocksToCourses(customBlocks: CustomTimeBlock[]): Course[] {
  const result: Course[] = [];

  customBlocks.forEach(block => {
    block.days.forEach(day => {
      const dayCode = DAY_NAME_TO_CODE[day];
      if (dayCode && block.times[day]) {
        const { start, end } = block.times[day];
        result.push({
          CRN: block.id,
          Subject: 'Custom',
          Course: 'Block',
          Title: block.title,
          Instructor: block.instructor || '',
          Days: dayCode,
          DispTime: `${start} - ${end}`,
          StartMin: timeToMinutes(start),
          EndMin: timeToMinutes(end),
          Units: 0,
          Campus: block.campus || '',
          Location: block.location || '',
          Capacity: 0,
          Actual: 0,
          Remaining: 0,
          WaitCap: 0,
          WaitAct: 0,
          WaitRem: 0,
          __color: block.color,
          __bg: block.color,
          isCustomBlock: true,
          customCrn: block.crn,
          customField: block.customField,
        });
      }
    });
  });

  return result;
}

export function meetingsOverlap(
  a: Pick<Course, 'Days' | 'StartMin' | 'EndMin'>,
  b: Pick<Course, 'Days' | 'StartMin' | 'EndMin'>
): boolean {
  const daysOverlap = Array.from(a.Days).some(d => b.Days.includes(d));
  return daysOverlap && a.StartMin < b.EndMin && a.EndMin > b.StartMin;
}

export function occupiedMeetings(mySchedule: Course[], customBlocks: CustomTimeBlock[]): Course[] {
  return [...mySchedule, ...customBlocksToCourses(customBlocks)];
}

export function conflictingCrns(catalog: Course[], occupied: Course[]): Set<string> {
  if (occupied.length === 0) return new Set();

  const byCrn = new Map<string, Course[]>();
  for (const course of catalog) {
    const meetings = byCrn.get(course.CRN);
    if (meetings) {
      meetings.push(course);
    } else {
      byCrn.set(course.CRN, [course]);
    }
  }

  const result = new Set<string>();
  byCrn.forEach((meetings, crn) => {
    if (meetings.some(meeting => occupied.some(slot => meetingsOverlap(meeting, slot)))) {
      result.add(crn);
    }
  });
  return result;
}

export function firstConflictName(meetings: Course[], occupied: Course[]): string | null {
  for (const meeting of meetings) {
    const hit = occupied.find(slot => meetingsOverlap(meeting, slot));
    if (hit) {
      return hit.isCustomBlock ? hit.Title : `${hit.Subject} ${hit.Course}`;
    }
  }
  return null;
}
