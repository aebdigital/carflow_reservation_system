# QR Code Dual Generation Fix

## Problem Identified 🔍

The system was inconsistently generating QR codes due to multiple code paths:

1. **New reservations** - ✅ Generated both `payBySquareRental` and `payBySquareDeposit`
2. **API regeneration** - ✅ Generated both `payBySquareRental` and `payBySquareDeposit`  
3. **Legacy fallback** - ❌ Generated old format: `payBySquare`, `qrPlatbaCz`, `invoiceBySquare`
4. **Test routes** - ❌ Generated old format: `payBySquare`, `qrPlatbaCz`, `invoiceBySquare`

## What Was Fixed ✅

### 1. **Backend Controllers** (`server/controllers/publicController.js`)
- Fixed `getReservationQRByUser` function (line 3189-3203)
- Updated legacy fallback to use new dual QR format
- Changed from old format to: `payBySquareRental` + `payBySquareDeposit`

### 2. **Test Routes** (`server/routes/testRoutes.js`)
- Updated QR generation logic (lines 163-165)
- Updated debug output (lines 84-91, 190-191)
- Now consistently uses new dual format

### 3. **Migration Script** (`server/scripts/migrateQRCodes.js`)
- Created automated migration for existing legacy QR codes
- Finds reservations with old `payBySquare` format
- Regenerates with new dual format
- Preserves existing metadata

## Current Behavior 🎯

When admin clicks QR icon in reservation subpage:

1. **Frontend**: `QRCodeDisplay.jsx` opens dialog
2. **API Call**: `GET /api/public/reservations/:id/qr`
3. **Backend Logic**:
   - Checks for existing `payBySquareRental` and `payBySquareDeposit`
   - If missing, generates both using `bySquareService`
   - **Always stores both QR codes separately**
4. **Frontend Display**: Shows both QR codes side by side:
   - 🇸🇰 **Nájomné** (Rental fee QR)
   - 🇸🇰 **Depozit** (Deposit QR)

## QR Code Structure 📋

### New Format (Consistent):
```javascript
qrCodes: {
  payBySquareRental: "0004O0003KL4F...",  // Rental amount QR
  payBySquareDeposit: "0004O0008C3SG...", // Deposit amount QR (if deposit > 0)
  generatedAt: "2025-08-07T13:27:02.000Z",
  lastUpdated: "2025-08-07T13:27:02.000Z",
  isActive: true,
  bankAccount: "SK1234567890123456789012",
  variableSymbol: "3877955294",
  constantSymbol: "0308",
  // ... other metadata
}
```

### Legacy Format (Now Fixed):
```javascript
qrCodes: {
  payBySquare: "0004O0002G2VT...",        // Single QR (total amount)
  qrPlatbaCz: null,                       // Czech QR (unused)
  invoiceBySquare: null,                  // Invoice QR (unused)
  // ... metadata
}
```

## Running the Migration 🔧

To fix existing reservations with legacy QR format:

```bash
cd server
node scripts/migrateQRCodes.js
```

The script will:
- Find all reservations with legacy `payBySquare` format
- Regenerate with new dual format
- Preserve existing metadata
- Show progress and summary

## Testing the Fix 🧪

1. **Test QR Icon Click**: Admin clicks QR icon → should see both QR codes
2. **Check Console Logs**: Should show both rental and deposit QR generation
3. **Verify Database**: Reservations should have `payBySquareRental` and `payBySquareDeposit`
4. **UI Display**: Popup shows two side-by-side QR codes with correct amounts

## Files Modified 📝

- `server/controllers/publicController.js` - Fixed legacy fallback
- `server/routes/testRoutes.js` - Fixed test route format  
- `server/scripts/migrateQRCodes.js` - New migration script
- `QR_CODE_FIX_SUMMARY.md` - This documentation

## Expected Result 🎉

**100% consistent dual QR code generation:**
- Every QR request now generates both rental and deposit QR codes
- Frontend always displays both QR codes side by side
- No more inconsistent single QR vs dual QR behavior
- Legacy reservations can be migrated to new format