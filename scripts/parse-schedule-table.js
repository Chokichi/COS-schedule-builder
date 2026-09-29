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

/**
 * Banner lab/continuation rows often omit the opening <tr>:
 *   </tr><td colspan="3">...</td></tr>
 * linkedom will not invent that row the way a browser does.
 */
function normalizeScheduleHtml(html) {
  return String(html).replace(/<\/tr>\s*(<td\b)/gi, '</tr>\n<tr>$1');
}

function cellColspan(el) {
  const raw = el.getAttribute('colspan') || el.getAttribute('COLSPAN') || '';
  return String(raw).trim();
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

/**
 * Cell text with colspans expanded, so every section row lines up with the
 * standard layout: status, CRN, units, 7 day columns, time, dates, location,
 * campus, 6 seat columns, instructor. Lab rows merge the first three
 * (colspan=3) and asynchronous online rows merge days+time (colspan=8).
 */
function expandedCellText(row) {
  const out = [];
  for (const td of Array.from(row.querySelectorAll('td'))) {
    out.push((td.textContent || '').trim());
    const span = parseInt(cellColspan(td) || '1', 10);
    for (let i = 1; i < span; i++) out.push('');
  }
  return out;
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

    const rawCells = row.querySelectorAll('td');
    if (rawCells.length < 10) continue;
    const cells = expandedCellText(row);

    const firstCell = rawCells[0];
    const isContinuation = firstCell && cellColspan(firstCell) === '3' && !row.querySelector('a[href*="p_course_popup"]');

    let crn;
    let instructor;

    if (isContinuation) {
      if (!lastCRN) continue;
      crn = lastCRN;
      instructor = lastInstructor;
    } else {
      const crnLink = row.querySelector('a[href*="p_course_popup"]');
      if (!crnLink) continue;
      crn = (crnLink.textContent || '').trim();
      instructor = cells[20] || '';
      lastCRN = crn;
      lastInstructor = instructor;
    }

    let days = '';
    for (let i = 3; i < 8; i++) {
      if (cells[i] && dayPattern.test(cells[i])) days += cells[i];
    }

    const location = cells[12] || '';
    const timeText = cells[10] || '';
    const tm = timeText.match(timePattern);
    let startMin = 0;
    let endMin = 0;
    let dispTime = timeText;
    if (tm) {
      startMin = timeToMinutes(tm[1]);
      endMin = timeToMinutes(tm[2]);
      if (startMin == null || endMin == null) continue;
    } else if (isContinuation) {
      continue;
    } else {
      // Asynchronous online / arranged sections have no meeting time.
      days = '';
      dispTime = location.toLowerCase().includes('online') ? 'Online (no set meeting time)' : 'TBA';
    }

    const campus = cells[13] || '';
    const units = isContinuation ? 0 : parseFloat(cells[2] || '0');

    let capacity = 0;
    let actual = 0;
    let remaining = 0;
    let waitCap = 0;
    let waitAct = 0;
    let waitRem = 0;
    if (!isContinuation) {
      capacity = parseInt(cells[14] || '0', 10);
      actual = parseInt(cells[15] || '0', 10);
      remaining = parseInt(cells[16] || '0', 10);
      waitCap = parseInt(cells[17] || '0', 10);
      waitAct = parseInt(cells[18] || '0', 10);
      waitRem = parseInt(cells[19] || '0', 10);
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
      DispTime: dispTime,
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

module.exports = { parseScheduleTable, timeToMinutes, normalizeScheduleHtml };
