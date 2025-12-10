import React, { useState, useEffect, useCallback } from 'react';
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
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { Close, ContentCopy, Check, ContentPaste, QrCodeScanner, FlipCameraIos } from '@mui/icons-material';
import QRCode from 'qrcode';
import QrReader from 'react-qr-scanner';
import { Course, CustomTimeBlock } from '../types';

interface SaveLoadModalProps {
  open: boolean;
  onClose: () => void;
  mySchedule: Course[];
  myOnlineClasses: Course[];
  customBlocks?: CustomTimeBlock[];
  onLoadSchedule: (encodedString: string) => void;
  initialTab?: number; // 0 for Save, 1 for Load
}

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ 
  open, 
  onClose, 
  mySchedule, 
  myOnlineClasses, 
  customBlocks = [],
  onLoadSchedule,
  initialTab = 0
}) => {
  const [activeTab, setActiveTab] = useState<number>(initialTab);
  
  // Update tab when initialTab prop changes
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);
  
  // Save tab state
  const [encodedString, setEncodedString] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);

  // Load tab state
  const [loadEncodedString, setLoadEncodedString] = useState<string>('');
  const [loadMethodTab, setLoadMethodTab] = useState<number>(0);
  const [scanError, setScanError] = useState<string>('');
  const [cameraId, setCameraId] = useState<string>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  // Generate encoded string for save tab
  const generateEncodedString = useCallback(() => {
    try {
      const scheduleData = {
        v: '1.0',
        t: 'ssb',
        ts: Date.now(),
        c: mySchedule.map(course => [
          course.CRN,
          course.Subject,
          course.Course,
          course.Days,
          course.StartMin,
          course.EndMin
        ]),
        o: myOnlineClasses.map(course => [
          course.CRN,
          course.Subject,
          course.Course
        ]),
        b: customBlocks.map(block => [
          block.id,
          block.title,
          block.days,
          block.times,
          block.color
        ])
      };

      const jsonString = JSON.stringify(scheduleData);
      const encoded = btoa(unescape(encodeURIComponent(jsonString)));
      
      const originalSize = jsonString.length;
      const compressedSize = encoded.length;
      const ratio = Math.round((1 - compressedSize / originalSize) * 100);
      setCompressionRatio(ratio);
      
      setEncodedString(encoded);

      QRCode.toDataURL(encoded, { 
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeDataUrl).catch(console.error);

    } catch (error) {
      console.error('Error generating encoded string:', error);
    }
  }, [mySchedule, myOnlineClasses, customBlocks]);

  // Generate when save tab is active and modal is open
  useEffect(() => {
    if (open && activeTab === 0) {
      generateEncodedString();
    }
  }, [open, activeTab, generateEncodedString]);

  // Load tab handlers
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLoadEncodedString(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleLoad = () => {
    if (!loadEncodedString || (typeof loadEncodedString === 'string' && !loadEncodedString.trim())) {
      alert('Please paste an encoded schedule string or scan a QR code.');
      return;
    }
    
    try {
      const decoded = atob(loadEncodedString);
      let data;
      
      try {
        data = JSON.parse(decoded);
      } catch {
        const jsonString = decodeURIComponent(escape(decoded));
        data = JSON.parse(jsonString);
      }
      
      if (data.t !== 'ssb') {
        alert('Invalid QR code: This doesn\'t appear to be a valid schedule QR code.');
        return;
      }
    } catch (error) {
      alert('Invalid QR code: This doesn\'t appear to be a valid schedule QR code.');
      return;
    }
    
    onLoadSchedule(loadEncodedString);
    onClose();
  };

  const handleClear = () => {
    setLoadEncodedString('');
  };

  const handleScan = (data: any) => {
    if (data) {
      let stringData;
      
      if (typeof data === 'string') {
        stringData = data;
      } else if (data && typeof data === 'object') {
        if (data.text) {
          stringData = data.text;
        } else if (data.result) {
          stringData = data.result;
        } else {
          try {
            stringData = JSON.stringify(data);
          } catch {
            stringData = String(data);
          }
        }
      } else {
        stringData = String(data);
      }
      
      setLoadEncodedString(stringData);
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
    if (newValue === 1) {
      setLoadMethodTab(0);
    }
  };

  const handleLoadMethodTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setLoadMethodTab(newValue);
    setScanError('');
  };

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        const updatedDevices = await navigator.mediaDevices.enumerateDevices();
        const updatedVideoDevices = updatedDevices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(updatedVideoDevices);
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
    }
  };

  const switchCamera = () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(camera => camera.deviceId === cameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCameraId = availableCameras[nextIndex].deviceId;
      setCameraId(nextCameraId);
    }
  };

  // Get cameras when QR scanner tab is opened
  useEffect(() => {
    if (open && activeTab === 1 && loadMethodTab === 1) {
      getAvailableCameras();
    }
  }, [open, activeTab, loadMethodTab]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!open) {
      setLoadEncodedString('');
      setScanError('');
      setActiveTab(0);
      setLoadMethodTab(0);
      setCameraId('environment');
    }
  }, [open]);

  // Suppress console warnings from react-qr-scanner
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('defaultProps') || args[0].includes('legacyMode'))) {
        return;
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  const handleCopyString = async () => {
    try {
      await navigator.clipboard.writeText(encodedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleCopyQRCode = async () => {
    try {
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy QR code:', error);
    }
  };

  const totalCourses = mySchedule.length + myOnlineClasses.length;
  const totalUnits = [...mySchedule, ...myOnlineClasses].reduce((sum, course) => sum + (course.Units || 0), 0);

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
          💾 Save / 📂 Load Schedule
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="save load tabs">
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>💾</span>
                  <span>Save</span>
                </Box>
              }
              sx={{ textTransform: 'none' }}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>📂</span>
                  <span>Load</span>
                </Box>
              }
              sx={{ textTransform: 'none' }}
            />
          </Tabs>
        </Box>

        {/* Save Tab */}
        {activeTab === 0 && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your schedule has been encoded into a compact string. Share this with others or save it for later!
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Schedule Summary:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalCourses} courses • {totalUnits} units
                {compressionRatio > 0 && (
                  <span> • {compressionRatio}% compressed</span>
                )}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Encoded String ({encodedString.length} characters):
              </Typography>
              <TextField
                multiline
                rows={4}
                value={encodedString}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  readOnly: true,
                  sx: { 
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }
                }}
                sx={{ mb: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={copied ? <Check /> : <ContentCopy />}
                onClick={handleCopyString}
                sx={{ textTransform: 'none' }}
              >
                {copied ? 'Copied!' : 'Copy String'}
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                QR Code:
              </Typography>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'grey.50'
                }}
              >
                {qrCodeDataUrl && (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Schedule QR Code" 
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                )}
              </Paper>
              <Button
                variant="outlined"
                size="small"
                startIcon={copied ? <Check /> : <ContentCopy />}
                onClick={handleCopyQRCode}
                sx={{ 
                  textTransform: 'none',
                  mt: 1
                }}
              >
                {copied ? 'Copied!' : 'Copy QR Code'}
              </Button>
            </Box>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> This encoded string contains your course selections but not real-time enrollment data. 
                Recipients should verify current availability before registering.
              </Typography>
            </Alert>
          </>
        )}

        {/* Load Tab */}
        {activeTab === 1 && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Load a saved schedule by pasting an encoded string or scanning a QR code. 
              Make sure you have already loaded the available courses first.
            </Alert>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={loadMethodTab} onChange={handleLoadMethodTabChange} aria-label="load method tabs">
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

            {/* Manual Input */}
            {loadMethodTab === 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Encoded Schedule String:
                </Typography>
                <TextField
                  multiline
                  rows={6}
                  value={loadEncodedString}
                  onChange={(e) => setLoadEncodedString(e.target.value)}
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

            {/* QR Scanner */}
            {loadMethodTab === 1 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Scan QR Code:
                </Typography>
                <Alert severity="info" sx={{ mb: 2, fontSize: '13px' }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> This scanner only works with QR codes generated by this schedule builder.
                  </Typography>
                </Alert>
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
                    <Box sx={{ position: 'relative' }}>
                      <QrReader
                        key={`qr-scanner-${cameraId}`}
                        delay={300}
                        onError={handleScanError}
                        onScan={handleScan}
                        style={{ width: '100%', maxWidth: '400px' }}
                        constraints={{
                          video: {
                            deviceId: cameraId
                          }
                        }}
                      />
                      
                      {availableCameras.length > 1 && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={switchCamera}
                          startIcon={<FlipCameraIos />}
                          sx={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            },
                            minWidth: 'auto',
                            padding: '4px 8px',
                            fontSize: '12px',
                            textTransform: 'none',
                          }}
                        >
                          Switch Camera
                        </Button>
                      )}
                    </Box>
                  )}
                </Paper>
                {loadEncodedString && (
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
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {activeTab === 0 ? 'Close' : 'Cancel'}
        </Button>
        {activeTab === 1 && (
          <Button 
            onClick={handleLoad} 
            variant="contained"
            disabled={!loadEncodedString || (typeof loadEncodedString === 'string' && !loadEncodedString.trim())}
            sx={{
              background: 'success.main',
              '&:hover': {
                background: 'success.dark',
              }
            }}
          >
            Load Schedule
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SaveLoadModal;

