import { Course } from '../types';

export function timeToMinutes(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([APap][Mm])$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && hh !== 12) hh += 12;
  if (ampm === "AM" && hh === 12) hh = 0;
  return hh * 60 + mm;
}

export function parseDays(dstr: string): Set<string> {
  const set = new Set<string>();
  if (!dstr) return set;
  const DAYS = ["M", "T", "W", "R", "F"];
  for (const ch of dstr.replace(/\s+/g, '')) {
    if (DAYS.includes(ch)) set.add(ch);
  }
  return set;
}

export function colorFor(crn: string): string {
  let x = 0;
  for (let i = 0; i < crn.length; i++) {
    x = (x * 131 + crn.charCodeAt(i)) % 360;
  }
  return `hsl(${x}, 65%, 55%)`;
}

export function parseHtmlTable(html: string, isBasicSchedule: boolean = false): { courses: Course[]; online: Course[] } {
  console.log('=== parseHtmlTable START ===');
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table.dataentrytable');
  
  if (!table) {
    throw new Error('No valid schedule table found');
  }

  const courses: Course[] = [];
  const online: Course[] = [];
  let currentSubject = '', currentCourse = '', currentTitle = '';
  let lastCRN = '', lastInstructor = '', lastColor = '', lastBg = '';

  // Pre-compile regex patterns for better performance
  const subjectPattern = /^([A-Z]+)\s*-\s*(.+)$/;
  const coursePattern = /^([A-Z]+)\s+(\d+)\s+-\s+(.+?)(?:\s+Lecture)?(?:\s+Lab)?$/;
  const timePattern = /(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i;
  const dayPattern = /^[MTWRF]$/;

  const rows = table.querySelectorAll('tr');
  console.log(`Total rows to process: ${rows.length}`);
  
  for (const row of Array.from(rows)) {
    // Subject header: <td colspan="23" class="deheader"><b><font...>ACCT - Accounting
    const subjHeader = row.querySelector('td.deheader b font[color="DARKBLUE"]');
    if (subjHeader) {
      const text = subjHeader.textContent?.trim() || '';
      const m = text.match(subjectPattern);
      if (m) {
        currentSubject = m[1];
      }
      continue;
    }

    // Course header: ACCT 001 - Financial Accounting
    const courseHeader = row.querySelector('td.deheader');
    if (courseHeader && courseHeader.textContent?.includes(' - ')) {
      const text = courseHeader.textContent.trim();
      const m = text.match(coursePattern);
      if (m) {
        currentSubject = m[1];
        currentCourse = m[2].padStart(3, '0');
        currentTitle = m[3].trim();
      }
      continue;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length < 10) continue;

    // Check if this is a continuation row (no CRN, has colspan="3" in first cell)
    const firstCell = cells[0];
    const isContinuation = firstCell && firstCell.getAttribute('colspan') === '3' && !row.querySelector('a[href*="p_course_popup"]');

    let crn, instructor, color, bg;
    let dayStartIndex = 3; // Default day column start index
    let timeIndex = 10; // Default time column index
    let locationIndex = 12; // Default location column index
    let campusIndex = 13; // Default campus column index

    if (isContinuation) {
      // Continuation row: reuse last CRN, instructor, color
      if (!lastCRN) continue; // Skip if no previous CRN
      crn = lastCRN;
      instructor = lastInstructor;
      color = lastColor;
      bg = lastBg;
      // After colspan="3", days are at cells[1-5], time at cells[8], location at cells[10], campus at cells[11]
      dayStartIndex = 1;
      timeIndex = 8;
      locationIndex = 10;
      campusIndex = 11;
    } else {
      // Main data row with CRN
      const crnLink = row.querySelector('a[href*="p_course_popup"]');
      if (!crnLink) continue;

      crn = crnLink.textContent?.trim() || '';
      instructor = cells[20]?.textContent?.trim() || '';
      color = colorFor(crn);
      bg = color.replace(/^hsl\(([^)]+)\)$/, 'hsla($1, 0.22)');

      // Save for potential continuation rows
      lastCRN = crn;
      lastInstructor = instructor;
      lastColor = color;
      lastBg = bg;
    }

    // Days: extract from appropriate column range
    let days = '';
    const dayEnd = Math.min(dayStartIndex + 5, cells.length);
    for (let i = dayStartIndex; i < dayEnd; i++) {
      const txt = cells[i]?.textContent?.trim();
      if (txt && dayPattern.test(txt)) days += txt;
    }

    // Time
    const timeText = cells[timeIndex]?.textContent?.trim() || '';
    const tm = timeText.match(timePattern);
    if (!tm) continue;

    const startMin = timeToMinutes(tm[1]);
    const endMin = timeToMinutes(tm[2]);
    if (startMin == null || endMin == null) continue;

    // Location and Campus
    const location = cells[locationIndex]?.textContent?.trim() || '';
    const campus = cells[campusIndex]?.textContent?.trim() || '';

    // Units (Credits) - index 2 for main rows, not available for continuation rows
    const units = isContinuation ? 0 : parseFloat(cells[2]?.textContent?.trim() || '0');
    
    // Enrollment data - lab sections don't have their own enrollment data
    let capacity, actual, remaining, waitCap, waitAct, waitRem;
    
    if (isBasicSchedule) {
      // Basic schedule mode: ignore all enrollment data
      capacity = 0;
      actual = 0;
      remaining = 0;
      waitCap = 0;
      waitAct = 0;
      waitRem = 0;
    } else if (isContinuation) {
      // Lab sections inherit enrollment data from the lecture section
      // They don't have individual enrollment data, so we use the lecture section's data
      capacity = 0;
      actual = 0;
      remaining = 0;
      waitCap = 0;
      waitAct = 0;
      waitRem = 0;
    } else {
      // Lecture sections have their own enrollment data
      const baseIndex = 15;
      capacity = parseInt(cells[baseIndex]?.textContent?.trim() || '0', 10);
      actual = parseInt(cells[baseIndex + 1]?.textContent?.trim() || '0', 10);
      remaining = parseInt(cells[baseIndex + 2]?.textContent?.trim() || '0', 10);
      waitCap = parseInt(cells[baseIndex + 3]?.textContent?.trim() || '0', 10);
      waitAct = parseInt(cells[baseIndex + 4]?.textContent?.trim() || '0', 10);
      waitRem = parseInt(cells[baseIndex + 5]?.textContent?.trim() || '0', 10);
    }

    const courseEntry: Course = {
      Subject: currentSubject,
      Course: currentCourse,
      CRN: crn,
      Title: currentTitle,
      Instructor: instructor,
      Location: location,
      Campus: campus,
      Units: units,
      Days: days,
      DispTime: timeText,
      StartMin: startMin,
      EndMin: endMin,
      Capacity: capacity,
      Actual: actual,
      Remaining: remaining,
      WaitCap: waitCap,
      WaitAct: waitAct,
      WaitRem: waitRem,
      __color: color,
      __bg: bg,
      isLabSection: isContinuation,
    };
    
    // Check if this is an online course (no days or location contains "Online")
    if (!days || days.length === 0 || location.toLowerCase().includes('online')) {
      online.push(courseEntry);
    } else {
      courses.push(courseEntry);
    }
    
  }
  
  console.log(`=== parseHtmlTable END: ${courses.length} scheduled courses, ${online.length} online courses ===`);
  return { courses, online };
}

export async function loadBasicSchedule(): Promise<string> {
  try {
    const response = await fetch('/basic-schedule.html');
    if (!response.ok) {
      throw new Error('Failed to load basic schedule');
    }
    const html = await response.text();
    
    // Extract the table content from the HTML file
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table.dataentrytable');
    
    if (!table) {
      throw new Error('No valid schedule table found in basic schedule file');
    }
    
    return table.outerHTML;
  } catch (error) {
    console.error('Error loading basic schedule:', error);
    throw new Error('Failed to load basic schedule. Please try the live import instead.');
  }
}
