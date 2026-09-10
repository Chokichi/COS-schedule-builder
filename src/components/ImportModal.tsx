import React, { useEffect, useRef, useState } from 'react';
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
  Collapse,
} from '@mui/material';
import { Close, ExpandMore, ExpandLess } from '@mui/icons-material';
import scheduleConfig from '../scheduleConfig.json';
import { formatFetchedAt } from '../utils/parser';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onLoadBasicSchedule: () => Promise<void>;
  onCompleteImport: () => void;
  isLoading: boolean;
  error: string | null;
  progress: number;
  progressText: string;
  subjects: Set<string>;
  selectedSubjects: Set<string>;
  onSubjectToggle: (subject: string) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onClose,
  onLoadBasicSchedule,
  onCompleteImport,
  isLoading,
  error,
  progress,
  progressText,
  subjects,
  selectedSubjects,
  onSubjectToggle,
}) => {
  const [subjectsExpanded, setSubjectsExpanded] = useState(true);
  const loadRequestedRef = useRef(false);

  const scheduleLabel = `${scheduleConfig.term} ${scheduleConfig.year}`;
  const lastUpdatedLabel = formatFetchedAt(scheduleConfig.fetchedAt);

  useEffect(() => {
    if (!open) {
      loadRequestedRef.current = false;
      return;
    }
    if (subjects.size > 0 || isLoading || loadRequestedRef.current) {
      return;
    }
    loadRequestedRef.current = true;
    void onLoadBasicSchedule();
  }, [open, subjects.size, isLoading, onLoadBasicSchedule]);

  const handleComplete = () => {
    if (selectedSubjects.size === 0) {
      alert('Please select at least one subject before continuing.');
      return;
    }
    onCompleteImport();
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleRetry = () => {
    loadRequestedRef.current = true;
    void onLoadBasicSchedule();
  };

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
            Select Subjects
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

      <DialogContent sx={{ padding: '24px' }}>
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
                fontSize: '14px',
                color: 'text.secondary',
                marginBottom: '20px',
                lineHeight: 1.6,
              }}>
                Choose which subjects you want to include in your schedule.
                Select at least one subject to continue.
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{
                  fontSize: '16px',
                  color: 'text.primary',
                  fontWeight: '600',
                }}>
                  Available Subjects ({subjects.size})
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setSubjectsExpanded(!subjectsExpanded)}
                  sx={{ ml: 1 }}
                >
                  {subjectsExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={subjectsExpanded}>
                <Box sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 2,
                  padding: '16px',
                  background: (theme) => theme.palette.mode === 'dark' ? '#0f1622' : '#f8fafc',
                  borderRadius: '12px',
                  border: (theme) => theme.palette.mode === 'dark' ? '1px solid #2a3c55' : '1px solid #e5e7eb',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}>
                  {Array.from(subjects).sort().map((subject: string) => (
                    <Chip
                      key={subject}
                      label={subject}
                      clickable
                      color={selectedSubjects.has(subject) ? 'primary' : 'default'}
                      onClick={() => onSubjectToggle(subject)}
                      size="small"
                      sx={{
                        padding: '1px 1px',
                        height: '28px',
                        fontSize: '13px',
                        background: selectedSubjects.has(subject)
                          ? 'linear-gradient(135deg, #2563eb, #059669)'
                          : undefined,
                        color: selectedSubjects.has(subject) ? 'white' : undefined,
                        '&.MuiChip-clickable:hover': {
                          background: selectedSubjects.has(subject)
                            ? 'linear-gradient(135deg, #1d4ed8, #047857)'
                            : (theme) => theme.palette.mode === 'dark' ? '#1a2532' : '#e5e7eb',
                        },
                        '&.MuiChip-colorPrimary': {
                          borderColor: 'transparent',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        },
                      }}
                    />
                  ))}
                </Box>

                {selectedSubjects.size === 0 && (
                  <Alert severity="warning" sx={{
                    '& .MuiAlert-message': { fontSize: '13px' },
                    borderRadius: '8px',
                    mb: 2,
                  }}>
                    Please select at least one subject to view courses.
                  </Alert>
                )}

                {selectedSubjects.size > 0 && (
                  <Alert severity="success" sx={{
                    '& .MuiAlert-message': { fontSize: '13px' },
                    borderRadius: '8px',
                    mb: 2,
                  }}>
                    {selectedSubjects.size} subject{selectedSubjects.size !== 1 ? 's' : ''} selected: {Array.from(selectedSubjects).join(', ')}
                  </Alert>
                )}
              </Collapse>
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
          disabled={isLoading || selectedSubjects.size === 0}
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
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportModal;
