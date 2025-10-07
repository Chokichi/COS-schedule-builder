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
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { Close, ContentPaste, QrCodeScanner } from '@mui/icons-material';
import QrReader from 'react-qr-scanner';

interface LoadModalProps {
  open: boolean;
  onClose: () => void;
  onLoadSchedule: (encodedString: string) => void;
}

const LoadModal: React.FC<LoadModalProps> = ({ open, onClose, onLoadSchedule }) => {
  const [encodedString, setEncodedString] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [scanError, setScanError] = useState<string>('');

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

  const handleScan = (data: string | null) => {
    if (data) {
      setEncodedString(data);
      setScanError('');
    }
  };

  const handleScanError = (err: any) => {
    console.error('QR Scan Error:', err);
    setScanError('Failed to access camera. Please check permissions and try again.');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setScanError('');
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
          Load a saved schedule by pasting an encoded string or scanning a QR code. 
          Make sure you have already loaded the available courses first.
        </Alert>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="load schedule tabs">
            <Tab 
              label="Manual Input" 
              icon={<ContentPaste />} 
              iconPosition="start"
              sx={{ textTransform: 'none' }}
            />
            <Tab 
              label="QR Scanner" 
              icon={<QrCodeScanner />} 
              iconPosition="start"
              sx={{ textTransform: 'none' }}
            />
          </Tabs>
        </Box>

        {/* Manual Input Tab */}
        {activeTab === 0 && (
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
        )}

        {/* QR Scanner Tab */}
        {activeTab === 1 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Scan QR Code:
            </Typography>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {scanError ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {scanError}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    onClick={() => setScanError('')}
                    sx={{ textTransform: 'none' }}
                  >
                    Try Again
                  </Button>
                </Box>
              ) : (
                <QrReader
                  delay={300}
                  onError={handleScanError}
                  onScan={handleScan}
                  style={{ width: '100%', maxWidth: '400px' }}
                />
              )}
            </Paper>
            {encodedString && (
              <Alert severity="success" sx={{ mt: 2 }}>
                QR Code scanned successfully! The encoded string has been loaded.
              </Alert>
            )}
          </Box>
        )}

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
