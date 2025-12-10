import React, { useState, useMemo } from 'react';
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
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  LightMode,
  DarkMode,
  Search,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  // Normalize course number by removing leading zeros for comparison
  const normalizeCourseNumber = (courseNum: string): string => {
    return courseNum.replace(/^0+/, '') || '0';
  };

  // Search logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        subjects: [],
        courses: [],
        instructors: [],
        crns: [],
      };
    }

    const query = searchQuery.trim().toLowerCase();
    
    // Check if query contains subject code and course number (e.g., "chem 2" or "chem2")
    const subjectCourseMatch = query.match(/^([a-z]+)\s*(\d+)$/i);
    let subjectPrefix = '';
    let courseNumQuery = '';
    
    if (subjectCourseMatch) {
      subjectPrefix = subjectCourseMatch[1].toUpperCase();
      courseNumQuery = subjectCourseMatch[2];
    }

    const results = {
      subjects: [] as string[],
      courses: [] as string[],
      instructors: [] as string[],
      crns: [] as string[],
    };

    // Search subjects
    Array.from(subjects).forEach(subject => {
      if (subject.toLowerCase().includes(query)) {
        results.subjects.push(subject);
      }
    });

    // Search course numbers
    // If we have a subject prefix, only search courses for that subject
    if (subjectPrefix) {
      const subjectInfo = subjectData.get(subjectPrefix);
      if (subjectInfo) {
        Array.from(subjectInfo.courseNumbers).forEach(courseNum => {
          const normalizedCourse = normalizeCourseNumber(courseNum);
          const normalizedQuery = normalizeCourseNumber(courseNumQuery);
          // Match exact normalized number or if course number contains the query
          if (normalizedCourse === normalizedQuery || 
              normalizedCourse.startsWith(normalizedQuery) ||
              courseNum.includes(courseNumQuery)) {
            const fullCourse = `${subjectPrefix} ${courseNum}`;
            if (!results.courses.includes(fullCourse)) {
              results.courses.push(fullCourse);
            }
          }
        });
      }
    } else {
      // Search all course numbers (when no subject prefix)
      // Check if query is just a number
      const isNumericQuery = /^\d+$/.test(query);
      const normalizedNumericQuery = isNumericQuery ? normalizeCourseNumber(query) : '';
      
      Array.from(courses).forEach(courseNum => {
        const normalizedCourse = normalizeCourseNumber(courseNum);
        const courseNumLower = courseNum.toLowerCase();
        
        // Match if:
        // 1. Query is numeric and matches normalized course number
        // 2. Course number contains the query
        const matches = (isNumericQuery && 
                        (normalizedCourse === normalizedNumericQuery || 
                         normalizedCourse.startsWith(normalizedNumericQuery))) ||
                       courseNumLower.includes(query);
        
        if (matches) {
          // Find which subjects have this course number
          subjectData.forEach((data, subject) => {
            if (data.courseNumbers.has(courseNum)) {
              const fullCourse = `${subject} ${courseNum}`;
              if (!results.courses.includes(fullCourse)) {
                results.courses.push(fullCourse);
              }
            }
          });
        }
      });
    }

    // Search instructors (first or last name)
    const allInstructors = filters.subjectAllow.size === 0 
      ? Array.from(instructors)
      : Array.from(filteredInstructors);
    
    allInstructors.forEach(instructor => {
      if (instructor) {
        const nameParts = instructor.toLowerCase().split(/\s+/);
        const matches = nameParts.some(part => part.startsWith(query));
        if (matches && !results.instructors.includes(instructor)) {
          results.instructors.push(instructor);
        }
      }
    });

    // Search CRNs
    allCourses.forEach(course => {
      if (course.CRN.toLowerCase().includes(query)) {
        if (!results.crns.includes(course.CRN)) {
          results.crns.push(course.CRN);
        }
      }
    });

    // Sort results
    results.subjects.sort();
    results.courses.sort();
    results.instructors.sort();
    results.crns.sort();

    return results;
  }, [searchQuery, subjects, courses, instructors, allCourses, subjectData, filters.subjectAllow, filteredInstructors]);

  const handleSearchResultClick = (type: 'subject' | 'course' | 'instructor' | 'crn', value: string) => {
    if (type === 'subject') {
      handleChipClick('subjectAllow', value);
    } else if (type === 'course') {
      // Parse "SUBJ 001" format
      const match = value.match(/^([A-Z]+)\s+(.+)$/);
      if (match) {
        const [, subject, courseNum] = match;
        // First add the subject if not already added
        if (!filters.subjectAllow.has(subject)) {
          handleChipClick('subjectAllow', subject);
        }
        // Then add the course number
        setTimeout(() => {
          handleChipClick('courseAllow', courseNum);
        }, 100);
      }
    } else if (type === 'instructor') {
      handleChipClick('instructorAllow', value);
    } else if (type === 'crn') {
      // For CRN, we need to find the course and add its subject/course
      const course = allCourses.find(c => c.CRN === value);
      if (course) {
        if (!filters.subjectAllow.has(course.Subject)) {
          handleChipClick('subjectAllow', course.Subject);
        }
        setTimeout(() => {
          handleChipClick('courseAllow', course.Course);
        }, 100);
      }
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };


  return (
    <Box sx={{ mt: 3 }}>
      {/* Search Box */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search subjects, courses, instructors, CRNs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchResults(true);
          }}
          onFocus={() => setShowSearchResults(true)}
          onBlur={() => {
            // Delay hiding to allow clicks on results
            setTimeout(() => setShowSearchResults(false), 200);
          }}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#ffffff',
              '& fieldset': {
                borderColor: (theme) => theme.palette.mode === 'dark' ? '#233146' : '#d1d5db',
              },
              '&:hover fieldset': {
                borderColor: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#9ca3af',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
        
        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery.trim() && (
          <Paper
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              maxHeight: '400px',
              overflow: 'auto',
              zIndex: 1000,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a2330' : '#ffffff',
              border: (theme) => theme.palette.mode === 'dark' ? '1px solid #2a3c55' : '1px solid #d1d5db',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {searchResults.subjects.length === 0 &&
             searchResults.courses.length === 0 &&
             searchResults.instructors.length === 0 &&
             searchResults.crns.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">No results found</Typography>
              </Box>
            ) : (
              <List dense sx={{ py: 0 }}>
                {/* Subjects */}
                {searchResults.subjects.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f3f4f6' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                        Subjects
                      </Typography>
                    </Box>
                    {searchResults.subjects.map((subject) => (
                      <ListItem key={subject} disablePadding>
                        <ListItemButton
                          onClick={() => handleSearchResultClick('subject', subject)}
                          sx={{
                            py: 0.5,
                            '&:hover': {
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#e5e7eb',
                            },
                          }}
                        >
                          <ListItemText
                            primary={subject}
                            primaryTypographyProps={{
                              fontSize: '14px',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </>
                )}

                {/* Courses */}
                {searchResults.courses.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f3f4f6' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                        Course Numbers
                      </Typography>
                    </Box>
                    {searchResults.courses.map((course) => (
                      <ListItem key={course} disablePadding>
                        <ListItemButton
                          onClick={() => handleSearchResultClick('course', course)}
                          sx={{
                            py: 0.5,
                            '&:hover': {
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#e5e7eb',
                            },
                          }}
                        >
                          <ListItemText
                            primary={course}
                            primaryTypographyProps={{
                              fontSize: '14px',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </>
                )}

                {/* Instructors */}
                {searchResults.instructors.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f3f4f6' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                        Instructors
                      </Typography>
                    </Box>
                    {searchResults.instructors.map((instructor) => (
                      <ListItem key={instructor} disablePadding>
                        <ListItemButton
                          onClick={() => handleSearchResultClick('instructor', instructor)}
                          sx={{
                            py: 0.5,
                            '&:hover': {
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#e5e7eb',
                            },
                          }}
                        >
                          <ListItemText
                            primary={instructor}
                            primaryTypographyProps={{
                              fontSize: '14px',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </>
                )}

                {/* CRNs */}
                {searchResults.crns.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f3f4f6' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                        CRNs
                      </Typography>
                    </Box>
                    {searchResults.crns.map((crn) => {
                      const course = allCourses.find(c => c.CRN === crn);
                      return (
                        <ListItem key={crn} disablePadding>
                          <ListItemButton
                            onClick={() => handleSearchResultClick('crn', crn)}
                            sx={{
                              py: 0.5,
                              '&:hover': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#e5e7eb',
                              },
                            }}
                          >
                            <ListItemText
                              primary={crn}
                              secondary={course ? `${course.Subject} ${course.Course} - ${course.Title}` : undefined}
                              primaryTypographyProps={{
                                fontSize: '14px',
                              }}
                              secondaryTypographyProps={{
                                fontSize: '12px',
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </>
                )}
              </List>
            )}
          </Paper>
        )}
      </Box>

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
