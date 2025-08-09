# PayBySquare Bank Configuration

This document explains how to configure your bank details for PayBySquare QR code generation.

## Environment Variables

Add these environment variables to your `.env` file to configure your bank details:

### Required PayBySquare API Credentials
```env
BYSQUARE_USERNAME=your_bysquare_username
BYSQUARE_PASSWORD=your_bysquare_password
```

### Optional Service Credentials (if using third-party service)
```env
BYSQUARE_SERVICE_ID=your_service_id
BYSQUARE_SERVICE_USER_ID=your_service_user_id
```

### Bank Account Details
```env
# Your Slovak IBAN account number
BYSQUARE_BANK_ACCOUNT=SK6807200000000000000000

# Bank BIC/SWIFT code (default: TATRSKBX for Tatra Banka)
BYSQUARE_BANK_BIC=TATRSKBX

# Constant symbol for car rental services (default: 0308)
BYSQUARE_CONSTANT_SYMBOL=0308

# Beneficiary name that appears on payments
BYSQUARE_BENEFICIARY_NAME=Your Company Name
```

### Company Details (for invoices)
```env
# Company information
BYSQUARE_COMPANY_NAME=Your Company Name
BYSQUARE_COMPANY_TAX_ID=12345678
BYSQUARE_COMPANY_VAT_ID=SK12345678

# Company address
BYSQUARE_COMPANY_STREET=Your Street Name
BYSQUARE_COMPANY_BUILDING=123
BYSQUARE_COMPANY_CITY=Bratislava
BYSQUARE_COMPANY_ZIP=81108
BYSQUARE_COMPANY_COUNTRY=SVK

# Contact email
BYSQUARE_COMPANY_EMAIL=info@yourcompany.sk
```

## Example Configuration

Here's a complete example for a fictional car rental company:

```env
# PayBySquare API
BYSQUARE_USERNAME=carflow_user
BYSQUARE_PASSWORD=secure_password_123

# Bank Details
BYSQUARE_BANK_ACCOUNT=SK6807200000001234567890
BYSQUARE_BANK_BIC=TATRSKBX
BYSQUARE_CONSTANT_SYMBOL=0308
BYSQUARE_BENEFICIARY_NAME=CarFlow s.r.o.

# Company Details
BYSQUARE_COMPANY_NAME=CarFlow s.r.o.
BYSQUARE_COMPANY_TAX_ID=12345678
BYSQUARE_COMPANY_VAT_ID=SK12345678
BYSQUARE_COMPANY_STREET=Hlavná
BYSQUARE_COMPANY_BUILDING=15
BYSQUARE_COMPANY_CITY=Bratislava
BYSQUARE_COMPANY_ZIP=81108
BYSQUARE_COMPANY_COUNTRY=SVK
BYSQUARE_COMPANY_EMAIL=info@carflow.sk
```

## How QR Codes Work

The system generates two separate PayBySquare QR codes for each reservation:

1. **Rental QR Code** - Contains the rental amount only (variable symbol ends with '1')
2. **Deposit QR Code** - Contains the deposit amount only (variable symbol ends with '2')

Both QR codes will use your configured bank account and company details.

## Default Values

If environment variables are not set, the system uses these defaults:

- **Bank Account**: `SK0483300000002202227202` (Rival Slovakia s.r.o.)
- **Bank BIC**: `FIOZSKBAXXX` (Fio Banka)
- **Constant Symbol**: `0308` (car rental services)
- **Company Name**: `Rival Slovakia s.r.o.`
- **Company Tax ID**: `12345678`
- **Company VAT ID**: `SK12345678`

## Production Deployment

### Render.com
Set these as environment variables in your Render dashboard under Settings → Environment.

### Other Platforms
Set these environment variables according to your hosting platform's documentation.

## Testing

After setting your environment variables, restart your application and create a test reservation. The QR codes generated should use your configured bank details.

You can verify the configuration by checking the application logs, which will show the PayBySquare generation process with your actual bank details.