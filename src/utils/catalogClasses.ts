import { Course } from '../types';

export type CatalogClass = {
  key: string;
  subject: string;
  course: string;
  title: string;
};

export function catalogClassKey(subject: string, course: string): string {
  return `${subject} ${course}`;
}

export function parseClassKey(key: string): { subject: string; course: string } | null {
  const match = key.trim().match(/^([A-Za-z]+)\s+(.+)$/);
  if (!match) return null;
  return { subject: match[1].toUpperCase(), course: match[2] };
}

export function uniqueCatalogClasses(courses: Course[]): CatalogClass[] {
  const map = new Map<string, CatalogClass>();
  for (const course of courses) {
    const key = catalogClassKey(course.Subject, course.Course);
    if (!map.has(key)) {
      map.set(key, {
        key,
        subject: course.Subject,
        course: course.Course,
        title: course.Title,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function normalizeCourseNumber(courseNum: string): string {
  return courseNum.replace(/^0+/, '') || '0';
}

export function searchCatalogClasses(classes: CatalogClass[], query: string): CatalogClass[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const subjectCourseMatch = trimmed.match(/^([a-z]+)\s*(\d+[a-z]*)$/i);
  const subjectPrefix = subjectCourseMatch ? subjectCourseMatch[1].toUpperCase() : '';
  const courseNumQuery = subjectCourseMatch ? subjectCourseMatch[2] : '';

  return classes.filter(entry => {
    if (subjectPrefix) {
      if (entry.subject !== subjectPrefix) return false;
      const normalizedCourse = normalizeCourseNumber(entry.course);
      const normalizedQuery = normalizeCourseNumber(courseNumQuery);
      return normalizedCourse === normalizedQuery
        || normalizedCourse.startsWith(normalizedQuery)
        || entry.course.toLowerCase().includes(courseNumQuery.toLowerCase());
    }

    if (entry.key.toLowerCase().includes(lower)) return true;
    if (entry.title.toLowerCase().includes(lower)) return true;
    if (entry.subject.toLowerCase().includes(lower)) return true;
    if (entry.course.toLowerCase().includes(lower)) return true;
    if (/^\d+[a-z]*$/i.test(trimmed)) {
      return normalizeCourseNumber(entry.course) === normalizeCourseNumber(trimmed)
        || normalizeCourseNumber(entry.course).startsWith(normalizeCourseNumber(trimmed));
    }
    return false;
  }).slice(0, 40);
}

/**
 * Chosen classes win whenever there are any; subject chips only scope the
 * calendar while nothing has been chosen yet.
 */
export function matchesNeededOrSubjectFilters(
  course: Pick<Course, 'Subject' | 'Course'>,
  filters: { neededCourses: Set<string>; subjectAllow: Set<string> }
): boolean {
  if (filters.neededCourses.size > 0) {
    return filters.neededCourses.has(catalogClassKey(course.Subject, course.Course));
  }
  return filters.subjectAllow.size === 0 || filters.subjectAllow.has(course.Subject);
}

/**
 * Newly added classes open their subject's course-number group; removing a
 * class never re-opens a subject the student closed.
 */
export function filtersFromNeededCourses(
  neededCourses: Set<string>,
  currentSubjects: Set<string> = new Set(),
  previousNeeded: Set<string> = new Set(),
): {
  neededCourses: Set<string>;
  subjectAllow: Set<string>;
  courseAllow: Set<string>;
} {
  const subjectAllow = new Set<string>(currentSubjects);
  neededCourses.forEach(key => {
    if (previousNeeded.has(key)) return;
    const parsed = parseClassKey(key);
    if (parsed) subjectAllow.add(parsed.subject);
  });
  return { neededCourses: new Set(neededCourses), subjectAllow, courseAllow: new Set() };
}

/** Older saves filtered by bare course numbers; turn those into chosen classes. */
export function neededFromLegacyCourseFilter(
  subjectAllow: Set<string>,
  courseAllow: Set<string>,
  catalog: Pick<Course, 'Subject' | 'Course'>[],
): Set<string> {
  const needed = new Set<string>();
  if (courseAllow.size === 0) return needed;
  for (const course of catalog) {
    const subjectOk = subjectAllow.size === 0 || subjectAllow.has(course.Subject);
    if (subjectOk && courseAllow.has(course.Course)) {
      needed.add(catalogClassKey(course.Subject, course.Course));
    }
  }
  return needed;
}

export function toggleNeededCourse(neededCourses: Set<string>, key: string): Set<string> {
  const next = new Set(neededCourses);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
