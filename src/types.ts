export interface Course {
  Subject: string;
  Course: string;
  CRN: string;
  Title: string;
  Instructor: string;
  Location: string;
  Campus: string;
  Units: number;
  Days: string;
  DispTime: string;
  StartMin: number;
  EndMin: number;
  Capacity: number;
  Actual: number;
  Remaining: number;
  WaitCap: number;
  WaitAct: number;
  WaitRem: number;
  __color: string;
  __bg: string;
  isLabSection?: boolean;
}

export interface FilterState {
  subjectAllow: Set<string>;
  courseAllow: Set<string>;
  instructorAllow: Set<string>;
  campusAllow: Set<string>;
  showOnline: boolean;
  showFullClasses: boolean;
  showFullWaitlist: boolean;
}

export interface SubjectData {
  courses: Course[];
  courseNumbers: Set<string>;
  instructors: Set<string>;
  campuses: Set<string>;
}

export interface AppState {
  allCourses: Course[];
  onlineCourses: Course[];
  mySchedule: Course[];
  myOnlineClasses: Course[];
  subjects: Set<string>;
  courses: Set<string>;
  instructors: Set<string>;
  campuses: Set<string>;
  subjectData: Map<string, SubjectData>;
  filters: FilterState;
  isLoading: boolean;
  error: string | null;
  importProgress: number;
  importProgressText: string;
}

export const DAYS = ['M', 'T', 'W', 'R', 'F'] as const;
export const DAY_LABELS = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri' } as const;
export const PX_PER_HOUR = 80;
export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 22 * 60;
