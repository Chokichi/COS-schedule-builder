import React, { useState } from 'react';
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
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { Close, ContentPaste, Check } from '@mui/icons-material';

interface LoadModalProps {
  open: boolean;
  onClose: () => void;
  onLoadSchedule: (encodedString: string) => void;
}

const LoadModal: React.FC<LoadModalProps> = ({ open, onClose, onLoadSchedule }) => {
  const [encodedString, setEncodedString] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setEncodedString(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleLoad = () => {
    if (!encodedString.trim()) {
      alert('Please paste an encoded schedule string.');
      return;
    }
    onLoadSchedule(encodedString);
    onClose();
  };

  const handleClear = () => {
    setEncodedString('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
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
          📂 Load Saved Schedule
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Paste an encoded schedule string to restore your course selections. 
          Make sure you have already loaded the available courses first.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Encoded Schedule String:
          </Typography>
          <TextField
            multiline
            rows={6}
            value={encodedString}
            onChange={(e) => setEncodedString(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Paste the encoded schedule string here..."
            InputProps={{
              sx: { 
                fontFamily: 'monospace',
                fontSize: '12px'
              }
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentPaste />}
              onClick={handlePasteFromClipboard}
              sx={{ textTransform: 'none' }}
            >
              Paste from Clipboard
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClear}
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
          </Box>
        </Box>

        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Note:</strong> This will replace your current schedule. 
            Make sure you have the correct available courses loaded first.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleLoad} 
          variant="contained"
          disabled={!encodedString.trim()}
          sx={{
            background: 'success.main',
            '&:hover': {
              background: 'success.dark',
            }
          }}
        >
          Load Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadModal;
