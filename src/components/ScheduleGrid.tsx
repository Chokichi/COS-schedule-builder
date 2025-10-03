import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  Paper,
} from '@mui/material';
import { Course, FilterState, DAYS, DAY_LABELS, PX_PER_HOUR, DAY_START_MIN, DAY_END_MIN } from '../types';

interface ScheduleGridProps {
  courses: Course[];
  mySchedule: Course[];
  filters: FilterState;
  onAddCourse: (crn: string) => void;
  onRemoveCourse: (crn: string) => void;
  isMySchedule?: boolean;
  courseOpacity?: number;
  sharedTimeRange?: { startMin: number; endMin: number };
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  courses,
  mySchedule,
  filters,
  onAddCourse,
  onRemoveCourse,
  isMySchedule = false,
  courseOpacity = 0.6,
  sharedTimeRange,
}) => {
  // State for cycling through overlapping courses
  const [overlappingGroups, setOverlappingGroups] = useState<{ [key: string]: { courses: Course[], currentIndex: number } }>({});
  
  const filteredCourses = useMemo(() => {
    // If this is "My Schedule", show all courses without any filtering
    if (isMySchedule) {
      return courses;
    }
    
    // Debug logging
    console.log('Filtering courses with:', {
      showFullClasses: filters.showFullClasses,
      showFullWaitlist: filters.showFullWaitlist,
      totalCourses: courses.length
    });
    
    // For available courses, apply all filters
    // First, find all lecture sections that pass the filter
    const lectureSections = courses.filter(course => {
      if (course.isLabSection) return false; // Skip lab sections for now
      if (mySchedule.find(m => m.CRN === course.CRN)) return false; // Don't show courses already in my schedule
      
      const subjOk = filters.subjectAllow.size === 0 || filters.subjectAllow.has(course.Subject);
      const courseOk = filters.courseAllow.size === 0 || filters.courseAllow.has(course.Course);
      const instrOk = filters.instructorAllow.size === 0 || filters.instructorAllow.has(course.Instructor);
      const campusOk = filters.campusAllow.size === 0 || filters.campusAllow.has(course.Campus);
      
      // Full class filter - skip for lab sections (they don't have enrollment data)
      const isFull = course.Remaining <= 0 && course.Capacity > 0;
      const fullOk = filters.showFullClasses || !isFull;
      
      // Full waitlist filter - skip for lab sections (they don't have enrollment data)
      const isWaitlistFull = course.WaitRem <= 0 && course.WaitCap > 0;
      const waitlistOk = filters.showFullWaitlist || !isWaitlistFull;
      
      return subjOk && courseOk && instrOk && campusOk && fullOk && waitlistOk;
    });
    
    // Get CRNs of lecture sections that passed the filter
    const allowedCRNs = new Set(lectureSections.map(course => course.CRN));
    
    console.log(`First pass: ${lectureSections.length} lecture sections passed the filter`);
    
    // Now filter all courses (including lab sections) based on whether their CRN is allowed
    const filtered = courses.filter(course => {
      // Don't show courses already in my schedule
      if (mySchedule.find(m => m.CRN === course.CRN)) return false;
      
      // If this is a lab section, check if its lecture section passed the filter
      if (course.isLabSection) {
        return allowedCRNs.has(course.CRN);
      }
      
      // For lecture sections, use the original filtering logic
      const subjOk = filters.subjectAllow.size === 0 || filters.subjectAllow.has(course.Subject);
      const courseOk = filters.courseAllow.size === 0 || filters.courseAllow.has(course.Course);
      const instrOk = filters.instructorAllow.size === 0 || filters.instructorAllow.has(course.Instructor);
      
      // Campus filtering: if no campus filters are selected, show all; otherwise check if course campus is in the selected set
      const campusOk = filters.campusAllow.size === 0 || filters.campusAllow.has(course.Campus);
      
      // Full class filter - skip for lab sections (they don't have enrollment data)
      const isFull = course.Remaining <= 0 && course.Capacity > 0;
      const fullOk = filters.showFullClasses || !isFull;
      
      // Full waitlist filter - skip for lab sections (they don't have enrollment data)
      const isWaitlistFull = course.WaitRem <= 0 && course.WaitCap > 0;
      const waitlistOk = filters.showFullWaitlist || !isWaitlistFull;
      
      // Debug logging for full classes
      if (isFull && !filters.showFullClasses) {
        console.log(`Filtering out full class: ${course.Subject} ${course.Course} - Remaining: ${course.Remaining}, Capacity: ${course.Capacity}`);
      }
      
      // Debug logging for full waitlists
      if (isWaitlistFull && !filters.showFullWaitlist) {
        console.log(`Filtering out full waitlist: ${course.Subject} ${course.Course} - WaitRem: ${course.WaitRem}, WaitCap: ${course.WaitCap}`);
      }
      
      return subjOk && courseOk && instrOk && campusOk && fullOk && waitlistOk;
    });
    
    console.log(`Final result: ${filtered.length} courses after filtering`);
    return filtered;
  }, [courses, mySchedule, filters, isMySchedule]);

  // Use shared time range if provided, otherwise calculate from filtered courses
  const timeRange = useMemo(() => {
    if (sharedTimeRange) {
      return sharedTimeRange;
    }
    
    if (filteredCourses.length === 0) {
      return { startMin: DAY_START_MIN, endMin: DAY_END_MIN };
    }
    
    const allStartMins = filteredCourses.map(course => course.StartMin);
    const allEndMins = filteredCourses.map(course => course.EndMin);
    
    const earliestStart = Math.min(...allStartMins);
    const latestEnd = Math.max(...allEndMins);
    
    // Round to nearest hour for cleaner display
    const startMin = Math.floor(earliestStart / 60) * 60;
    const endMin = Math.ceil(latestEnd / 60) * 60;
    
    // Ensure minimum range of 8 AM to 6 PM
    const minStart = 8 * 60; // 8 AM
    const minEnd = 18 * 60; // 6 PM
    
    return {
      startMin: Math.min(startMin, minStart),
      endMin: Math.max(endMin, minEnd)
    };
  }, [sharedTimeRange, filteredCourses]);

  const dayColumns = useMemo(() => {
    const columns: { [key: string]: Course[] } = {};
    DAYS.forEach(day => {
      columns[day] = filteredCourses.filter(course => course.Days.includes(day));
    });
    
    return columns;
  }, [filteredCourses]);

  // Function to detect overlapping courses for a given day
  const getOverlappingGroups = useCallback((dayCourses: Course[]) => {
    const groups: { [key: string]: Course[] } = {};
    
    dayCourses.forEach(course => {
      // Find all courses that overlap with this course
      const overlappingCourses = dayCourses.filter(otherCourse => {
        if (otherCourse.CRN === course.CRN) return false; // Don't include self
        
        // Check if courses overlap in time
        const courseStart = course.StartMin;
        const courseEnd = course.EndMin;
        const otherStart = otherCourse.StartMin;
        const otherEnd = otherCourse.EndMin;
        
        // Two courses overlap if one starts before the other ends and vice versa
        return (courseStart < otherEnd && courseEnd > otherStart);
      });
      
      // If there are overlapping courses, create a group
      if (overlappingCourses.length > 0) {
        const timeKey = `${course.StartMin}-${course.EndMin}`;
        if (!groups[timeKey]) {
          // Include the current course and all overlapping courses
          groups[timeKey] = [course, ...overlappingCourses];
        }
      }
    });
    
    return groups;
  }, []);


  // Function to cycle through overlapping courses
  const cycleOverlappingCourses = useCallback((day: string, timeKey: string, direction: 'next' | 'prev' | 'set', targetIndex?: number) => {
    setOverlappingGroups(prev => {
      const currentGroup = prev[`${day}-${timeKey}`];
      if (!currentGroup) return prev;
      
      if (direction === 'set' && targetIndex !== undefined) {
        // When a course is selected, bring all cards with the same CRN to the top
        const selectedCourse = currentGroup.courses[targetIndex];
        if (selectedCourse) {
          // Find all overlapping groups that contain courses with the same CRN
          const updatedGroups = { ...prev };
          
          Object.keys(updatedGroups).forEach(groupKey => {
            const group = updatedGroups[groupKey];
            const sameCRNIndex = group.courses.findIndex(course => course.CRN === selectedCourse.CRN);
            
            if (sameCRNIndex !== -1) {
              // Move the course with the same CRN to the top (index 0)
              const reorderedCourses = [...group.courses];
              const courseToMove = reorderedCourses.splice(sameCRNIndex, 1)[0];
              reorderedCourses.unshift(courseToMove);
              
              updatedGroups[groupKey] = {
                ...group,
                courses: reorderedCourses,
                currentIndex: 0 // The moved course is now at index 0
              };
            }
          });
          
          return updatedGroups;
        }
      } else {
        // For next/prev directions, just change the current index
        let newIndex;
        if (direction === 'next') {
          newIndex = (currentGroup.currentIndex + 1) % currentGroup.courses.length;
        } else {
          newIndex = (currentGroup.currentIndex - 1 + currentGroup.courses.length) % currentGroup.courses.length;
        }
        
        return {
          ...prev,
          [`${day}-${timeKey}`]: {
            ...currentGroup,
            currentIndex: newIndex
          }
        };
      }
      
      return prev;
    });
  }, []);


  // Initialize overlapping groups when dayColumns change
  React.useEffect(() => {
    const newOverlappingGroups: { [key: string]: { courses: Course[], currentIndex: number } } = {};
    
    DAYS.forEach(day => {
      const dayCourses = dayColumns[day] || [];
      const overlapping = getOverlappingGroups(dayCourses);
      
      Object.entries(overlapping).forEach(([timeKey, courses]) => {
        const groupKey = `${day}-${timeKey}`;
        newOverlappingGroups[groupKey] = {
          courses,
          currentIndex: 0
        };
      });
    });
    
    setOverlappingGroups(newOverlappingGroups);
  }, [dayColumns, getOverlappingGroups]);

  const renderTimeColumn = () => {
    const timeSlots = [];
    for (let m = timeRange.startMin; m <= timeRange.endMin; m += 60) {
      const hh = Math.floor(m / 60);
      const ampm = hh >= 12 ? "PM" : "AM";
      const h12 = ((hh + 11) % 12) + 1;
      
      timeSlots.push(
        <Box
          key={m}
          sx={{
            height: PX_PER_HOUR,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: 'text.secondary',
            borderBottom: (theme) => theme.palette.mode === 'dark' 
              ? '1px dashed #2a3c55' 
              : '1px dashed #d1d5db',
            padding: '2px 6px',
            boxSizing: 'border-box',
          }}
        >
          {h12}:00 {ampm}
        </Box>
      );
    }
    return timeSlots;
  };

  const renderCourseSlot = (course: Course, day: string, index: number = 0) => {
    const top = ((course.StartMin - timeRange.startMin) / 60) * PX_PER_HOUR;
    const height = ((course.EndMin - course.StartMin) / 60) * PX_PER_HOUR;
    
    // Check if this course is part of an overlapping group
    const timeKey = `${course.StartMin}-${course.EndMin}`;
    const groupKey = `${day}-${timeKey}`;
    const overlappingGroup = overlappingGroups[groupKey];
    const isOverlapping = overlappingGroup && overlappingGroup.courses.length > 1;
    
    // For overlapping courses, show all courses in the group
    // The currentIndex is used for which course appears on top in the tooltip
    // but all courses should be visible as stacked cards
    
    return (
      <Tooltip
        key={`${course.CRN}-${day}-${course.StartMin}-${course.EndMin}-${course.Location}-${course.Instructor || 'TBA'}-${course.isLabSection ? 'lab' : 'lecture'}-${index}-${overlappingGroup ? overlappingGroup.currentIndex : 0}`}
        title={
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {course.Subject} {course.Course}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {course.Title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              CRN: {course.CRN} • {course.Instructor || 'TBA'}
            </Typography>
            <Typography variant="body2">
              {course.Location} • {course.Campus}
            </Typography>
            <Typography variant="body2">
              {course.Days} {course.DispTime}
            </Typography>
            {isOverlapping && (
              <>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  {overlappingGroup.courses.length} courses at this time:
                </Typography>
                {overlappingGroup.courses.map((overlappingCourse, idx) => (
                  <Box
                    key={`${overlappingCourse.CRN}-${idx}-${day}-${timeKey}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleOverlappingCourses(day, timeKey, 'set', idx);
                    }}
                    sx={{
                      mt: 0.5,
                      ml: 1,
                      p: 0.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      backgroundColor: idx === overlappingGroup.currentIndex ? 'primary.main' : 'transparent',
                      color: idx === overlappingGroup.currentIndex ? 'white' : 'text.secondary',
                      fontWeight: idx === overlappingGroup.currentIndex ? 'bold' : 'normal',
                      '&:hover': {
                        backgroundColor: idx === overlappingGroup.currentIndex ? 'primary.dark' : 'action.hover',
                        color: idx === overlappingGroup.currentIndex ? 'white' : 'text.primary',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {idx + 1}. {overlappingCourse.Subject} {overlappingCourse.Course} - {overlappingCourse.Instructor || 'TBA'}
                  </Box>
                ))}
                <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                  Click a course to bring it to the top
                </Typography>
              </>
            )}
          </Box>
        }
        arrow
        enterDelay={600}
        leaveDelay={600}
        enterNextDelay={600}
        disableHoverListener={false}
        PopperProps={{
          style: { zIndex: 9999 },
        }}
      >
        <Paper
          className="course-slot"
          elevation={0}
          sx={{
            position: 'absolute',
            left: '6px',
            right: '6px',
            top: Math.max(0, top),
            height: Math.max(18, height),
            background: course.__color.replace(/hsl\(([^)]+)\)/, (match, content) => {
              // Convert HSL to HSLA with the desired opacity
              return `hsla(${content}, ${courseOpacity})`;
            }),
            border: `1px solid ${course.__color}`,
            borderRadius: '8px',
            padding: '6px 8px',
            color: '#ffffff',
            boxShadow: isOverlapping 
              ? '0 4px 12px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.4)' 
              : '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: isOverlapping ? (overlappingGroup.currentIndex === overlappingGroup.courses.findIndex(c => c.CRN === course.CRN) ? 4 : 3) : 2, // Selected course on top
            boxSizing: 'border-box',
            overflow: 'hidden',
            outline: `2px solid ${course.__color}`,
            outlineOffset: '-2px',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
            },
          }}
        >
          {/* Overlapping indicator */}
          {isOverlapping && (
            <Box sx={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              border: '2px solid rgba(0,0,0,0.3)',
              zIndex: 4,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          )}
          
          <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Course Title */}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'bold',
                fontSize: '12px',
                display: 'block',
                lineHeight: 1.2,
                marginBottom: '2px',
              }}
            >
              {course.Subject} {course.Course}
            </Typography>
            
            {/* CRN Tag */}
            <Box
              sx={{
                display: 'inline-block',
                fontSize: '8px',
                padding: '1px 4px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                alignSelf: 'flex-start',
                marginBottom: '2px',
              }}
            >
              {course.CRN}
            </Box>
            
            {/* Time */}
            <Typography
              variant="caption"
              sx={{
                fontSize: '9px',
                display: 'block',
                color: '#e8f0fe',
                opacity: 0.95,
                lineHeight: 1.2,
                fontWeight: 500,
              }}
            >
              {course.DispTime}
            </Typography>
            
            {/* Instructor */}
            <Typography
              variant="caption"
              sx={{
                fontSize: '8px',
                display: 'block',
                color: '#d7e3ff',
                opacity: 0.9,
                lineHeight: 1.2,
                marginBottom: '2px',
              }}
            >
              {course.Instructor || 'TBA'}
            </Typography>
            
            {/* Overlapping Course Indicator */}
            {isOverlapping && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '2px',
                padding: '1px 0',
              }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '8px',
                    color: '#ffffff',
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {overlappingGroup.currentIndex + 1} of {overlappingGroup.courses.length}
                </Typography>
              </Box>
            )}
            
            {/* Add/Remove Button */}
            <Button
              size="small"
              variant="contained"
              sx={{
                position: 'absolute',
                bottom: '3px',
                right: '3px',
                minWidth: 'auto',
                width: 'auto',
                height: 'auto',
                padding: '2px 6px',
                fontSize: '9px',
                background: isMySchedule ? '#dc3545' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                '&:hover': {
                  background: isMySchedule ? '#c82333' : '#048a5a',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isMySchedule) {
                  onRemoveCourse(course.CRN);
                } else {
                  onAddCourse(course.CRN);
                }
              }}
            >
              {isMySchedule ? 'Remove' : 'Add'}
            </Button>
          </Box>
        </Paper>
      </Tooltip>
    );
  };

  const renderDayColumn = (day: string) => {
    const dayCourses = dayColumns[day] || [];
    
    return (
      <Box
        key={day}
        sx={{
          position: 'relative',
          minHeight: ((timeRange.endMin - timeRange.startMin) / 60) * PX_PER_HOUR,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(32,48,69,0.25), rgba(32,48,69,0.18))'
            : 'linear-gradient(180deg, rgba(13, 27, 42, 0.06), rgba(13, 27, 42, 0.03))',
          borderLeft: (theme) => theme.palette.mode === 'dark' 
            ? '1px solid #223246' 
            : '1px solid #d0d7de',
          height: '100%',
        }}
      >
        {dayCourses.map((course, index) => renderCourseSlot(course, day, index))}
      </Box>
    );
  };

  // Check if no subjects are selected (only for available courses, not my schedule)
  const noSubjectsSelected = !isMySchedule && filters.subjectAllow.size === 0;

  if (noSubjectsSelected) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          minHeight: 200,
          textAlign: 'center',
          padding: '20px 20px 0 20px',
        }}
      >
        <Box sx={{
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1a2330 0%, #0f1622 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid #2a3c55'
            : '1px solid #d1d5db',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '350px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <Typography variant="h2" sx={{ mb: 1, fontSize: '36px' }}>
            🎯
          </Typography>
          <Typography variant="h6" sx={{ 
            mb: 1, 
            fontWeight: 'bold',
            color: 'text.primary',
            fontSize: '16px',
          }}>
            Select Subjects to View Courses
          </Typography>
          <Typography variant="body2" sx={{ 
            mb: 2,
            color: 'text.secondary',
            lineHeight: 1.5,
            fontSize: '13px',
          }}>
            Choose one or more subjects from the filter panel to see available courses and build your schedule.
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            alignItems: 'flex-start',
            textAlign: 'left',
          }}>
            <Typography 
              variant="body2" 
              component="div"
              sx={{ 
                color: 'text.secondary',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Box sx={{ 
                width: '4px', 
                height: '4px', 
                borderRadius: '50%', 
                backgroundColor: 'primary.main' 
              }} />
              Click on subject chips to filter courses
            </Typography>
            <Typography 
              variant="body2" 
              component="div"
              sx={{ 
                color: 'text.secondary',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Box sx={{ 
                width: '4px', 
                height: '4px', 
                borderRadius: '50%', 
                backgroundColor: 'secondary.main' 
              }} />
              Use course and instructor filters to narrow down options
            </Typography>
            <Typography 
              variant="body2" 
              component="div"
              sx={{ 
                color: 'text.secondary',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Box sx={{ 
                width: '4px', 
                height: '4px', 
                borderRadius: '50%', 
                backgroundColor: 'warning.main' 
              }} />
              Add courses to your schedule by clicking the "Add" button
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (filteredCourses.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
          textAlign: 'center',
        }}
      >
        <Box>
          <Typography variant="h2" sx={{ mb: 2 }}>
            {isMySchedule ? '📅' : '📚'}
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {isMySchedule ? 'Your schedule is empty' : 'No courses match current filters'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isMySchedule 
              ? 'Add courses from the available courses panel to build your schedule.'
              : 'Try adjusting your filters to see more courses.'
            }
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative',
      borderRadius: '10px',
      overflow: 'hidden',
      border: (theme) => theme.palette.mode === 'dark' 
        ? '1px solid #2a3c55' 
        : '1px solid #d1d5db',
    }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(5, 1fr)',
          gap: 0,
        }}
      >
        {/* Time Column Header */}
        <Box
          sx={{
            background: (theme) => theme.palette.mode === 'dark' ? '#0d1520' : '#f0f4f8',
            color: 'text.secondary',
            borderBottom: (theme) => theme.palette.mode === 'dark' 
              ? '1px solid #213247' 
              : '1px solid #d1d5db',
            padding: '6px 8px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Time
        </Box>
        
        {/* Day Headers */}
        {DAYS.map(day => (
          <Box
            key={day}
            sx={{
              background: (theme) => theme.palette.mode === 'dark' ? '#0d1520' : '#f0f4f8',
              color: (theme) => theme.palette.mode === 'dark' ? '#9fb3c8' : '#111827',
              borderBottom: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid #213247' 
                : '1px solid #d1d5db',
              padding: '6px 8px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {DAY_LABELS[day as keyof typeof DAY_LABELS]}
          </Box>
        ))}
        
        {/* Time Column */}
        <Box
          sx={{
            background: (theme) => theme.palette.mode === 'dark' ? '#0f1722' : '#f0f4f8',
          }}
        >
          {renderTimeColumn()}
        </Box>
        
        {/* Day Columns */}
        {DAYS.map(day => renderDayColumn(day))}
      </Box>
      
    </Box>
  );
};

export default ScheduleGrid;
