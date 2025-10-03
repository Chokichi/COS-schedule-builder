import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AppState, FilterState, SubjectData } from './types';
import FilterPanel from './components/FilterPanel';
import ScheduleGrid from './components/ScheduleGrid';
import OnlineCoursesList from './components/OnlineCoursesList';
import ImportModal from './components/ImportModal';
import { parseHtmlTable } from './utils/parser';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#059669',
    },
    background: {
      default: '#ffffff',
      paper: '#f6f8fa',
    },
    text: {
      primary: '#0b0f14',
      secondary: '#4b5563',
    },
  },
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#f0f4f8',
          border: '1px solid #d1d5db',
          color: '#0b0f14',
          borderRadius: '999px',
          fontSize: '12px',
          padding: '6px 8px',
          '&:hover': {
            backgroundColor: '#e5e7eb',
          },
          '&.MuiChip-clickable:active': {
            backgroundColor: '#e5e7eb',
          },
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8ab4f8',
    },
    secondary: {
      main: '#80eec0',
    },
    background: {
      default: '#0b0f14',
      paper: '#121821',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#9fb3c8',
    },
  },
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#0f1824',
          border: '1px solid #233146',
          color: '#e6edf3',
          borderRadius: '999px',
          fontSize: '12px',
          padding: '6px 8px',
          '&:hover': {
            backgroundColor: '#1a2532',
          },
          '&.MuiChip-clickable:active': {
            backgroundColor: '#1a2532',
          },
        },
      },
    },
  },
});

const initialFilterState: FilterState = {
  subjectAllow: new Set(),
  courseAllow: new Set(),
  instructorAllow: new Set(),
  campusAllow: new Set(),
  showOnline: false,
  showFullClasses: false,
  showFullWaitlist: false,
};

const initialAppState: AppState = {
  allCourses: [],
  onlineCourses: [],
  mySchedule: [],
  myOnlineClasses: [],
  subjects: new Set(),
  courses: new Set(),
  instructors: new Set(),
  campuses: new Set(),
  subjectData: new Map(),
  filters: initialFilterState,
  isLoading: false,
  error: null,
  importProgress: 0,
  importProgressText: '',
};

function App() {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isLightMode, setIsLightMode] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [courseOpacity, setCourseOpacity] = useState(0.6);
  const [showOpacityMenu, setShowOpacityMenu] = useState(false);

  // Calculate shared time range for both schedules based on filtered courses
  const sharedTimeRange = useMemo(() => {
    // Check if any filter chips are selected (not including showFullClasses/showFullWaitlist)
    const hasFilterChips = appState.filters.subjectAllow.size > 0 || 
                          appState.filters.courseAllow.size > 0 || 
                          appState.filters.instructorAllow.size > 0 || 
                          appState.filters.campusAllow.size > 0;
    
    let coursesToConsider;
    
    if (hasFilterChips) {
      // Filter chips are selected - filter available courses based on current filters
      const filteredAvailableCourses = appState.allCourses.filter(course => {
        const subjOk = appState.filters.subjectAllow.size === 0 || appState.filters.subjectAllow.has(course.Subject);
        const courseOk = appState.filters.courseAllow.size === 0 || appState.filters.courseAllow.has(course.Course);
        const instrOk = appState.filters.instructorAllow.size === 0 || appState.filters.instructorAllow.has(course.Instructor);
        const campusOk = appState.filters.campusAllow.size === 0 || appState.filters.campusAllow.has(course.Campus);
        
        const isFull = course.Remaining <= 0 && course.Capacity > 0;
        const fullOk = appState.filters.showFullClasses || !isFull;
        const isWaitlistFull = course.WaitRem <= 0 && course.WaitCap > 0;
        const waitlistOk = appState.filters.showFullWaitlist || !isWaitlistFull;
        
        return subjOk && courseOk && instrOk && campusOk && fullOk && waitlistOk;
      });
      
      // Combine filtered available courses with student schedule
      coursesToConsider = [...filteredAvailableCourses, ...appState.mySchedule];
    } else {
      // No filter chips selected - use student's selected courses only
      coursesToConsider = appState.mySchedule;
    }
    
    if (coursesToConsider.length === 0) {
      return { startMin: 8 * 60, endMin: 18 * 60 }; // Default 8 AM to 6 PM
    }
    
    const allStartMins = coursesToConsider.map(course => course.StartMin);
    const allEndMins = coursesToConsider.map(course => course.EndMin);
    
    const earliestStart = Math.min(...allStartMins);
    const latestEnd = Math.max(...allEndMins);
    
    if (hasFilterChips) {
      // When filter chips are active, round to nearest hour and ensure minimum range
      const startMin = Math.floor(earliestStart / 60) * 60;
      const endMin = Math.ceil(latestEnd / 60) * 60;
      
      // Ensure minimum range of 8 AM to 6 PM
      const minStart = 8 * 60; // 8 AM
      const minEnd = 18 * 60; // 6 PM
      
      return {
        startMin: Math.min(startMin, minStart),
        endMin: Math.max(endMin, minEnd)
      };
    } else {
      // No filter chips selected - use student's courses with 1 hour buffer
      const startMin = Math.max(0, earliestStart - 60); // 1 hour before first class
      const endMin = latestEnd + 60; // 1 hour after last class
      
      // Round to nearest hour for cleaner display
      const roundedStartMin = Math.floor(startMin / 60) * 60;
      const roundedEndMin = Math.ceil(endMin / 60) * 60;
      
      return {
        startMin: roundedStartMin,
        endMin: roundedEndMin
      };
    }
  }, [appState.allCourses, appState.mySchedule, appState.filters]);

  // Local storage functions
  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        allCourses: appState.allCourses,
        onlineCourses: appState.onlineCourses,
        mySchedule: appState.mySchedule,
        myOnlineClasses: appState.myOnlineClasses,
        subjects: Array.from(appState.subjects),
        courses: Array.from(appState.courses),
        instructors: Array.from(appState.instructors),
        campuses: Array.from(appState.campuses),
        subjectData: Array.from(appState.subjectData.entries()).map(([key, value]) => [
          key,
          {
            courses: value.courses,
            courseNumbers: Array.from(value.courseNumbers),
            instructors: Array.from(value.instructors),
            campuses: Array.from(value.campuses),
          }
        ]),
        filters: {
          subjectAllow: Array.from(appState.filters.subjectAllow),
          courseAllow: Array.from(appState.filters.courseAllow),
          instructorAllow: Array.from(appState.filters.instructorAllow),
          campusAllow: Array.from(appState.filters.campusAllow),
          showOnline: appState.filters.showOnline,
          showFullClasses: appState.filters.showFullClasses,
          showFullWaitlist: appState.filters.showFullWaitlist,
        },
        isLightMode,
        timestamp: Date.now(),
      };
      localStorage.setItem('ssb_data', JSON.stringify(dataToSave));
      console.log('💾 Data saved to local storage');
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }, [appState, isLightMode]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('ssb_data');
      console.log('🔍 Raw saved data exists:', !!saved);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('🔍 Parsed data keys:', Object.keys(data));
        console.log('🔍 Data timestamp:', data.timestamp);
        console.log('🔍 All courses length:', data.allCourses?.length);
        
        // Check if data is recent (within 7 days)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < (7 * 24 * 60 * 60 * 1000);
        console.log('🔍 Data is recent:', isRecent);
        
        if (isRecent && data.allCourses && data.allCourses.length > 0) {
          return {
            allCourses: data.allCourses,
            onlineCourses: data.onlineCourses || [],
            mySchedule: data.mySchedule || [],
            myOnlineClasses: data.myOnlineClasses || [],
            subjects: new Set<string>(data.subjects || []),
            courses: new Set<string>(data.courses || []),
            instructors: new Set<string>(data.instructors || []),
            campuses: new Set<string>(data.campuses || []),
            subjectData: new Map(
              (data.subjectData || []).map(([key, value]: [string, any]) => [
                key,
                {
                  courses: value.courses || [],
                  courseNumbers: new Set(Array.isArray(value.courseNumbers) ? value.courseNumbers : []),
                  instructors: new Set(Array.isArray(value.instructors) ? value.instructors : []),
                  campuses: new Set(Array.isArray(value.campuses) ? value.campuses : []),
                }
              ])
            ),
            filters: {
              subjectAllow: new Set<string>(data.filters?.subjectAllow || []),
              courseAllow: new Set<string>(data.filters?.courseAllow || []),
              instructorAllow: new Set<string>(data.filters?.instructorAllow || []),
              campusAllow: new Set<string>(data.filters?.campusAllow || []),
              showOnline: data.filters?.showOnline || false,
              showFullClasses: data.filters?.showFullClasses || false,
              showFullWaitlist: data.filters?.showFullWaitlist || false,
            },
            isLightMode: data.isLightMode || false,
          };
        }
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
    }
    return null;
  }, []);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem('ssb_data');
      console.log('🗑️ Local storage cleared');
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    }
  }, []);

  // Auto-save effect
  React.useEffect(() => {
    if (appState.allCourses.length > 0) {
      const timeoutId = setTimeout(saveToLocalStorage, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [appState, saveToLocalStorage]);

  // Load data on mount
  React.useEffect(() => {
    console.log('🔍 Checking for saved data on mount...');
    const savedData = loadFromLocalStorage();
    console.log('🔍 Saved data found:', !!savedData);
    if (savedData) {
      console.log('🔍 Setting restore prompt to true');
      setShowRestorePrompt(true);
    }
  }, [loadFromLocalStorage]);

  const handleRestoreData = useCallback(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      // Debug: Verify data structure matches parser output
      console.log('🔍 Verifying restored data structure...');
      if (savedData.subjectData.size > 0) {
        const firstSubject = Array.from(savedData.subjectData.keys())[0];
        const firstSubjectData = savedData.subjectData.get(firstSubject) as SubjectData;
        console.log(`🔍 First subject (${firstSubject}) structure:`, {
          courses: Array.isArray(firstSubjectData?.courses) ? `Array[${firstSubjectData.courses.length}]` : typeof firstSubjectData?.courses,
          courseNumbers: firstSubjectData?.courseNumbers instanceof Set ? `Set[${firstSubjectData.courseNumbers.size}]` : typeof firstSubjectData?.courseNumbers,
          instructors: firstSubjectData?.instructors instanceof Set ? `Set[${firstSubjectData.instructors.size}]` : typeof firstSubjectData?.instructors,
          campuses: firstSubjectData?.campuses instanceof Set ? `Set[${firstSubjectData.campuses.size}]` : typeof firstSubjectData?.campuses,
        });
        
        // Verify courseNumbers Set contains strings
        if (firstSubjectData?.courseNumbers instanceof Set) {
          const firstCourseNumber = Array.from(firstSubjectData.courseNumbers)[0];
          console.log(`🔍 First courseNumber type:`, typeof firstCourseNumber, firstCourseNumber);
        }
      }
      
      setAppState(prev => ({
        ...prev,
        allCourses: savedData.allCourses,
        onlineCourses: savedData.onlineCourses,
        mySchedule: savedData.mySchedule,
        myOnlineClasses: savedData.myOnlineClasses,
        subjects: savedData.subjects,
        courses: savedData.courses,
        instructors: savedData.instructors,
        campuses: savedData.campuses,
        subjectData: savedData.subjectData as Map<string, SubjectData>,
        filters: savedData.filters,
      }));
      setIsLightMode(savedData.isLightMode);
      setShowRestorePrompt(false);
      console.log('🔄 Data restored from local storage');
    }
  }, [loadFromLocalStorage]);

  const handleDiscardData = useCallback(() => {
    clearLocalStorage();
    setShowRestorePrompt(false);
    console.log('❌ Saved data discarded');
  }, [clearLocalStorage]);

  const handleParseHtml = useCallback(async (html: string) => {
    const startTime = Date.now();
    console.log('🚀 Import started at:', new Date().toLocaleTimeString());
    
    setAppState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      importProgress: 0, 
      importProgressText: 'Starting import...' 
    }));
    
    try {
      // Step 1: Parse HTML table
      const step1Start = Date.now();
      setAppState(prev => ({ 
        ...prev, 
        importProgress: 20, 
        importProgressText: 'Parsing schedule table...' 
      }));
      
      const parsed = parseHtmlTable(html);
      const step1Time = Date.now() - step1Start;
      console.log(`📊 Parsing completed in ${step1Time}ms`);
      
      // Step 2: Build hierarchical data structure
      const step2Start = Date.now();
      setAppState(prev => ({ 
        ...prev, 
        importProgress: 40, 
        importProgressText: 'Building subject data structure...' 
      }));
      
      const subjectData = new Map<string, SubjectData>();
      const allForFilters = [...parsed.courses, ...parsed.online];
      
      // Group courses by subject with progress updates
      let processedCourses = 0;
      const totalCourses = allForFilters.length;
      
      for (const course of allForFilters) {
        if (!subjectData.has(course.Subject)) {
          subjectData.set(course.Subject, {
            courses: [],
            courseNumbers: new Set(),
            instructors: new Set(),
            campuses: new Set(),
          });
        }
        
        const subjectInfo = subjectData.get(course.Subject)!;
        subjectInfo.courses.push(course);
        subjectInfo.courseNumbers.add(course.Course);
        if (course.Instructor) subjectInfo.instructors.add(course.Instructor);
        if (course.Campus) subjectInfo.campuses.add(course.Campus);
        
        processedCourses++;
        
        // Update progress every 200 courses (less frequent updates)
        if (processedCourses % 200 === 0) {
          const progress = 40 + Math.floor((processedCourses / totalCourses) * 30);
          setAppState(prev => ({ 
            ...prev, 
            importProgress: progress,
            importProgressText: `Processing courses... ${processedCourses}/${totalCourses}`
          }));
        }
      }
      
      const step2Time = Date.now() - step2Start;
      console.log(`🏗️ Data structure built in ${step2Time}ms`);
      
      // Step 3: Build global filter sets
      const step3Start = Date.now();
      setAppState(prev => ({ 
        ...prev, 
        importProgress: 70, 
        importProgressText: 'Building filter options...' 
      }));
      
      const subjects = new Set(allForFilters.map(c => c.Subject));
      const courses = new Set(allForFilters.map(c => c.Course));
      const instructors = new Set(allForFilters.map(c => c.Instructor).filter(Boolean));
      const campuses = new Set(allForFilters.map(c => c.Campus).filter(Boolean));
      
      const step3Time = Date.now() - step3Start;
      console.log(`🔍 Filter sets built in ${step3Time}ms`);
      
      // Step 4: Finalize
      const step4Start = Date.now();
      setAppState(prev => ({ 
        ...prev, 
        importProgress: 90, 
        importProgressText: 'Finalizing data...' 
      }));
      
      // Debug: Verify parser data structure
      console.log('🔍 Verifying parser data structure...');
      if (subjectData.size > 0) {
        const firstSubject = Array.from(subjectData.keys())[0];
        const firstSubjectData = subjectData.get(firstSubject) as SubjectData;
        console.log(`🔍 Parser first subject (${firstSubject}) structure:`, {
          courses: Array.isArray(firstSubjectData?.courses) ? `Array[${firstSubjectData.courses.length}]` : typeof firstSubjectData?.courses,
          courseNumbers: firstSubjectData?.courseNumbers instanceof Set ? `Set[${firstSubjectData.courseNumbers.size}]` : typeof firstSubjectData?.courseNumbers,
          instructors: firstSubjectData?.instructors instanceof Set ? `Set[${firstSubjectData.instructors.size}]` : typeof firstSubjectData?.instructors,
          campuses: firstSubjectData?.campuses instanceof Set ? `Set[${firstSubjectData.campuses.size}]` : typeof firstSubjectData?.campuses,
        });
        
        // Verify courseNumbers Set contains strings
        if (firstSubjectData?.courseNumbers instanceof Set) {
          const firstCourseNumber = Array.from(firstSubjectData.courseNumbers)[0];
          console.log(`🔍 Parser first courseNumber type:`, typeof firstCourseNumber, firstCourseNumber);
        }
      }
      
      setAppState(prev => ({
        ...prev,
        allCourses: parsed.courses,
        onlineCourses: parsed.online,
        mySchedule: [],
        myOnlineClasses: [],
        subjects,
        courses,
        instructors,
        campuses,
        subjectData,
        isLoading: false,
        importProgress: 100,
        importProgressText: 'Import complete!',
      }));
      
      const step4Time = Date.now() - step4Start;
      const totalTime = Date.now() - startTime;
      console.log(`✅ Finalization completed in ${step4Time}ms`);
      console.log(`🎉 Total import time: ${totalTime}ms`);
      console.log(`📈 Performance breakdown:`);
      console.log(`   - Parsing: ${step1Time}ms (${Math.round(step1Time/totalTime*100)}%)`);
      console.log(`   - Data structure: ${step2Time}ms (${Math.round(step2Time/totalTime*100)}%)`);
      console.log(`   - Filter sets: ${step3Time}ms (${Math.round(step3Time/totalTime*100)}%)`);
      console.log(`   - Finalization: ${step4Time}ms (${Math.round(step4Time/totalTime*100)}%)`);
      
      // Clear progress after a short delay
      setTimeout(() => {
        setAppState(prev => ({ 
          ...prev, 
          importProgress: 0, 
          importProgressText: '' 
        }));
      }, 1000);
      
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`❌ Import failed after ${errorTime}ms:`, error);
      
      setAppState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to parse HTML',
        isLoading: false,
        importProgress: 0,
        importProgressText: '',
      }));
    }
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setAppState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  const handleAddCourse = useCallback((crn: string) => {
    setAppState(prev => {
      const course = prev.allCourses.find(c => c.CRN === crn);
      if (!course || prev.mySchedule.find(c => c.CRN === crn)) {
        return prev;
      }
      
      // Check for time conflicts
      const coursesWithSameCRN = prev.allCourses.filter(c => c.CRN === crn);
      for (const crs of coursesWithSameCRN) {
        for (const existing of prev.mySchedule) {
          const daysOverlap = Array.from(crs.Days).some(d => existing.Days.includes(d));
          if (daysOverlap) {
            const newStart = crs.StartMin, newEnd = crs.EndMin;
            const existStart = existing.StartMin, existEnd = existing.EndMin;
            if (newStart < existEnd && newEnd > existStart) {
              // eslint-disable-next-line no-restricted-globals
              if (!confirm(`Time conflict with ${existing.Subject} ${existing.Course}. Add anyway?`)) {
                return prev;
              }
            }
          }
        }
      }
      
      // Add all courses with the same CRN
      const newSchedule = [...prev.mySchedule];
      coursesWithSameCRN.forEach(crs => {
        const alreadyExists = newSchedule.find(c => 
          c.CRN === crs.CRN && 
          c.Days === crs.Days && 
          c.DispTime === crs.DispTime
        );
        
        if (!alreadyExists) {
          newSchedule.push(crs);
        }
      });
      
      return { ...prev, mySchedule: newSchedule };
    });
  }, []);

  const handleRemoveCourse = useCallback((crn: string) => {
    setAppState(prev => ({
      ...prev,
      mySchedule: prev.mySchedule.filter(c => c.CRN !== crn),
    }));
  }, []);

  const handleAddOnlineCourse = useCallback((crn: string) => {
    setAppState(prev => {
      const course = prev.onlineCourses.find(c => c.CRN === crn);
      if (!course || prev.myOnlineClasses.find(c => c.CRN === crn)) {
        return prev;
      }
      return {
        ...prev,
        myOnlineClasses: [...prev.myOnlineClasses, course]
      };
    });
  }, []);

  const handleRemoveOnlineCourse = useCallback((crn: string) => {
    setAppState(prev => ({
      ...prev,
      myOnlineClasses: prev.myOnlineClasses.filter(course => course.CRN !== crn)
    }));
  }, []);

  const handlePrintSchedule = useCallback(() => {
    if (appState.mySchedule.length === 0 && appState.myOnlineClasses.length === 0) {
      alert('No courses in your schedule to print');
      return;
    }

    // Calculate total units
    const calculateTotalUnits = () => {
      let totalUnits = 0;
      appState.mySchedule.forEach(course => {
        if (course.Units > 0) totalUnits += course.Units;
      });
      appState.myOnlineClasses.forEach(course => {
        if (course.Units > 0) totalUnits += course.Units;
      });
      return totalUnits;
    };

    const totalUnits = calculateTotalUnits();

    // Calculate dynamic time range based on my schedule
    const calculateTimeRange = () => {
      if (appState.mySchedule.length === 0) {
        return { startHour: 8, endHour: 22 }; // Default fallback
      }
      
      const allStartMins = appState.mySchedule.map(course => course.StartMin);
      const allEndMins = appState.mySchedule.map(course => course.EndMin);
      
      const earliestStart = Math.min(...allStartMins);
      const latestEnd = Math.max(...allEndMins);
      
      // Convert to hours and add buffer
      const startHour = Math.floor(earliestStart / 60) - 1; // 1 hour before first class
      const endHour = Math.ceil(latestEnd / 60) + 1; // 1 hour after last class
      
      // Ensure reasonable bounds
      return {
        startHour: Math.max(6, startHour), // No earlier than 6 AM
        endHour: Math.min(23, endHour)     // No later than 11 PM
      };
    };

    const timeRange = calculateTimeRange();
    const totalHours = timeRange.endHour - timeRange.startHour;

    // Group courses by CRN to avoid duplicates
    const uniqueCourses = [];
    const seenCRNs = new Set();

    appState.mySchedule.forEach(course => {
      if (!seenCRNs.has(course.CRN)) {
        seenCRNs.add(course.CRN);
        uniqueCourses.push(course);
      }
    });

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>My Schedule - ${totalUnits} Units</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #000; background: #fff; }
          .header { text-align: center; margin-bottom: 30px; }
          .total-units { font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0; }
          .schedule-grid { display: grid; grid-template-columns: 60px repeat(5, 1fr); gap: 1px; border: 1px solid #ccc; page-break-inside: avoid; }
          .time-header, .day-header { background: #f0f4f8; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #ccc; }
          .time-col { background: #f8fafc; }
          .day-col { background: #fff; position: relative; min-height: 400px; }
          .slot { position: absolute; left: 2px; right: 2px; padding: 4px; border-radius: 4px; font-size: 10px; border: 1px solid #000; }
          .slot strong { display: block; font-size: 11px; }
          .slot small { display: block; font-size: 9px; }
          .course-table { margin-top: 30px; page-break-before: always; }
          .course-table table { width: 100%; border-collapse: collapse; }
          .course-table th, .course-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .course-table th { background: #f0f4f8; font-weight: bold; }
          .tick { font-size: 10px; padding: 2px; border-bottom: 1px dashed #ccc; height: 40px; }
          
          @media print {
            .course-table { 
              page-break-before: always;
              page-orientation: landscape;
            }
            .course-table table {
              font-size: 12px;
            }
            .course-table th, .course-table td {
              padding: 6px 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>My Course Schedule</h1>
          <div class="total-units">Total Units: ${totalUnits}</div>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="schedule-grid">
          <div class="time-header">Time</div>
          <div class="day-header">Mon</div>
          <div class="day-header">Tue</div>
          <div class="day-header">Wed</div>
          <div class="day-header">Thu</div>
          <div class="day-header">Fri</div>
          
          <div class="time-col">
            ${Array.from({length: totalHours}, (_, i) => {
              const hour = timeRange.startHour + i;
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const h12 = ((hour + 11) % 12) + 1;
              return `<div class="tick">${h12}:00 ${ampm}</div>`;
            }).join('')}
          </div>
          
          ${['M','T','W','R','F'].map(day => {
            const dayCourses = appState.mySchedule.filter(c => c.Days.includes(day));
            return `
              <div class="day-col">
                ${dayCourses.map(course => {
                  const startHour = timeRange.startHour;
                  const top = ((course.StartMin - (startHour * 60)) / 60) * 40;
                  const height = ((course.EndMin - course.StartMin) / 60) * 40;
                  return `
                    <div class="slot" style="top: ${top}px; height: ${height}px; background: ${course.__bg}; border-color: ${course.__color};">
                      <strong>${course.Subject} ${course.Course}</strong>
                      <small>${course.DispTime}</small>
                      <small>${course.Location}</small>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="course-table">
          <h2>Course Details</h2>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Course</th>
                <th>Title</th>
                <th>CRN</th>
                <th>Units</th>
                <th>Instructor</th>
                <th>Days</th>
                <th>Time</th>
                <th>Location</th>
                <th>Campus</th>
              </tr>
            </thead>
            <tbody>
              ${uniqueCourses.map(course => `
                <tr>
                  <td>${course.Subject}</td>
                  <td>${course.Course}</td>
                  <td>${course.Title}</td>
                  <td>${course.CRN}</td>
                  <td>${course.Units}</td>
                  <td>${course.Instructor || 'TBA'}</td>
                  <td>${course.Days}</td>
                  <td>${course.DispTime}</td>
                  <td>${course.Location}</td>
                  <td>${course.Campus}</td>
                </tr>
              `).join('')}
              ${appState.myOnlineClasses.map(course => `
                <tr>
                  <td>${course.Subject}</td>
                  <td>${course.Course}</td>
                  <td>${course.Title}</td>
                  <td>${course.CRN}</td>
                  <td>${course.Units}</td>
                  <td>${course.Instructor || 'TBA'}</td>
                  <td>Online</td>
                  <td>Online</td>
                  <td>Online</td>
                  <td>${course.Campus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  }, [appState.mySchedule, appState.myOnlineClasses]);


  const currentTheme = isLightMode ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(180deg, #0b0f14 0%, #0d1219 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        color: 'text.primary'
      }}>
        {/* Header */}
        <Box sx={{
          padding: '16px 20px',
          borderBottom: (theme) => theme.palette.mode === 'dark' 
            ? '1px solid #1e293b' 
            : '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(10,14,20,0.9)' 
            : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(6px)'
        }}>
          <Typography variant="h6" sx={{ fontSize: '18px', margin: '0 0 6px 0' }}>
            📚 Student Schedule Builder
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '13px', color: 'text.secondary' }}>
            Paste the schedule HTML table to view and build your personalized course schedule.
          </Typography>
        </Box>
        
        {/* Main Grid Layout */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          gap: '16px',
          padding: '16px',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {/* Left Panel */}
          <Box sx={{
            background: 'background.paper',
            border: (theme) => theme.palette.mode === 'dark' 
              ? '1px solid #1f2937' 
              : '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            height: 'fit-content'
          }}>
            {/* Import Button */}
            <Box sx={{ marginBottom: '16px' }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setImportModalOpen(true)}
                disabled={appState.isLoading}
                sx={{
                  background: 'linear-gradient(90deg, #2563eb, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  padding: '12px 16px',
                  textTransform: 'none',
                  fontWeight: '600',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #1d4ed8, #047857)',
                  },
                  '&:disabled': {
                    background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#e5e7eb',
                    color: 'text.disabled',
                  }
                }}
              >
                📚 Import Schedule Data
              </Button>
            </Box>

            <FilterPanel
              filters={appState.filters}
              subjects={appState.subjects}
              courses={appState.courses}
              instructors={appState.instructors}
              campuses={appState.campuses}
              allCourses={appState.allCourses}
              subjectData={appState.subjectData}
              onFilterChange={handleFilterChange}
              isLightMode={isLightMode}
              onToggleLightMode={() => setIsLightMode(!isLightMode)}
            />
          </Box>
          
          {/* Right Grid */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(300px, 1fr))' },
            gap: '16px'
          }}>
            {/* Available Courses Board */}
            <Box sx={{
              background: (theme) => theme.palette.mode === 'dark' ? '#1a2330' : '#ffffff',
              border: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid #203045' 
                : '1px solid #d1d5db',
              borderRadius: '16px',
              padding: '10px',
              minHeight: '680px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              position: 'relative'
            }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '4px 8px 8px 8px'
              }}>
                <Typography variant="h6" sx={{
                  fontSize: '15px',
                  color: 'text.secondary'
                }}>
                  🗓️ Available Courses
                </Typography>
                
                {/* Opacity Control Menu */}
                <Box sx={{ position: 'relative' }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setShowOpacityMenu(!showOpacityMenu)}
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      minWidth: 'auto',
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                      },
                    }}
                  >
                    Opacity: {Math.round(courseOpacity * 100)}%
                  </Button>
                  
                  {showOpacityMenu && (
                    <Box sx={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      mt: 1,
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      minWidth: '200px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      zIndex: 10,
                    }}>
                      <Typography variant="body2" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                        Course Slot Opacity
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ color: 'white', display: 'block', mb: 1 }}>
                          Adjust opacity to see stacked courses clearly
                        </Typography>
                        <input
                          type="range"
                          min="0.3"
                          max="1.0"
                          step="0.1"
                          value={courseOpacity}
                          onChange={(e) => setCourseOpacity(parseFloat(e.target.value))}
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(255,255,255,0.2)',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>
                            30%
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>
                            100%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setCourseOpacity(0.3)}
                          sx={{
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                            fontSize: '10px',
                            padding: '2px 8px',
                            '&:hover': {
                              borderColor: 'rgba(255,255,255,0.5)',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                          }}
                        >
                          Low
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setCourseOpacity(0.6)}
                          sx={{
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                            fontSize: '10px',
                            padding: '2px 8px',
                            '&:hover': {
                              borderColor: 'rgba(255,255,255,0.5)',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                          }}
                        >
                          Medium
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setCourseOpacity(1.0)}
                          sx={{
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                            fontSize: '10px',
                            padding: '2px 8px',
                            '&:hover': {
                              borderColor: 'rgba(255,255,255,0.5)',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                            },
                          }}
                        >
                          High
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
              <ScheduleGrid
                courses={appState.allCourses}
                mySchedule={appState.mySchedule}
                filters={appState.filters}
                onAddCourse={handleAddCourse}
                onRemoveCourse={handleRemoveCourse}
                courseOpacity={courseOpacity}
                sharedTimeRange={sharedTimeRange}
              />
              
              {/* Online Courses Section */}
              {appState.filters.showOnline && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🌐 Online Courses
                  </Typography>
                  <OnlineCoursesList
                    courses={appState.onlineCourses}
                    myOnlineClasses={appState.myOnlineClasses}
                    filters={appState.filters}
                    onAddOnlineCourse={handleAddOnlineCourse}
                    onRemoveOnlineCourse={handleRemoveOnlineCourse}
                  />
                </Box>
              )}
            </Box>
            
            {/* My Schedule Board */}
            <Box sx={{
              background: (theme) => theme.palette.mode === 'dark' ? '#1a2330' : '#ffffff',
              border: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid #203045' 
                : '1px solid #d1d5db',
              borderRadius: '16px',
              padding: '10px',
              minHeight: '680px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <Typography variant="h6" sx={{
                  margin: '4px 8px 8px 8px',
                  fontSize: '15px',
                  color: 'text.secondary'
                }}>
                  ✅ My Schedule
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handlePrintSchedule}
                  sx={{
                    background: 'primary.main',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    textTransform: 'none'
                  }}
                >
                  🖨️ Print Schedule
                </Button>
              </Box>
              <ScheduleGrid
                courses={appState.mySchedule}
                mySchedule={appState.mySchedule}
                filters={appState.filters}
                onAddCourse={handleAddCourse}
                onRemoveCourse={handleRemoveCourse}
                isMySchedule={true}
                sharedTimeRange={sharedTimeRange}
              />
            </Box>
            
            {/* My Online Classes Board */}
            <Box sx={{
              background: (theme) => theme.palette.mode === 'dark' ? '#1a2330' : '#ffffff',
              border: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid #203045' 
                : '1px solid #d1d5db',
              borderRadius: '16px',
              padding: '10px',
              minHeight: '200px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <Typography variant="h6" sx={{
                  margin: '4px 8px 8px 8px',
                  fontSize: '15px',
                  color: 'text.secondary'
                }}>
                  💻 My Online Classes
                </Typography>
              </Box>
              <OnlineCoursesList
                courses={appState.myOnlineClasses}
                myOnlineClasses={appState.myOnlineClasses}
                filters={appState.filters}
                onAddOnlineCourse={handleAddOnlineCourse}
                onRemoveOnlineCourse={handleRemoveOnlineCourse}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Import Modal */}
        <ImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onParseHtml={handleParseHtml}
          onCompleteImport={() => setImportModalOpen(false)}
          isLoading={appState.isLoading}
          error={appState.error}
          progress={appState.importProgress}
          progressText={appState.importProgressText}
          subjects={appState.subjects}
          selectedSubjects={appState.filters.subjectAllow}
          onSubjectToggle={(subject) => handleFilterChange({ subjectAllow: new Set([...appState.filters.subjectAllow].includes(subject) ? [...appState.filters.subjectAllow].filter(s => s !== subject) : [...appState.filters.subjectAllow, subject]) })}
          parsedData={appState.allCourses}
        />

      {/* Restore Data Prompt */}
      <Dialog
        open={showRestorePrompt}
        onClose={() => {}} // Prevent closing by clicking outside
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #1a2330 0%, #0f1622 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: (theme) => theme.palette.mode === 'dark'
              ? '1px solid #2a3c55'
              : '1px solid #d1d5db',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          },
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'text.primary',
          padding: '24px 24px 16px 24px'
        }}>
          🔄 Restore Saved Schedule?
        </DialogTitle>
        
        <DialogContent sx={{ padding: '0 24px 24px 24px' }}>
          <Typography variant="body1" sx={{ 
            textAlign: 'center',
            color: 'text.secondary',
            lineHeight: 1.6,
            mb: 3
          }}>
            We found a saved schedule from your previous session. Would you like to restore it?
          </Typography>
          
          <Box sx={{ 
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(138, 180, 248, 0.1)' 
              : 'rgba(37, 99, 235, 0.05)',
            border: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(138, 180, 248, 0.2)'
              : '1px solid rgba(37, 99, 235, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            mb: 3
          }}>
            <Typography variant="body2" sx={{ 
              color: 'text.secondary',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              This includes your imported courses, selected schedule, filter preferences, and theme settings.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          padding: '0 24px 24px 24px',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <Button
            variant="outlined"
            onClick={handleDiscardData}
            sx={{
              borderColor: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#d1d5db',
              color: 'text.secondary',
              textTransform: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              '&:hover': {
                borderColor: (theme) => theme.palette.mode === 'dark' ? '#3a4a5c' : '#9ca3af',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#f3f4f6',
              }
            }}
          >
            Start Fresh
          </Button>
          <Button
            variant="contained"
            onClick={handleRestoreData}
            sx={{
              background: 'linear-gradient(135deg, #2563eb, #059669)',
              color: 'white',
              textTransform: 'none',
              borderRadius: '8px',
              padding: '8px 24px',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8, #047857)',
              }
            }}
          >
            Restore Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
