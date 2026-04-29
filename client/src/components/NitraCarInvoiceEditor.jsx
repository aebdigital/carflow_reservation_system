import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Typography,
  Box,
  Alert,
  Tooltip,
  CircularProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { useUpdateNitraCarInvoiceMutation } from '../store/store'
import { generateNitraCarInvoicePdf, getNitraCarInvoicePdfBlob } from '../utils/nitraCarInvoicePdf'

/**
 * Editor + live PDF preview for a NitraCar invoice.
 * Receives the invoice payload from the backend and lets the user
 * edit the line items (name + price) before downloading or persisting.
 */
// Convert any date-ish value (Date, ISO string) to "YYYY-MM-DD" for <input type="date">.
function toIsoDay(d) {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x.getTime())) return ''
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export default function NitraCarInvoiceEditor({ open, onClose, reservationId, invoiceData }) {
  const [items, setItems] = useState([])
  const [number, setNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [variableSymbol, setVariableSymbol] = useState('')
  const [constantSymbol, setConstantSymbol] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState(null)
  const [updateInvoice, { isLoading: saving }] = useUpdateNitraCarInvoiceMutation()

  const lastBlobUrl = useRef(null)
  const renderTimer = useRef(null)

  // Seed all editable fields from the incoming invoice
  useEffect(() => {
    if (!invoiceData) return
    const incoming = Array.isArray(invoiceData.items) && invoiceData.items.length
      ? invoiceData.items
      : [{ name: invoiceData.itemDescription || '', price: Number(invoiceData.totalAmount) || 0 }]
    setItems(incoming.map(i => ({ name: i.name || '', price: Number(i.price) || 0 })))
    setNumber(invoiceData.number || '')
    setIssueDate(toIsoDay(invoiceData.issueDate))
    setDeliveryDate(toIsoDay(invoiceData.deliveryDate || invoiceData.issueDate))
    setDueDate(toIsoDay(invoiceData.dueDate))
    setVariableSymbol(invoiceData.variableSymbol || invoiceData.number || '')
    setConstantSymbol(invoiceData.constantSymbol || '0308')
    setSaved(true)
    setError(null)
  }, [invoiceData])

  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.price) || 0), 0),
    [items]
  )

  // Build a payload that mirrors what the backend would send if everything were saved
  const previewPayload = useMemo(() => {
    if (!invoiceData) return null
    return {
      ...invoiceData,
      items,
      totalAmount: total,
      number: number || invoiceData.number,
      issueDate: issueDate ? new Date(issueDate) : invoiceData.issueDate,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : (invoiceData.deliveryDate || invoiceData.issueDate),
      dueDate: dueDate ? new Date(dueDate) : invoiceData.dueDate,
      variableSymbol: variableSymbol || invoiceData.variableSymbol || number || invoiceData.number,
      constantSymbol: constantSymbol || invoiceData.constantSymbol || '0308'
    }
  }, [invoiceData, items, total, number, issueDate, deliveryDate, dueDate, variableSymbol, constantSymbol])

  // Re-render the PDF preview whenever items change (debounced)
  useEffect(() => {
    if (!previewPayload) return
    setPreviewLoading(true)
    if (renderTimer.current) clearTimeout(renderTimer.current)
    renderTimer.current = setTimeout(async () => {
      try {
        const blob = await getNitraCarInvoicePdfBlob(previewPayload)
        const url = URL.createObjectURL(blob)
        if (lastBlobUrl.current) URL.revokeObjectURL(lastBlobUrl.current)
        lastBlobUrl.current = url
        setPreviewUrl(url)
      } catch (err) {
        console.error('Preview failed:', err)
        setError('Náhľad PDF zlyhal: ' + err.message)
      } finally {
        setPreviewLoading(false)
      }
    }, 350)
    return () => {
      if (renderTimer.current) clearTimeout(renderTimer.current)
    }
  }, [previewPayload])

  // Cleanup blob URL on unmount
  useEffect(() => () => {
    if (lastBlobUrl.current) URL.revokeObjectURL(lastBlobUrl.current)
  }, [])

  const handleItemChange = (idx, field, value) => {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: field === 'price' ? value : value }
      return next
    })
    setSaved(false)
  }

  const handleAddItem = () => {
    setItems(prev => [...prev, { name: '', price: 0 }])
    setSaved(false)
  }

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  const handleSave = async () => {
    setError(null)
    const cleaned = items
      .map(i => ({ name: (i.name || '').trim(), price: Number(i.price) || 0 }))
      .filter(i => i.name.length > 0 || i.price !== 0)
    if (cleaned.length === 0) {
      setError('Faktúra musí obsahovať aspoň jednu položku.')
      return
    }
    if (!number.trim()) {
      setError('Číslo faktúry nemôže byť prázdne.')
      return
    }
    if (!issueDate || !dueDate) {
      setError('Dátum vystavenia a splatnosti sú povinné.')
      return
    }
    try {
      await updateInvoice({
        id: reservationId,
        items: cleaned,
        number: number.trim(),
        issueDate: new Date(issueDate).toISOString(),
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        variableSymbol: variableSymbol.trim(),
        constantSymbol: constantSymbol.trim()
      }).unwrap()
      setSaved(true)
    } catch (err) {
      setError('Uloženie zlyhalo: ' + (err?.data?.message || err.message))
    }
  }

  const handleDownload = async () => {
    if (!previewPayload) return
    try {
      await generateNitraCarInvoicePdf(previewPayload)
    } catch (err) {
      setError('Stiahnutie zlyhalo: ' + err.message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle>
        Faktúra {invoiceData?.number || ''}
        {!saved && (
          <Typography component="span" variant="body2" color="warning.main" sx={{ ml: 2 }}>
            (neuložené zmeny)
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left: editor */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Header (number / dates / symbols) */}
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Údaje faktúry
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 2 }}>
              <TextField
                size="small"
                label="Číslo faktúry"
                value={number}
                onChange={(e) => { setNumber(e.target.value); setSaved(false) }}
                required
              />
              <TextField
                size="small"
                label="Variabilný symbol"
                value={variableSymbol}
                onChange={(e) => { setVariableSymbol(e.target.value); setSaved(false) }}
              />
              <TextField
                size="small"
                label="Dátum vystavenia"
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); setSaved(false) }}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                size="small"
                label="Dátum dodania"
                type="date"
                value={deliveryDate}
                onChange={(e) => { setDeliveryDate(e.target.value); setSaved(false) }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                label="Dátum splatnosti"
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setSaved(false) }}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                size="small"
                label="Konštantný symbol"
                value={constantSymbol}
                onChange={(e) => { setConstantSymbol(e.target.value); setSaved(false) }}
              />
            </Box>

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Položky
            </Typography>
            {items.map((it, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
                <TextField
                  label={`Položka ${idx + 1}`}
                  size="small"
                  value={it.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  fullWidth
                  multiline
                  maxRows={3}
                />
                <TextField
                  label="Cena (€)"
                  size="small"
                  type="number"
                  value={it.price}
                  onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                  inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
                  sx={{ width: 130 }}
                />
                <Tooltip title="Odstrániť položku">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              size="small"
              sx={{ mt: 1 }}
            >
              Pridať položku
            </Button>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Celková suma:
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {total.toFixed(2)} €
              </Typography>
            </Box>
          </Box>

          {/* Right: preview */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Náhľad PDF
              {previewLoading && <CircularProgress size={14} sx={{ ml: 1 }} />}
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: { xs: 500, md: 'calc(100vh - 220px)' },
                minHeight: 500,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'grey.100'
              }}
            >
              {previewUrl && (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title="Náhľad faktúry"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Zatvoriť</Button>
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          variant="outlined"
        >
          Stiahnuť PDF
        </Button>
        <Button
          startIcon={<SaveIcon />}
          onClick={handleSave}
          variant="contained"
          disabled={saving || saved}
        >
          {saving ? 'Ukladá sa…' : 'Uložiť zmeny'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
