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
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { Close, ContentCopy, Check } from '@mui/icons-material';
import QRCode from 'qrcode';
import { Course, CustomTimeBlock } from '../types';
import { encodeCustomBlockForShare } from '../utils/parser';
import { useCallback } from 'react';

interface SaveModalProps {
  open: boolean;
  onClose: () => void;
  mySchedule: Course[];
  myOnlineClasses: Course[];
  customBlocks?: CustomTimeBlock[];
}

const SaveModal: React.FC<SaveModalProps> = ({ open, onClose, mySchedule, myOnlineClasses, customBlocks = [] }) => {
  const [encodedString, setEncodedString] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);

  const generateEncodedString = useCallback(() => {
    try {
      // Create a compact data structure with course identifiers
      const scheduleData = {
        v: '1.0', // version
        t: 'ssb', // type (ssb_schedule shortened)
        ts: Date.now(),
        c: mySchedule.map(course => [
          course.CRN,
          course.Subject,
          course.Course,
          course.Days,
          course.StartMin,
          course.EndMin
        ]), // Store CRN + identifying info for matching
        o: myOnlineClasses.map(course => [
          course.CRN,
          course.Subject,
          course.Course
        ]), // Store CRN + subject/course for online courses
        b: customBlocks.map(block => encodeCustomBlockForShare(block)) // Store custom blocks
      };

      // Use simple base64 encoding (without compression)
      const jsonString = JSON.stringify(scheduleData);
      const encoded = btoa(unescape(encodeURIComponent(jsonString)));
      
      // Calculate compression ratio
      const originalSize = jsonString.length;
      const compressedSize = encoded.length;
      const ratio = Math.round((1 - compressedSize / originalSize) * 100);
      setCompressionRatio(ratio);
      
      setEncodedString(encoded);

      // Generate QR code
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

  // Generate encoded string and QR code when modal opens
  useEffect(() => {
    if (open) {
      generateEncodedString();
    }
  }, [open, generateEncodedString]);

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
      // Convert data URL to blob and copy
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
          💾 Save Schedule
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
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

        {/* Encoded String Section */}
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

        {/* QR Code Section */}
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
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveModal;
