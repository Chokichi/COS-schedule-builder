import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Close, ContentCopy, IosShare } from '@mui/icons-material';
import QRCode from 'qrcode';

interface ShareAppModalProps {
  open: boolean;
  onClose: () => void;
}

function appUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

const ShareAppModal: React.FC<ShareAppModalProps> = ({ open, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const url = appUrl();
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(console.error);
  }, [open, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      return;
    } catch {
      // Clipboard API can be blocked (insecure origin, embedded browsers); fall back below.
    }
    const input = urlInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    setCopied(document.execCommand('copy'));
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'Student Schedule Builder', url });
    } catch {
      // Dismissing the share sheet rejects; nothing to do.
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ zIndex: 10000 }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Share this app
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Scan with a phone camera to open the Student Schedule Builder.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {qrDataUrl && (
            <Box
              component="img"
              src={qrDataUrl}
              alt={`QR code for ${url}`}
              sx={{ width: 240, height: 240, borderRadius: '8px', background: '#fff' }}
            />
          )}
        </Box>
        <TextField
          value={url}
          fullWidth
          size="small"
          inputRef={urlInputRef}
          InputProps={{ readOnly: true }}
          onFocus={(e) => e.target.select()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {canNativeShare && (
          <Button startIcon={<IosShare />} onClick={handleNativeShare}>
            Share…
          </Button>
        )}
        <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareAppModal;
