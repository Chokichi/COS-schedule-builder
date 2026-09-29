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

export function matchesNeededOrSubjectFilters(
  course: Pick<Course, 'Subject' | 'Course'>,
  filters: { neededCourses: Set<string>; subjectAllow: Set<string>; courseAllow: Set<string> }
): boolean {
  if (filters.neededCourses.size > 0) {
    return filters.neededCourses.has(catalogClassKey(course.Subject, course.Course));
  }
  const subjOk = filters.subjectAllow.size === 0 || filters.subjectAllow.has(course.Subject);
  const courseOk = filters.courseAllow.size === 0 || filters.courseAllow.has(course.Course);
  return subjOk && courseOk;
}

export function filtersFromNeededCourses(neededCourses: Set<string>): {
  neededCourses: Set<string>;
  subjectAllow: Set<string>;
  courseAllow: Set<string>;
} {
  const subjectAllow = new Set<string>();
  const courseAllow = new Set<string>();
  neededCourses.forEach(key => {
    const parsed = parseClassKey(key);
    if (!parsed) return;
    subjectAllow.add(parsed.subject);
    courseAllow.add(parsed.course);
  });
  return { neededCourses: new Set(neededCourses), subjectAllow, courseAllow };
}
