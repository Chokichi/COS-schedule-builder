import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';
import { Course, FilterState } from '../types';

interface OnlineCoursesListProps {
  courses: Course[];
  myOnlineClasses: Course[];
  filters: FilterState;
  onAddOnlineCourse: (crn: string) => void;
  onRemoveOnlineCourse: (crn: string) => void;
}

const OnlineCoursesList: React.FC<OnlineCoursesListProps> = ({
  courses,
  myOnlineClasses,
  filters,
  onAddOnlineCourse,
  onRemoveOnlineCourse,
}) => {
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const subjOk = filters.subjectAllow.size === 0 || filters.subjectAllow.has(course.Subject);
      const courseOk = filters.courseAllow.size === 0 || filters.courseAllow.has(course.Course);
      const instrOk = filters.instructorAllow.size === 0 || filters.instructorAllow.has(course.Instructor);
      const campusOk = filters.campusAllow.size === 0 || filters.campusAllow.has(course.Campus);
      
      return subjOk && courseOk && instrOk && campusOk;
    });
  }, [courses, filters]);

  if (filteredCourses.length === 0) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: 4,
        color: 'text.secondary',
        fontStyle: 'italic'
      }}>
        No online courses match current filters
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {filteredCourses.map(course => {
        const isAlreadySelected = myOnlineClasses.some(c => c.CRN === course.CRN);
        
        return (
          <Card
            key={course.CRN}
            sx={{
              background: (theme) => theme.palette.mode === 'dark' ? '#1a2330' : '#ffffff',
              border: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid #2a3c55' 
                : '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: 0.5
                  }}>
                    {course.Subject} {course.Course}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: 'text.secondary',
                    mb: 1,
                    fontSize: '13px'
                  }}>
                    {course.Title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Chip
                      label={`CRN: ${course.CRN}`}
                      size="small"
                      sx={{ 
                        fontSize: '11px',
                        height: '20px',
                        background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#f3f4f6',
                        color: 'text.secondary'
                      }}
                    />
                    {course.Instructor && (
                      <Chip
                        label={course.Instructor}
                        size="small"
                        sx={{ 
                          fontSize: '11px',
                          height: '20px',
                          background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#f3f4f6',
                          color: 'text.secondary'
                        }}
                      />
                    )}
                    {course.Campus && (
                      <Chip
                        label={course.Campus}
                        size="small"
                        sx={{ 
                          fontSize: '11px',
                          height: '20px',
                          background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#f3f4f6',
                          color: 'text.secondary'
                        }}
                      />
                    )}
                    <Chip
                      label={`Units: ${course.Units || 'N/A'}`}
                      size="small"
                      sx={{ 
                        fontSize: '11px',
                        height: '20px',
                        background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#f3f4f6',
                        color: 'text.secondary'
                      }}
                    />
                  </Box>
                </Box>
                
                <Button
                  variant={isAlreadySelected ? "outlined" : "contained"}
                  size="small"
                  onClick={() => isAlreadySelected ? onRemoveOnlineCourse(course.CRN) : onAddOnlineCourse(course.CRN)}
                  sx={{
                    minWidth: '80px',
                    height: '32px',
                    fontSize: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    ...(isAlreadySelected ? {
                      borderColor: '#dc3545',
                      color: '#dc3545',
                      '&:hover': {
                        borderColor: '#c82333',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                      }
                    } : {
                      background: 'linear-gradient(135deg, #2563eb, #059669)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1d4ed8, #047857)',
                      }
                    })
                  }}
                >
                  {isAlreadySelected ? 'Remove' : 'Add'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default OnlineCoursesList;
