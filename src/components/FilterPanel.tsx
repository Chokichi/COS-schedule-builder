import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  FormControlLabel,
  Switch,
  Collapse,
  IconButton,
  Divider,
  Button,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { FilterState, Course, SubjectData } from '../types';

interface FilterPanelProps {
  filters: FilterState;
  subjects: Set<string>;
  courses: Set<string>;
  instructors: Set<string>;
  campuses: Set<string>;
  allCourses: Course[];
  subjectData: Map<string, SubjectData>;
  onFilterChange: (filters: Partial<FilterState>) => void;
  isLightMode: boolean;
  onToggleLightMode: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  subjects,
  courses,
  instructors,
  campuses,
  allCourses,
  subjectData,
  onFilterChange,
  isLightMode,
  onToggleLightMode,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    subjects: false,
    courses: true,
    instructors: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter courses and instructors based on selected subjects using hierarchical data
  const filteredCourses = React.useMemo(() => {
    if (filters.subjectAllow.size === 0) return new Set<string>();
    
    const courseSet = new Set<string>();
    filters.subjectAllow.forEach(subject => {
      const subjectInfo = subjectData.get(subject);
      if (subjectInfo) {
        subjectInfo.courseNumbers.forEach(course => courseSet.add(course));
      }
    });
    return courseSet;
  }, [filters.subjectAllow, subjectData]);

  const filteredInstructors = React.useMemo(() => {
    if (filters.subjectAllow.size === 0) return new Set<string>();
    
    const instructorSet = new Set<string>();
    filters.subjectAllow.forEach(subject => {
      const subjectInfo = subjectData.get(subject);
      if (subjectInfo) {
        subjectInfo.instructors.forEach(instructor => instructorSet.add(instructor));
      }
    });
    return instructorSet;
  }, [filters.subjectAllow, subjectData]);

  const filteredCampuses = React.useMemo(() => {
    if (filters.subjectAllow.size === 0) return new Set<string>();
    
    const campusSet = new Set<string>();
    filters.subjectAllow.forEach(subject => {
      const subjectInfo = subjectData.get(subject);
      if (subjectInfo) {
        subjectInfo.campuses.forEach(campus => campusSet.add(campus));
      }
    });
    return campusSet;
  }, [filters.subjectAllow, subjectData]);

  const handleChipClick = (type: keyof FilterState, value: string) => {
    const currentSet = filters[type] as Set<string>;
    const newSet = new Set(currentSet);
    
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    
    // If changing subjects, clear course, instructor, and campus filters
    if (type === 'subjectAllow') {
      onFilterChange({ 
        [type]: newSet,
        courseAllow: new Set(),
        instructorAllow: new Set(),
        campusAllow: new Set()
      });
    } else {
      onFilterChange({ [type]: newSet });
    }
  };

  const handleResetFilters = () => {
    onFilterChange({
      subjectAllow: new Set(),
      courseAllow: new Set(),
      instructorAllow: new Set(),
      campusAllow: new Set(),
      showFullClasses: false,
      showFullWaitlist: false,
    });
  };


  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{
        fontSize: '14px',
        margin: '0 0 10px 0',
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.6px'
      }}>
        Filters
      </Typography>
      
      {/* Theme Toggle */}
      <Box sx={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <FormControlLabel
          control={
            <Switch
              checked={isLightMode}
              onChange={onToggleLightMode}
              icon={<DarkMode />}
              checkedIcon={<LightMode />}
            />
          }
          label={
            <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
              {isLightMode ? 'Light Mode' : 'Dark Mode'}
            </Typography>
          }
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Subject Filters */}
      <Box sx={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Button
          onClick={() => toggleSection('subjects')}
          sx={{
            width: '100%',
            textAlign: 'left',
            background: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#ffffff',
            color: 'text.primary',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid #233146' : '1px solid #d1d5db',
            borderRadius: '10px',
            fontSize: '14px',
            padding: '8px 10px',
            textTransform: 'none',
            justifyContent: 'space-between',
            position: 'relative',
            '&:hover': {
              background: (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#f3f4f6',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{expandedSections.subjects ? '▼' : '▶'} Subject Filters</span>
            <Chip
              label="Required"
              size="small"
              sx={{
                height: '20px',
                fontSize: '10px',
                backgroundColor: 'primary.main',
                color: 'white',
                '& .MuiChip-label': {
                  padding: '0 6px',
                }
              }}
            />
          </Box>
        </Button>
        
        <Collapse in={expandedSections.subjects}>
          <Box sx={{ 
            display: 'flex', 
            gap: '8px', 
            flexWrap: 'wrap', 
            marginTop: '8px' 
          }}>
            {Array.from(subjects).sort().map((subject: string) => (
              <Chip
                key={subject}
                label={subject}
                clickable
                color={filters.subjectAllow.has(subject) ? 'primary' : 'default'}
                onClick={() => handleChipClick('subjectAllow', subject)}
                size="small"
                sx={{
                  padding: '1px 1px',
                  height: '24px',
                  fontSize: '12px',
                  background: filters.subjectAllow.has(subject) 
                    ? 'linear-gradient(135deg, #2563eb, #059669)'
                    : undefined,
                  color: filters.subjectAllow.has(subject) ? 'white' : undefined,
                  '&.MuiChip-clickable:hover': {
                    background: filters.subjectAllow.has(subject)
                      ? 'linear-gradient(135deg, #1d4ed8, #047857)'
                      : (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#e5e7eb',
                  },
                  '&.MuiChip-colorPrimary': {
                    borderColor: 'transparent',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  }
                }}
              />
            ))}
          </Box>
          
          {filters.subjectAllow.size === 0 && (
            <Box sx={{
              marginTop: '12px',
              padding: '12px',
              background: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(138, 180, 248, 0.1)' 
                : 'rgba(37, 99, 235, 0.05)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(138, 180, 248, 0.2)'
                : '1px solid rgba(37, 99, 235, 0.1)',
              borderRadius: '8px',
            }}>
              <Typography 
                variant="body2" 
                component="div"
                sx={{
                  color: 'primary.main',
                  fontSize: '13px',
                  fontWeight: '500',
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
                Select at least one subject to view courses
              </Typography>
            </Box>
          )}
        </Collapse>
      </Box>
      
      {/* Course Filters */}
      {filters.subjectAllow.size > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              Course Numbers
            </Typography>
            <IconButton
              size="small"
              onClick={() => toggleSection('courses')}
            >
              {expandedSections.courses ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={expandedSections.courses}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {Array.from(filteredCourses).sort().map((course: string) => (
              <Chip
                key={course}
                label={course}
                clickable
                color={filters.courseAllow.has(course) ? 'primary' : 'default'}
                onClick={() => handleChipClick('courseAllow', course)}
                size="small"
                sx={{
                  padding: '1px 1px',
                  height: '24px',
                  fontSize: '12px',
                  background: filters.courseAllow.has(course) 
                    ? 'linear-gradient(135deg, #2563eb, #059669)'
                    : undefined,
                  color: filters.courseAllow.has(course) ? 'white' : undefined,
                  '&.MuiChip-clickable:hover': {
                    background: filters.courseAllow.has(course)
                      ? 'linear-gradient(135deg, #1d4ed8, #047857)'
                      : (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#e5e7eb',
                  },
                  '&.MuiChip-colorPrimary': {
                    borderColor: 'transparent',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  }
                }}
              />
            ))}
            </Box>
          </Collapse>
        </Box>
      )}
      
      {/* Instructor Filters */}
      {filters.subjectAllow.size > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              Instructors
            </Typography>
            <IconButton
              size="small"
              onClick={() => toggleSection('instructors')}
            >
              {expandedSections.instructors ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={expandedSections.instructors}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {Array.from(filteredInstructors).sort().map((instructor: string) => (
              <Chip
                key={instructor}
                label={instructor}
                clickable
                color={filters.instructorAllow.has(instructor) ? 'primary' : 'default'}
                onClick={() => handleChipClick('instructorAllow', instructor)}
                size="small"
                sx={{
                  padding: '1px 1px',
                  height: '24px',
                  fontSize: '12px',
                  background: filters.instructorAllow.has(instructor) 
                    ? 'linear-gradient(135deg, #2563eb, #059669)'
                    : undefined,
                  color: filters.instructorAllow.has(instructor) ? 'white' : undefined,
                  '&.MuiChip-clickable:hover': {
                    background: filters.instructorAllow.has(instructor)
                      ? 'linear-gradient(135deg, #1d4ed8, #047857)'
                      : (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#e5e7eb',
                  },
                  '&.MuiChip-colorPrimary': {
                    borderColor: 'transparent',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  }
                }}
              />
            ))}
            </Box>
          </Collapse>
        </Box>
      )}
      
      {/* Campus Filters */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Campus
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {Array.from(filters.subjectAllow.size === 0 ? campuses : filteredCampuses).sort().map((campus: string) => (
            <Chip
              key={campus}
              label={campus || 'Unknown'}
              clickable
              color={filters.campusAllow.has(campus) ? 'primary' : 'default'}
              onClick={() => handleChipClick('campusAllow', campus)}
              size="small"
              sx={{
                padding: '2px 8px',
                height: '24px',
                fontSize: '12px',
                background: filters.campusAllow.has(campus) 
                  ? 'linear-gradient(135deg, #2563eb, #059669)'
                  : undefined,
                color: filters.campusAllow.has(campus) ? 'white' : undefined,
                '&.MuiChip-clickable:hover': {
                  background: filters.campusAllow.has(campus)
                    ? 'linear-gradient(135deg, #1d4ed8, #047857)'
                    : (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#e5e7eb',
                },
                '&.MuiChip-colorPrimary': {
                  borderColor: 'transparent',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                }
              }}
            />
          ))}
        </Box>
      </Box>
      
      
      {/* Additional Options */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filters.showOnline}
              onChange={(e) => {
                console.log('Show Online Courses changed to:', e.target.checked);
                onFilterChange({ showOnline: e.target.checked });
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#059669',
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#059669',
                  },
                },
              }}
            />
          }
          label="Show Online Courses"
          sx={{ 
            '& .MuiFormControlLabel-label': {
              fontSize: '14px',
              fontWeight: 500,
              color: 'text.primary'
            }
          }}
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filters.showFullClasses}
              onChange={(e) => {
                console.log('Show Full Classes changed to:', e.target.checked);
                onFilterChange({ showFullClasses: e.target.checked });
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#059669',
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#059669',
                  },
                },
              }}
            />
          }
          label="Show Full Classes"
          sx={{ 
            '& .MuiFormControlLabel-label': {
              fontSize: '14px',
              fontWeight: 500,
              color: 'text.primary'
            }
          }}
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filters.showFullWaitlist}
              onChange={(e) => {
                console.log('Show Full Waitlist changed to:', e.target.checked);
                onFilterChange({ showFullWaitlist: e.target.checked });
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#059669',
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#059669',
                  },
                },
              }}
            />
          }
          label="Show Full Waitlist Classes"
          sx={{ 
            '& .MuiFormControlLabel-label': {
              fontSize: '14px',
              fontWeight: 500,
              color: 'text.primary'
            }
          }}
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Button
        variant="outlined"
        onClick={handleResetFilters}
        fullWidth
      >
        Reset Filters
      </Button>
    </Box>
  );
};

export default FilterPanel;
