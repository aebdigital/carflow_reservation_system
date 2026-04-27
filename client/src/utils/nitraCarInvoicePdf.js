// NitraCar Slovak invoice PDF generator (frontend, jsPDF + autoTable).
// Uses Roboto loaded from jsDelivr to support full Slovak diacritics
// (ľ, š, č, ť, ž, ď, ň, ŕ etc.) which the default jsPDF fonts don't cover.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ROBOTO_REGULAR_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf'
const ROBOTO_BOLD_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf'

let cachedFonts = null

async function fetchAsBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load font ${url}: ${res.status}`)
  const buf = await res.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function loadRobotoFonts() {
  if (cachedFonts) return cachedFonts
  const [regular, bold] = await Promise.all([
    fetchAsBase64(ROBOTO_REGULAR_URL),
    fetchAsBase64(ROBOTO_BOLD_URL)
  ])
  cachedFonts = { regular, bold }
  return cachedFonts
}

function fmtDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function eur(n) {
  return `${Number(n || 0).toFixed(2)} €`
}

function formatIban(iban) {
  if (!iban) return ''
  return String(iban).replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Generate and download the Slovak invoice PDF for a NitraCar reservation.
 * `data` is the payload returned by the backend `/api/reservations/:id/invoice` endpoint.
 */
export async function generateNitraCarInvoicePdf(data) {
  const { regular, bold } = await loadRobotoFonts()

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Register Roboto so Slovak diacritics render correctly
  doc.addFileToVFS('Roboto-Regular.ttf', regular)
  doc.addFileToVFS('Roboto-Bold.ttf', bold)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const accent = [8, 145, 178] // NitraCar primary
  const muted = [120, 120, 120]
  const dark = [30, 30, 30]

  // ---- Top band: title + invoice number
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...dark)
  doc.text('Faktúra', margin, 24)

  doc.setFontSize(11)
  doc.setTextColor(...muted)
  doc.text(`Číslo: ${data.number || ''}`, pageWidth - margin, 18, { align: 'right' })
  doc.setTextColor(...accent)
  doc.setFontSize(14)
  doc.text(String(data.number || '').toUpperCase(), pageWidth - margin, 26, { align: 'right' })

  // Thin accent rule
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.5)
  doc.line(margin, 30, pageWidth - margin, 30)

  // ---- Dodávateľ / Odberateľ side-by-side
  const colWidth = (pageWidth - margin * 2 - 8) / 2
  const colTop = 38

  const drawParty = (title, lines, x) => {
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text(title.toUpperCase(), x, colTop)

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...dark)
    let y = colTop + 6
    lines.filter(Boolean).forEach((line, i) => {
      if (i === 0) doc.setFont('Roboto', 'bold')
      else doc.setFont('Roboto', 'normal')
      doc.text(line, x, y)
      y += 5.5
    })
  }

  const supplier = data.supplier || {}
  const supplierLines = [
    supplier.name,
    supplier.address,
    supplier.city,
    supplier.ico ? `IČO: ${supplier.ico}` : null,
    supplier.dic ? `DIČ: ${supplier.dic}` : null,
    supplier.email,
    supplier.phone
  ]

  const customer = data.customer || {}
  const customerLines = [
    customer.name || '—',
    customer.address || null,
    customer.isCompany && customer.ico ? `IČO: ${customer.ico}` : null,
    customer.isCompany && customer.dic ? `DIČ: ${customer.dic}` : null
  ]

  drawParty('Dodávateľ', supplierLines, margin)
  drawParty('Odberateľ', customerLines, margin + colWidth + 8)

  // ---- Dates / IBAN / VS strip
  const stripTop = colTop + 50
  doc.setDrawColor(225, 225, 225)
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(margin, stripTop, pageWidth - margin * 2, 22, 1.5, 1.5, 'FD')

  const cellW = (pageWidth - margin * 2) / 4
  const stripCells = [
    { label: 'Dátum vystavenia', value: fmtDate(data.issueDate) },
    { label: 'Dátum vydania', value: fmtDate(data.issueDate) },
    { label: 'Dátum splatnosti', value: fmtDate(data.dueDate) },
    { label: 'Variabilný symbol', value: data.variableSymbol || data.number || '' }
  ]
  stripCells.forEach((c, i) => {
    const x = margin + cellW * i + 4
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(c.label.toUpperCase(), x, stripTop + 7)
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...dark)
    doc.text(String(c.value || ''), x, stripTop + 16)
  })

  // ---- IBAN line + bank name + Pay-by-Square QR (if available)
  const ibanY = stripTop + 30
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...muted)
  doc.text('IBAN:', margin, ibanY)
  doc.setFont('Roboto', 'bold')
  doc.setTextColor(...dark)
  doc.text(formatIban(data.iban) || '', margin + 14, ibanY)

  let afterPaymentY = ibanY + 8

  if (data.bankName) {
    const bankY = ibanY + 6
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text('Banka:', margin, bankY)
    doc.setFont('Roboto', 'bold')
    doc.setTextColor(...dark)
    doc.text(String(data.bankName), margin + 14, bankY)
    afterPaymentY = Math.max(afterPaymentY, bankY + 6)
  }
  if (data.qrDataUrl) {
    const qrSize = 32 // mm
    const qrX = pageWidth - margin - qrSize
    const qrY = stripTop + 26
    doc.addImage(data.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text('Pay by Square', qrX + qrSize / 2, qrY + qrSize + 3.5, { align: 'center' })
    doc.text('Naskenujte v bankovej aplikácii', qrX + qrSize / 2, qrY + qrSize + 7.5, { align: 'center' })
    afterPaymentY = Math.max(afterPaymentY, qrY + qrSize + 12)
  }

  // ---- Items table
  autoTable(doc, {
    startY: afterPaymentY,
    head: [['Názov a popis položky', 'Cena']],
    body: [
      [data.itemDescription || '', eur(data.totalAmount)]
    ],
    theme: 'plain',
    styles: {
      font: 'Roboto',
      fontSize: 11,
      textColor: dark,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 0 }
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fontSize: 9,
      textColor: muted,
      lineWidth: { bottom: 0.4 },
      lineColor: accent,
      fillColor: [255, 255, 255],
      cellPadding: { top: 3, right: 4, bottom: 3, left: 0 }
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 40 }
    },
    margin: { left: margin, right: margin }
  })

  let cursorY = doc.lastAutoTable.finalY + 6

  // ---- Total
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.5)
  doc.line(margin, cursorY, pageWidth - margin, cursorY)
  cursorY += 8

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...dark)
  doc.text('Celková suma:', margin, cursorY)
  doc.setTextColor(...accent)
  doc.text(eur(data.totalAmount), pageWidth - margin, cursorY, { align: 'right' })

  // ---- Footer (contact)
  const footerY = pageHeight - 18
  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  const footerLeft = `${supplier.phone || ''}    ${supplier.email || ''}`
  doc.text(footerLeft, margin, footerY)
  if (supplier.website) {
    doc.text(supplier.website, pageWidth - margin, footerY, { align: 'right' })
  }

  doc.save(`${data.number || 'faktura'}.pdf`)
}
