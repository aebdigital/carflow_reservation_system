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
 * Build the jsPDF document for a NitraCar invoice.
 * Internal helper used by both the download and blob-preview paths.
 */
async function buildInvoiceDoc(data) {
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

  const supplier = data.supplier || {}
  const customer = data.customer || {}

  // ---- Top band: title + invoice number + tax-document subtitle
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...dark)
  doc.text('Faktúra', margin, 24)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  doc.text('(Daňový doklad)', margin, 29)

  doc.setFontSize(11)
  doc.setTextColor(...muted)
  doc.text(`Číslo:`, pageWidth - margin - 30, 18, { align: 'left' })
  doc.setTextColor(...accent)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(16)
  doc.text(String(data.number || ''), pageWidth - margin, 24, { align: 'right' })

  // Thin accent rule
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.5)
  doc.line(margin, 33, pageWidth - margin, 33)

  // ---- Dodávateľ / Odberateľ side-by-side
  const colWidth = (pageWidth - margin * 2 - 8) / 2
  const colTop = 41

  const drawParty = (title, lines, x) => {
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text(title.toUpperCase(), x, colTop)

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...dark)
    let y = colTop + 6
    lines.filter(Boolean).forEach((line, i) => {
      if (i === 0) doc.setFont('Roboto', 'bold')
      else doc.setFont('Roboto', 'normal')
      doc.text(line, x, y)
      y += 5
    })
    return y
  }

  const supplierLines = [
    supplier.name,
    supplier.address,
    supplier.city,
    supplier.ico ? `IČO: ${supplier.ico}` : null,
    supplier.dic ? `DIČ: ${supplier.dic}` : null,
    supplier.icDph ? `IČ DPH: ${supplier.icDph}` : 'IČ DPH: nie je platca DPH',
    supplier.register ? supplier.register : null
  ]

  const customerLines = [
    customer.name || '—',
    customer.address || null,
    customer.isCompany && customer.ico ? `IČO: ${customer.ico}` : null,
    customer.isCompany && customer.dic ? `DIČ: ${customer.dic}` : null
  ]

  const supplierBottomY = drawParty('Dodávateľ', supplierLines, margin)
  drawParty('Odberateľ', customerLines, margin + colWidth + 8)

  // ---- Dates / symbols strip (6 fields in two rows of 3)
  const stripTop = supplierBottomY + 4
  const stripHeight = 24
  doc.setDrawColor(225, 225, 225)
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(margin, stripTop, pageWidth - margin * 2, stripHeight, 1.5, 1.5, 'FD')

  const cellsRow1 = [
    { label: 'Dátum vystavenia', value: fmtDate(data.issueDate) },
    { label: 'Dátum dodania', value: fmtDate(data.issueDate) },
    { label: 'Dátum splatnosti', value: fmtDate(data.dueDate), bold: true }
  ]
  const cellsRow2 = [
    { label: 'Variabilný symbol', value: data.variableSymbol || data.number || '' },
    { label: 'Konštantný symbol', value: data.constantSymbol || '' },
    { label: 'Číslo objednávky', value: data.orderNumber || '' }
  ]
  const cellWidthStrip = (pageWidth - margin * 2) / 3
  const drawStripCell = (cell, col, row) => {
    const x = margin + cellWidthStrip * col + 4
    const y = stripTop + 5 + row * 11
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(cell.label.toUpperCase(), x, y)
    doc.setFont('Roboto', cell.bold ? 'bold' : 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...dark)
    doc.text(String(cell.value || '—'), x, y + 5)
  }
  cellsRow1.forEach((c, i) => drawStripCell(c, i, 0))
  cellsRow2.forEach((c, i) => drawStripCell(c, i, 1))

  // ---- Payment details block (left) + Pay-by-Square QR (right)
  const payTop = stripTop + stripHeight + 5
  const qrSize = 32
  const qrX = pageWidth - margin - qrSize
  const qrY = payTop - 2
  let payY = payTop + 4

  const drawPayLine = (label, value, bold = false) => {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...muted)
    doc.text(label, margin, payY)
    doc.setFont('Roboto', bold ? 'bold' : 'normal')
    doc.setTextColor(...dark)
    doc.text(String(value || ''), margin + 35, payY)
    payY += 5
  }
  drawPayLine('Forma úhrady:', data.paymentMethod || 'Prevodný príkaz')
  drawPayLine('Peňažný ústav:', data.bankName || '')
  if (data.bankBranch) drawPayLine('Pobočka:', data.bankBranch)
  if (data.bankAccountLocal) drawPayLine('Číslo účtu:', data.bankAccountLocal)
  drawPayLine('IBAN:', formatIban(data.iban), true)
  if (data.bankSwift) drawPayLine('SWIFT:', data.bankSwift)

  if (data.qrDataUrl) {
    doc.addImage(data.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text('Pay by Square', qrX + qrSize / 2, qrY + qrSize + 3.5, { align: 'center' })
    doc.text('Naskenujte v bankovej app.', qrX + qrSize / 2, qrY + qrSize + 7.5, { align: 'center' })
  }
  const afterPaymentY = Math.max(payY + 2, qrY + qrSize + 12)

  // ---- Items table (Č. / Názov / Cena)
  const items = Array.isArray(data.items) && data.items.length
    ? data.items
    : [{ name: data.itemDescription || 'Prenájom motorového vozidla', price: Number(data.totalAmount || 0) }]
  const total = items.reduce((s, i) => s + (Number(i.price) || 0), 0)

  autoTable(doc, {
    startY: afterPaymentY,
    head: [['Č.', 'Názov', 'Cena']],
    body: items.map((it, idx) => [String(idx + 1), it.name || '', eur(it.price)]),
    theme: 'plain',
    styles: {
      font: 'Roboto',
      fontSize: 10,
      textColor: dark,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fontSize: 8.5,
      textColor: muted,
      lineWidth: { bottom: 0.4 },
      lineColor: accent,
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'left' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  })

  let cursorY = doc.lastAutoTable.finalY + 6

  // ---- DPH recap block
  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.3)
  doc.line(margin, cursorY, pageWidth - margin, cursorY)
  cursorY += 5

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  doc.text('REKAPITULÁCIA DPH (EUR)', margin, cursorY)
  cursorY += 5

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...dark)
  const recapXLabel = margin
  const recapXBase = margin + 60
  const recapXVat = margin + 95
  doc.text('Bez DPH (0%)', recapXLabel, cursorY)
  doc.text(eur(total), recapXBase, cursorY, { align: 'left' })
  doc.text(eur(0), recapXVat, cursorY, { align: 'left' })

  // Right-side payment summary — labels right-aligned at a fixed gutter so
  // they never collide with the value column on the far right.
  const sumX = pageWidth - margin
  const labelX = sumX - 38 // right edge for labels; values use sumX
  let sumY = cursorY - 5
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...muted)
  doc.text('Celkom:', labelX, sumY, { align: 'right' })
  doc.setTextColor(...dark)
  doc.text(eur(total), sumX, sumY, { align: 'right' })
  sumY += 5
  doc.setTextColor(...muted)
  doc.text('Záloha:', labelX, sumY, { align: 'right' })
  doc.setTextColor(...dark)
  doc.text(eur(0), sumX, sumY, { align: 'right' })
  sumY += 6
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...accent)
  doc.text('Na úhradu:', labelX, sumY, { align: 'right' })
  doc.text(eur(total), sumX, sumY, { align: 'right' })

  cursorY = Math.max(cursorY + 8, sumY + 6)

  // ---- "Firma nie je platcom DPH" note
  if (data.notVatPayer) {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...muted)
    doc.text('Firma nie je platcom DPH.', margin, cursorY)
    cursorY += 6
  }

  // ---- Signature block (Vystavil / Prevzal)
  const signTop = pageHeight - 38
  const signLineY = signTop + 6
  const signColWidth = (pageWidth - margin * 2) / 2 - 6
  const sigX1 = margin
  const sigX2 = margin + signColWidth + 12

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  doc.text(`Vystavil: ${data.issuedBy || 'Admin'}`, sigX1, signTop)
  doc.text('Prevzal:', sigX2, signTop)

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(sigX1, signLineY + 6, sigX1 + signColWidth, signLineY + 6)
  doc.line(sigX2, signLineY + 6, sigX2 + signColWidth, signLineY + 6)
  doc.setFontSize(8)
  doc.text('Podpis a pečiatka', sigX1 + signColWidth / 2, signLineY + 10, { align: 'center' })
  doc.text('Podpis a pečiatka', sigX2 + signColWidth / 2, signLineY + 10, { align: 'center' })

  // ---- Footer (contact)
  const footerY = pageHeight - 12
  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...muted)
  const footerLeft = `Tel.: ${supplier.phone || ''}    ${supplier.email || ''}`
  doc.text(footerLeft, margin, footerY)
  if (supplier.website) {
    doc.text(supplier.website, pageWidth - margin, footerY, { align: 'right' })
  }

  return doc
}

/**
 * Generate and download the Slovak invoice PDF for a NitraCar reservation.
 */
export async function generateNitraCarInvoicePdf(data) {
  const doc = await buildInvoiceDoc(data)
  doc.save(`${data.number || 'faktura'}.pdf`)
}

/**
 * Render the same invoice and return a Blob (used for the in-app preview iframe).
 */
export async function getNitraCarInvoicePdfBlob(data) {
  const doc = await buildInvoiceDoc(data)
  return doc.output('blob')
}
