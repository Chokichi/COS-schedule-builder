/**
 * Parse a Banner dataentrytable into compact course rows (no derived colors).
 * Mirrors src/utils/parser.ts so the D1 snapshot matches the in-app catalog.
 */

function timeToMinutes(t) {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([APap][Mm])$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  return hh * 60 + mm;
}

function compactCourse(row) {
  return {
    Subject: row.Subject,
    Course: row.Course,
    CRN: row.CRN,
    Title: row.Title,
    Instructor: row.Instructor,
    Location: row.Location,
    Campus: row.Campus,
    Units: row.Units,
    Days: row.Days,
    DispTime: row.DispTime,
    StartMin: row.StartMin,
    EndMin: row.EndMin,
    Capacity: row.Capacity,
    Actual: row.Actual,
    Remaining: row.Remaining,
    WaitCap: row.WaitCap,
    WaitAct: row.WaitAct,
    WaitRem: row.WaitRem,
    isLabSection: !!row.isLabSection,
  };
}

function elementClassName(el) {
  return [
    el.getAttribute('class'),
    el.getAttribute('CLASS'),
    typeof el.className === 'string' ? el.className : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

function hasClass(el, name) {
  return elementClassName(el).split(/\s+/).includes(name.toLowerCase());
}

function findScheduleTable(document) {
  const tables = Array.from(document.querySelectorAll('table'));
  return tables.find((table) => elementClassName(table).includes('dataentrytable'))
    || document.querySelector('table.dataentrytable')
    || null;
}

function deheaderCells(row) {
  return Array.from(row.querySelectorAll('td')).filter((td) => hasClass(td, 'deheader'));
}

function parseScheduleTable(document) {
  const table = findScheduleTable(document);
  if (!table) {
    throw new Error('No valid schedule table found');
  }

  const courses = [];
  const online = [];
  let currentSubject = '';
  let currentCourse = '';
  let currentTitle = '';
  let lastCRN = '';
  let lastInstructor = '';

  const subjectPattern = /^([A-Z]+)\s*-\s*(.+)$/;
  const coursePattern = /^([A-Z]+)\s+([A-Z]?\d+[A-Z]?)\s+-\s+(.+?)(?:\s+Lecture)?(?:\s+Lab)?$/;
  const timePattern = /(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i;
  const dayPattern = /^[MTWRF]$/;

  const rows = table.querySelectorAll('tr');
  for (const row of Array.from(rows)) {
    const headers = deheaderCells(row);
    const subjHeader = headers
      .map((td) => td.querySelector('b font[color="DARKBLUE"]'))
      .find(Boolean);
    if (subjHeader) {
      const text = (subjHeader.textContent || '').trim();
      const m = text.match(subjectPattern);
      if (m) currentSubject = m[1];
      continue;
    }

    const courseHeader = headers.find((td) => (td.textContent || '').includes(' - '));
    if (courseHeader) {
      const text = (courseHeader.textContent || '').trim();
      const m = text.match(coursePattern);
      if (m) {
        currentSubject = m[1];
        currentCourse = m[2];
        currentTitle = m[3].trim();
      }
      continue;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length < 10) continue;

    const firstCell = cells[0];
    const isContinuation = firstCell && firstCell.getAttribute('colspan') === '3' && !row.querySelector('a[href*="p_course_popup"]');

    let crn;
    let instructor;
    let dayStartIndex = 3;
    let timeIndex = 10;
    let locationIndex = 12;
    let campusIndex = 13;

    if (isContinuation) {
      if (!lastCRN) continue;
      crn = lastCRN;
      instructor = lastInstructor;
      dayStartIndex = 1;
      timeIndex = 8;
      locationIndex = 10;
      campusIndex = 11;
    } else {
      const crnLink = row.querySelector('a[href*="p_course_popup"]');
      if (!crnLink) continue;
      crn = (crnLink.textContent || '').trim();
      instructor = (cells[20]?.textContent || '').trim();
      lastCRN = crn;
      lastInstructor = instructor;
    }

    let days = '';
    const dayEnd = Math.min(dayStartIndex + 5, cells.length);
    for (let i = dayStartIndex; i < dayEnd; i++) {
      const txt = (cells[i]?.textContent || '').trim();
      if (txt && dayPattern.test(txt)) days += txt;
    }

    const timeText = (cells[timeIndex]?.textContent || '').trim();
    const tm = timeText.match(timePattern);
    if (!tm) continue;

    const startMin = timeToMinutes(tm[1]);
    const endMin = timeToMinutes(tm[2]);
    if (startMin == null || endMin == null) continue;

    const location = (cells[locationIndex]?.textContent || '').trim();
    const campus = (cells[campusIndex]?.textContent || '').trim();
    const units = isContinuation ? 0 : parseFloat((cells[2]?.textContent || '').trim() || '0');

    let capacity = 0;
    let actual = 0;
    let remaining = 0;
    let waitCap = 0;
    let waitAct = 0;
    let waitRem = 0;
    if (!isContinuation) {
      const baseIndex = 14;
      capacity = parseInt((cells[baseIndex]?.textContent || '').trim() || '0', 10);
      actual = parseInt((cells[baseIndex + 1]?.textContent || '').trim() || '0', 10);
      remaining = parseInt((cells[baseIndex + 2]?.textContent || '').trim() || '0', 10);
      waitCap = parseInt((cells[baseIndex + 3]?.textContent || '').trim() || '0', 10);
      waitAct = parseInt((cells[baseIndex + 4]?.textContent || '').trim() || '0', 10);
      waitRem = parseInt((cells[baseIndex + 5]?.textContent || '').trim() || '0', 10);
    }

    const courseEntry = compactCourse({
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
      Capacity: Number.isFinite(capacity) ? capacity : 0,
      Actual: Number.isFinite(actual) ? actual : 0,
      Remaining: Number.isFinite(remaining) ? remaining : 0,
      WaitCap: Number.isFinite(waitCap) ? waitCap : 0,
      WaitAct: Number.isFinite(waitAct) ? waitAct : 0,
      WaitRem: Number.isFinite(waitRem) ? waitRem : 0,
      isLabSection: isContinuation,
    });

    if (!days || days.length === 0 || location.toLowerCase().includes('online')) {
      online.push(courseEntry);
    } else {
      courses.push(courseEntry);
    }
  }

  return { courses, online };
}

module.exports = { parseScheduleTable, timeToMinutes };
