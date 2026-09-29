import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Chip,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { ArrowBack, Close, Search } from '@mui/icons-material';
import { Course, SubjectData } from '../types';
import {
  searchCatalogClasses,
  uniqueCatalogClasses,
} from '../utils/catalogClasses';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onLoadCatalog: () => Promise<void>;
  onCompleteImport: (neededCourses: Set<string>) => void;
  isLoading: boolean;
  error: string | null;
  progress: number;
  progressText: string;
  subjects: Set<string>;
  selectedClasses: Set<string>;
  allCourses: Course[];
  onlineCourses: Course[];
  subjectData: Map<string, SubjectData>;
  scheduleLabel: string;
  lastUpdatedLabel: string | null;
}

const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onClose,
  onLoadCatalog,
  onCompleteImport,
  isLoading,
  error,
  progress,
  progressText,
  subjects,
  selectedClasses,
  allCourses,
  onlineCourses,
  subjectData,
  scheduleLabel,
  lastUpdatedLabel,
}) => {
  const loadRequestedRef = useRef(false);
  const [query, setQuery] = useState('');
  const [browseSubject, setBrowseSubject] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      loadRequestedRef.current = false;
      setQuery('');
      setBrowseSubject(null);
      return;
    }
    setPicked(new Set(selectedClasses));
    if (subjects.size > 0 || isLoading || loadRequestedRef.current) {
      return;
    }
    loadRequestedRef.current = true;
    void onLoadCatalog();
  }, [open, subjects.size, isLoading, onLoadCatalog, selectedClasses]);

  const catalogClasses = useMemo(
    () => uniqueCatalogClasses([...allCourses, ...onlineCourses]),
    [allCourses, onlineCourses]
  );

  const searchHits = useMemo(
    () => searchCatalogClasses(catalogClasses, query),
    [catalogClasses, query]
  );

  const browsedClasses = useMemo(() => {
    if (!browseSubject) return [];
    return catalogClasses.filter(entry => entry.subject === browseSubject);
  }, [browseSubject, catalogClasses]);

  const toggleClass = (key: string) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleComplete = () => {
    if (picked.size === 0) {
      alert('Please select at least one class before continuing.');
      return;
    }
    onCompleteImport(picked);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleRetry = () => {
    loadRequestedRef.current = true;
    void onLoadCatalog();
  };

  const listClasses = query.trim() ? searchHits : browsedClasses;
  const showingBrowse = !query.trim() && Boolean(browseSubject);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px 16px 24px',
        borderBottom: (theme) => theme.palette.mode === 'dark'
          ? '1px solid #2a3c55'
          : '1px solid #e5e7eb',
      }}>
        <Box>
          <Typography variant="h5" sx={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'text.primary',
            margin: 0,
          }}>
            What classes do you need?
          </Typography>
          <Typography variant="body2" sx={{
            fontSize: '14px',
            color: 'text.secondary',
            marginTop: '4px',
          }}>
            {lastUpdatedLabel
              ? `${scheduleLabel} schedule, updated ${lastUpdatedLabel}`
              : `${scheduleLabel} course schedule`}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={isLoading}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '24px', '.MuiDialogTitle-root + &': { paddingTop: '20px' } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isLoading && (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '13px', color: 'text.secondary', fontWeight: 500 }}>
                  {progressText || 'Loading schedule...'}
                </Typography>
                <Typography variant="body2" sx={{
                  fontSize: '13px',
                  color: 'text.secondary',
                  fontWeight: 600,
                  background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#f3f4f6',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: (theme) => theme.palette.mode === 'dark' ? '1px solid #3a4a5c' : '1px solid #d1d5db',
                }}>
                  {Math.round(progress)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a2330' : '#f1f5f9',
                  border: (theme) => theme.palette.mode === 'dark' ? '1px solid #2a3c55' : '1px solid #e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: '5px',
                    background: 'linear-gradient(90deg, #2563eb, #059669)',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  },
                }}
              />
            </Box>
          )}

          {subjects.size > 0 && (
            <Box>
              <Typography variant="body1" sx={{
                fontSize: '15px',
                fontWeight: 500,
                color: 'text.primary',
                marginBottom: '16px',
                lineHeight: 1.6,
                padding: '10px 14px',
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                borderRadius: '6px',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(138, 180, 248, 0.12)'
                  : 'rgba(37, 99, 235, 0.08)',
              }}>
                Search for the classes you already know you need, like <strong>MATH 010</strong> or <strong>CHEM 012</strong>.
                We’ll put every available section on the calendar so you can pick times that fit.
              </Typography>

              {picked.size > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Array.from(picked).sort().map(key => (
                    <Chip
                      key={key}
                      label={key}
                      onDelete={() => toggleClass(key)}
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb, #059669)',
                        color: 'white',
                        fontWeight: 600,
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.85)' },
                      }}
                    />
                  ))}
                </Box>
              )}

              <TextField
                fullWidth
                size="small"
                placeholder="Search classes, titles, or subjects…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim()) setBrowseSubject(null);
                }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#ffffff',
                  },
                }}
              />

              {showingBrowse && (
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setBrowseSubject(null)}
                  sx={{ textTransform: 'none', mb: 1, alignSelf: 'flex-start' }}
                >
                  All subjects
                </Button>
              )}

              {!query.trim() && !browseSubject && (
                <>
                  <Typography variant="subtitle1" sx={{
                    fontSize: '16px',
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 1,
                  }}>
                    Or browse by subject
                  </Typography>
                  <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    padding: '16px',
                    background: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f8fafc',
                    borderRadius: '12px',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid #2a3c55' : '1px solid #e5e7eb',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}>
                    {Array.from(subjects).sort().map((subject: string) => (
                      <Chip
                        key={subject}
                        label={subject}
                        clickable
                        onClick={() => setBrowseSubject(subject)}
                        size="small"
                        sx={{ height: '28px', fontSize: '13px' }}
                      />
                    ))}
                  </Box>
                </>
              )}

              {(query.trim() || browseSubject) && (
                <Box sx={{
                  borderRadius: '12px',
                  border: (theme) => theme.palette.mode === 'dark' ? '1px solid #2a3c55' : '1px solid #e5e7eb',
                  background: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f8fafc',
                  maxHeight: '280px',
                  overflowY: 'auto',
                }}>
                  {listClasses.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {query.trim() ? 'No matching classes.' : `No classes found for ${browseSubject}.`}
                      </Typography>
                    </Box>
                  ) : (
                    <List dense sx={{ py: 0 }}>
                      {listClasses.map(entry => {
                        const selected = picked.has(entry.key);
                        const sectionCount = new Set(
                          (subjectData.get(entry.subject)?.courses || [])
                            .filter(c => c.Course === entry.course && !c.isLabSection)
                            .map(c => c.CRN)
                        ).size;
                        return (
                          <ListItem key={entry.key} disablePadding>
                            <ListItemButton
                              onClick={() => toggleClass(entry.key)}
                              selected={selected}
                              sx={{
                                py: 1,
                                background: selected
                                  ? (theme) => theme.palette.mode === 'dark'
                                    ? 'rgba(37, 99, 235, 0.2)'
                                    : 'rgba(37, 99, 235, 0.08)'
                                  : undefined,
                              }}
                            >
                              <ListItemText
                                primary={entry.key}
                                secondary={entry.title}
                                primaryTypographyProps={{ fontSize: '14px', fontWeight: 600 }}
                                secondaryTypographyProps={{ fontSize: '12px' }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {selected ? 'Added' : (sectionCount > 0 ? `${sectionCount} section${sectionCount === 1 ? '' : 's'}` : '')}
                              </Typography>
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              )}

              {picked.size === 0 && (
                <Alert severity="info" sx={{
                  '& .MuiAlert-message': { fontSize: '13px' },
                  borderRadius: '8px',
                  mt: 2,
                }}>
                  Add at least one class to see its sections on the calendar.
                </Alert>
              )}
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                '& .MuiAlert-message': { fontSize: '13px' },
                borderRadius: '8px',
              }}
              action={
                <Button color="inherit" size="small" onClick={handleRetry} disabled={isLoading}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{
        padding: '16px 24px 24px 24px',
        borderTop: (theme) => theme.palette.mode === 'dark'
          ? '1px solid #2a3c55'
          : '1px solid #e5e7eb',
        gap: '12px',
        justifyContent: 'space-between',
      }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          sx={{
            color: 'text.secondary',
            fontSize: '14px',
            textTransform: 'none',
            '&:hover': {
              background: (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#f3f4f6',
            },
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleComplete}
          disabled={isLoading || picked.size === 0}
          sx={{
            background: 'linear-gradient(90deg, #2563eb, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '8px 16px',
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(90deg, #1d4ed8, #047857)',
            },
            '&:disabled': {
              background: (theme) => theme.palette.mode === 'dark' ? '#2a3c55' : '#e5e7eb',
              color: 'text.disabled',
            },
          }}
        >
          {picked.size === 0
            ? 'Show classes on calendar'
            : `Show ${picked.size} class${picked.size === 1 ? '' : 'es'} on calendar`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportModal;
