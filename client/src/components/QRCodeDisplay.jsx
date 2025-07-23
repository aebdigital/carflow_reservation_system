import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Divider
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

const QRCodeDisplay = ({ reservationId, onClose, open = false }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQRCodes = async () => {
    if (!reservationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const baseApiUrl = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
      
      const response = await fetch(`${baseApiUrl}/public/reservations/${reservationId}/qr`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch QR codes');
      }

      const result = await response.json();
      
      if (result.success) {
        setQrData(result.data);
      } else {
        setError('QR codes not available for this reservation');
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      setError('Error loading QR codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && reservationId) {
      fetchQRCodes();
    }
  }, [open, reservationId]);

  const handleCopyText = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error(`Error copying ${type}:`, error);
    }
  };

  const handleDownloadQR = (imageUrl, format) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `qr-code-${format.toLowerCase().replace(' ', '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon color="primary" />
            <Typography variant="h6">QR Platobné kódy</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Načítavajú sa QR kódy...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {qrData && !qrData.hasQRCodes && (
          <Alert severity="info" sx={{ mb: 2 }}>
            QR kódy nie sú dostupné pre túto rezerváciu.
          </Alert>
        )}

        {qrData && qrData.hasQRCodes && (
          <Box>
            {/* Reservation Info */}
            <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Detaily rezervácie
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Číslo rezervácie:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.reservation.reservationNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Nájomné:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(qrData.reservation.amount - (qrData.reservation.car?.pricing?.deposit || 0)).toFixed(2)} €
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Zábezpeka:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(qrData.reservation.car?.pricing?.deposit || 0).toFixed(2)} €
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Celková suma:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.reservation.amount?.toFixed(2)} €
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Zákazník:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.reservation.customer?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Vozidlo:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.reservation.car?.brand} {qrData.reservation.car?.model}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* QR Codes - 2 Slovak QR Codes */}
            <Grid container spacing={3}>
              {(qrData.qrCodes.payBySquareRental || qrData.qrCodes.payBySquare) && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h6">🇸🇰 Nájomné</Typography>
                        <Chip label="Rental" color="primary" size="small" />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <img 
                          src={(qrData.qrCodes.payBySquareRental || qrData.qrCodes.payBySquare)?.imageUrl} 
                          alt="Rental PayBySquare QR Code"
                          style={{ width: '200px', height: '200px', border: '1px solid #ddd' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {qrData.qrCodes.payBySquareRental ? 'QR kód pre platbu nájomného' : 'QR kód pre platbu (celková suma)'}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                        Suma: {qrData.qrCodes.payBySquareRental ? 
                          (qrData.reservation.amount - (qrData.reservation.car?.pricing?.deposit || 0)).toFixed(2) : 
                          qrData.reservation.amount?.toFixed(2)
                        } €
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                        <Tooltip title="Kopírovať QR kód">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyText((qrData.qrCodes.payBySquareRental || qrData.qrCodes.payBySquare)?.code, qrData.qrCodes.payBySquareRental ? 'Rental PayBySquare' : 'PayBySquare')}
                          >
                            <CopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Stiahnuť QR obrázok">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownloadQR((qrData.qrCodes.payBySquareRental || qrData.qrCodes.payBySquare)?.imageUrl, qrData.qrCodes.payBySquareRental ? 'Rental PayBySquare' : 'PayBySquare')}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {(qrData.qrCodes.payBySquareDeposit || (qrData.qrCodes.qrPlatbaCz && qrData.reservation.car?.pricing?.deposit > 0)) && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h6">🇸🇰 Zábezpeka</Typography>
                        <Chip label="Deposit" color="warning" size="small" />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <img 
                          src={(qrData.qrCodes.payBySquareDeposit || qrData.qrCodes.qrPlatbaCz)?.imageUrl} 
                          alt="Deposit PayBySquare QR Code"
                          style={{ width: '200px', height: '200px', border: '1px solid #ddd' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {qrData.qrCodes.payBySquareDeposit ? 'QR kód pre platbu zábezpeky' : 'QR kód (Czech) - pre zábezpeku'}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                        Suma: {(qrData.reservation.car?.pricing?.deposit || 0).toFixed(2)} €
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                        <Tooltip title="Kopírovať QR kód">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyText((qrData.qrCodes.payBySquareDeposit || qrData.qrCodes.qrPlatbaCz)?.code, qrData.qrCodes.payBySquareDeposit ? 'Deposit PayBySquare' : 'QR Platba CZ')}
                          >
                            <CopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Stiahnuť QR obrázok">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownloadQR((qrData.qrCodes.payBySquareDeposit || qrData.qrCodes.qrPlatbaCz)?.imageUrl, qrData.qrCodes.payBySquareDeposit ? 'Deposit PayBySquare' : 'QR Platba CZ')}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* Payment Details */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detaily platby
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Bankový účet:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.paymentDetails.bankAccount}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Variabilný symbol:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.paymentDetails.variableSymbol}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Konštantný symbol:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.paymentDetails.constantSymbol}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Príjemca:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.paymentDetails.beneficiaryName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Poznámka k platbe:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {qrData.paymentDetails.paymentNote}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Zatvoriť
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeDisplay; 