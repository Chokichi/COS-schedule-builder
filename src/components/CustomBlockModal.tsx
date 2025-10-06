import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';

interface CustomBlockModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (block: CustomTimeBlock) => void;
  onDelete?: (blockId: string) => void;
  editingBlock?: CustomTimeBlock | null;
}

interface CustomTimeBlock {
  id: string;
  title: string;
  days: string[];
  times: { [key: string]: { start: string; end: string } };
  color: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'
];

const CustomBlockModal: React.FC<CustomBlockModalProps> = ({ open, onClose, onSave, onDelete, editingBlock }) => {
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [times, setTimes] = useState<{ [key: string]: { start: string; end: string } }>({});
  const [useSameTimes, setUseSameTimes] = useState(false);
  const [globalStartTime, setGlobalStartTime] = useState('9:00 AM');
  const [globalEndTime, setGlobalEndTime] = useState('10:00 AM');

  // Reset form when modal opens or populate when editing
  useEffect(() => {
    if (open) {
      if (editingBlock) {
        // Populate form with existing block data
        setTitle(editingBlock.title);
        setSelectedDays(editingBlock.days);
        setTimes(editingBlock.times);
        
        // Check if all days have the same times
        const dayTimes = Object.values(editingBlock.times);
        const allSameTimes = dayTimes.length > 0 && dayTimes.every(time => 
          time.start === dayTimes[0].start && time.end === dayTimes[0].end
        );
        
        setUseSameTimes(allSameTimes);
        if (allSameTimes && dayTimes.length > 0) {
          setGlobalStartTime(dayTimes[0].start);
          setGlobalEndTime(dayTimes[0].end);
        } else {
          setGlobalStartTime('9:00 AM');
          setGlobalEndTime('10:00 AM');
        }
      } else {
        // Reset form for new block
        setTitle('');
        setSelectedDays([]);
        setTimes({});
        setUseSameTimes(false);
        setGlobalStartTime('9:00 AM');
        setGlobalEndTime('10:00 AM');
      }
    }
  }, [open, editingBlock]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        const newDays = prev.filter(d => d !== day);
        const newTimes = { ...times };
        delete newTimes[day];
        setTimes(newTimes);
        return newDays;
      } else {
        const newDays = [...prev, day];
        if (useSameTimes) {
          setTimes(prev => ({
            ...prev,
            [day]: { start: globalStartTime, end: globalEndTime }
          }));
        }
        return newDays;
      }
    });
  };

  const handleTimeChange = (day: string, type: 'start' | 'end', value: string) => {
    setTimes(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value
      }
    }));
  };

  const handleSameTimesChange = (checked: boolean) => {
    setUseSameTimes(checked);
    if (checked) {
      // Apply global times to all selected days
      const newTimes: { [key: string]: { start: string; end: string } } = {};
      selectedDays.forEach(day => {
        newTimes[day] = { start: globalStartTime, end: globalEndTime };
      });
      setTimes(newTimes);
    }
  };

  const handleGlobalTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setGlobalStartTime(value);
    } else {
      setGlobalEndTime(value);
    }
    
    if (useSameTimes) {
      const newTimes: { [key: string]: { start: string; end: string } } = {};
      selectedDays.forEach(day => {
        newTimes[day] = { 
          start: type === 'start' ? value : globalStartTime, 
          end: type === 'end' ? value : globalEndTime 
        };
      });
      setTimes(newTimes);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title for the time block.');
      return;
    }
    
    if (selectedDays.length === 0) {
      alert('Please select at least one day.');
      return;
    }

    // Validate that all selected days have times
    const missingTimes = selectedDays.filter(day => !times[day] || !times[day].start || !times[day].end);
    if (missingTimes.length > 0) {
      alert(`Please set times for: ${missingTimes.join(', ')}`);
      return;
    }

    // Generate a unique color for the block
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const customBlock: CustomTimeBlock = {
      id: editingBlock ? editingBlock.id : `custom_${Date.now()}`,
      title: title.trim(),
      days: selectedDays,
      times,
      color: editingBlock ? editingBlock.color : color
    };

    onSave(customBlock);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div">
          {editingBlock ? '✏️ Edit Time Block' : '➕ Create Custom Time Block'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '24px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Title Input */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Block Title
            </Typography>
            <TextField
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Study Time, Work, Lunch, Exercise..."
              variant="outlined"
              size="small"
            />
          </Box>

          <Divider />

          {/* Same Times Option */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useSameTimes}
                  onChange={(e) => handleSameTimesChange(e.target.checked)}
                />
              }
              label="Use same times for all selected days"
            />
            
            {useSameTimes && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, ml: 4 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ fontSize: '12px' }}>Start Time</InputLabel>
                  <Select
                    value={globalStartTime}
                    onChange={(e) => handleGlobalTimeChange('start', e.target.value)}
                    label="Start Time"
                    sx={{ fontSize: '12px' }}
                  >
                    {TIME_OPTIONS.map(time => (
                      <MenuItem key={time} value={time} sx={{ fontSize: '12px' }}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Typography variant="body2" sx={{ mx: 1, fontSize: '12px' }}>to</Typography>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ fontSize: '12px' }}>End Time</InputLabel>
                  <Select
                    value={globalEndTime}
                    onChange={(e) => handleGlobalTimeChange('end', e.target.value)}
                    label="End Time"
                    sx={{ fontSize: '12px' }}
                  >
                    {TIME_OPTIONS.map(time => (
                      <MenuItem key={time} value={time} sx={{ fontSize: '12px' }}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Days Selection */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Select Days
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {DAYS.map(day => (
                <Box key={day} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={day}
                    onClick={() => handleDayToggle(day)}
                    color={selectedDays.includes(day) ? 'primary' : 'default'}
                    variant={selectedDays.includes(day) ? 'filled' : 'outlined'}
                    sx={{ 
                      minWidth: 100, 
                      justifyContent: 'flex-start',
                      ...(selectedDays.includes(day) && {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        }
                      })
                    }}
                  />
                  
                  {selectedDays.includes(day) && !useSameTimes && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: '12px' }}>Start Time</InputLabel>
                        <Select
                          value={times[day]?.start || ''}
                          onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                          label="Start Time"
                          sx={{ fontSize: '12px' }}
                        >
                          {TIME_OPTIONS.map(time => (
                            <MenuItem key={time} value={time} sx={{ fontSize: '12px' }}>{time}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Typography variant="body2" sx={{ mx: 1, fontSize: '12px' }}>to</Typography>
                      
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: '12px' }}>End Time</InputLabel>
                        <Select
                          value={times[day]?.end || ''}
                          onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                          label="End Time"
                          sx={{ fontSize: '12px' }}
                        >
                          {TIME_OPTIONS.map(time => (
                            <MenuItem key={time} value={time} sx={{ fontSize: '12px' }}>{time}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
          <Box>
            {editingBlock && onDelete && (
              <Button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this time block?')) {
                    onDelete(editingBlock.id);
                    onClose();
                  }
                }}
                variant="outlined"
                color="error"
                startIcon={<Delete />}
              >
                Delete
              </Button>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose} variant="outlined">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained"
              disabled={!title.trim() || selectedDays.length === 0}
              sx={{
                background: 'warning.main',
                '&:hover': {
                  background: 'warning.dark',
                }
              }}
            >
              {editingBlock ? 'Save Changes' : 'Create Block'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CustomBlockModal;
