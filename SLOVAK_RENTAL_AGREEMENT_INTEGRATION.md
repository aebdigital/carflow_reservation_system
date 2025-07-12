# 📄 Slovak Rental Agreement PDF Integration

This guide explains how to use the integrated Slovak rental agreement PDF system for generating filled rental contracts for car rental reservations.

## 🚀 **Overview**

The Slovak rental agreement integration automatically generates filled PDF rental contracts in Slovak language, populated with reservation, customer, and vehicle details.

**Key Features:**
- **Automatic PDF Generation** - Filled with reservation data
- **Slovak Language Support** - Native Slovak text and formatting
- **Two PDF Methods** - Form filling + text overlay fallback
- **Multiple Access Points** - Admin and public endpoints

## ⚙️ **Configuration**

### **PDF Template Location**
The Slovak rental agreement template is stored at:
```
server/templates/Zmlu o najme vozidla 2025.pdf
```

### **Dependencies**
The system uses the `pdf-lib` library for PDF processing:
```bash
npm install pdf-lib
```

## 🔧 **How It Works**

### **PDF Generation Process**

1. **Template Loading** → PDF template is loaded from templates directory
2. **Data Mapping** → Reservation data is mapped to Slovak form fields
3. **PDF Processing** → Either form filling or text overlay
4. **Response** → Generated PDF is served to user

### **Data Mapping**

The system maps reservation data to Slovak rental agreement fields:

| Slovak Field | English Translation | Data Source |
|-------------|-------------------|-------------|
| `meno_najomcu` | Tenant name | `customer.firstName + lastName` |
| `adresa_najomcu` | Tenant address | `customer.address` |
| `cislo_op` | ID number | `customer.licenseNumber` |
| `telefon` | Phone | `customer.phone` |
| `email` | Email | `customer.email` |
| `meno_vozidla` | Vehicle name | `car.brand + model` |
| `ECV` | Registration number | `car.registrationNumber` |
| `VIN` | VIN number | `car.vin` |
| `rok_vyroby` | Year of manufacture | `car.year` |
| `farba` | Color | `car.color` |
| `zaciatok_najmu` | Rental start | `reservation.startDate` |
| `koniec_najmu` | Rental end | `reservation.endDate` |
| `denna_sadzba` | Daily rate | `reservation.pricing.dailyRate` |
| `pocet_dni` | Number of days | Calculated from dates |
| `cena_bez_depozitu` | Price without deposit | `reservation.pricing.subtotal` |
| `sluzby_priplatky` | Services and surcharges | `reservation.pricing.fees` |
| `spolu_cena` | Total price | `reservation.pricing.totalAmount` |

## 🌐 **API Endpoints**

### **1. Admin Access (Protected)**

```
GET /api/reservations/:id/slovak-agreement
Authorization: Bearer <admin_token>
```

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://carflow-reservation-system.onrender.com/api/reservations/669abc123def456/slovak-agreement"
```

### **2. Public Access (No Authentication)**

```
GET /api/public/reservations/:id/slovak-agreement
```

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/reservations/669abc123def456/slovak-agreement"
```

### **3. Tenant-Specific Access**

```
GET /api/public/users/:email/reservations/:id/slovak-agreement
```

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/reservations/669abc123def456/slovak-agreement"
```

### **Query Parameters**

- `?preview=true` - Display PDF in browser instead of downloading
- `?preview=false` or no parameter - Download PDF file

## 💻 **Frontend Integration**

### **Download PDF Button (React)**

```jsx
import React from 'react';

const SlovakAgreementDownload = ({ reservationId, userEmail }) => {
  const downloadAgreement = () => {
    const endpoint = userEmail 
      ? `/api/public/users/${userEmail}/reservations/${reservationId}/slovak-agreement`
      : `/api/public/reservations/${reservationId}/slovak-agreement`;
      
    // Download the PDF
    window.open(endpoint, '_blank');
  };

  const previewAgreement = () => {
    const endpoint = userEmail 
      ? `/api/public/users/${userEmail}/reservations/${reservationId}/slovak-agreement?preview=true`
      : `/api/public/reservations/${reservationId}/slovak-agreement?preview=true`;
      
    // Preview the PDF in browser
    window.open(endpoint, '_blank');
  };

  return (
    <div className="agreement-actions">
      <h3>📄 Zmluva o nájme vozidla</h3>
      <button onClick={previewAgreement} className="btn-preview">
        👁️ Náhľad zmluvy
      </button>
      <button onClick={downloadAgreement} className="btn-download">
        📥 Stiahnuť zmluvu
      </button>
    </div>
  );
};

export default SlovakAgreementDownload;
```

### **HTML + JavaScript Example**

```html
<div id="slovak-agreement-section">
  <h3>📄 Zmluva o nájme vozidla</h3>
  <button onclick="previewAgreement('669abc123def456', 'admin@example.com')">
    👁️ Náhľad zmluvy
  </button>
  <button onclick="downloadAgreement('669abc123def456', 'admin@example.com')">
    📥 Stiahnuť zmluvu
  </button>
</div>

<script>
function previewAgreement(reservationId, userEmail = null) {
  const endpoint = userEmail 
    ? `/api/public/users/${userEmail}/reservations/${reservationId}/slovak-agreement?preview=true`
    : `/api/public/reservations/${reservationId}/slovak-agreement?preview=true`;
    
  window.open(endpoint, '_blank');
}

function downloadAgreement(reservationId, userEmail = null) {
  const endpoint = userEmail 
    ? `/api/public/users/${userEmail}/reservations/${reservationId}/slovak-agreement`
    : `/api/public/reservations/${reservationId}/slovak-agreement`;
    
  window.open(endpoint, '_blank');
}
</script>
```

## 🔧 **Customization**

### **Updating Text Positions**

If you need to adjust text positions on the PDF, modify the `textPositions` object in `server/services/pdfService.js`:

```javascript
const textPositions = {
  'meno_najomcu': { x: 150, y: 750 },    // Customer name position
  'adresa_najomcu': { x: 150, y: 720 },  // Address position
  'telefon': { x: 150, y: 690 },         // Phone position
  'email': { x: 150, y: 660 },           // Email position
  // ... add more positions as needed
};
```

### **Adding New Fields**

To add new fields to the PDF:

1. **Update the `prepareFormData` method:**
```javascript
return {
  // ... existing fields ...
  'new_field': 'New Value'
};
```

2. **Add position in `overlayTextData` method:**
```javascript
const textPositions = {
  // ... existing positions ...
  'new_field': { x: 200, y: 400 }
};
```

### **Changing PDF Template**

To use a different PDF template:

1. Replace the file in `server/templates/`
2. Update the path in `server/services/pdfService.js`:
```javascript
this.templatePath = path.join(__dirname, '../templates/new-template.pdf');
```

## 🔍 **Testing**

### **Test PDF Generation**

```bash
# Test admin endpoint
curl -H "Authorization: Bearer <token>" \
  "https://carflow-reservation-system.onrender.com/api/reservations/RESERVATION_ID/slovak-agreement?preview=true"

# Test public endpoint
curl "https://carflow-reservation-system.onrender.com/api/public/reservations/RESERVATION_ID/slovak-agreement?preview=true"

# Test tenant-specific endpoint
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/reservations/RESERVATION_ID/slovak-agreement?preview=true"
```

### **Debug PDF Fields**

```bash
# Check available form fields in PDF template
curl -H "Authorization: Bearer <token>" \
  "https://carflow-reservation-system.onrender.com/api/reservations/pdf-fields"
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **PDF not generating:**
   - Check if PDF template exists in `server/templates/`
   - Verify `pdf-lib` is installed
   - Check server logs for error messages

2. **Text not appearing in correct positions:**
   - Adjust coordinates in `textPositions` object
   - Test with different font sizes
   - Check PDF page dimensions

3. **Missing reservation data:**
   - Verify reservation exists and is populated
   - Check data mapping in `prepareFormData`
   - Ensure all required fields are present

### **Debug Mode**

Enable detailed logging by checking server console for PDF operations:
- `🔄 [PDF]` - Generation in progress
- `✅ [PDF]` - Success messages
- `❌ [PDF]` - Error messages
- `📋 [PDF]` - Form field information

## 📋 **Example Generated Data**

When generating a PDF, the system will populate fields with data like:

```
Meno nájomcu: John Doe
Adresa nájomcu: Main Street 123, Bratislava, 81108, Slovensko
Telefón: +421 123 456 789
Email: john@example.com
Meno vozidla: BMW X5
ECV: BA123AB
Rok výroby: 2023
Farba: Čierna
Začiatok nájmu: 20.7.2024
Koniec nájmu: 25.7.2024
Denná sadzba: 50 €
Počet dní: 5
Cena bez depozitu: 250.00 €
Služby a príplatky: 25.00 €
Spolu cena: 275.00 €
```

---

## 🎉 **You're Ready!**

Your Slovak rental agreement PDF integration is now complete! Customers and admins can generate professional rental contracts in Slovak language with all reservation details automatically filled in. 