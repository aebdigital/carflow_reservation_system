const translations = {
  sk: {
    // Navigation and Layout
    dashboard: 'Domov',
    reservations: 'Rezervácie', 
    fleetManagement: 'Správa vozového parku',
    customers: 'Zákazníci',
    calendar: 'Kalendár',
    payments: 'Platby',
    settings: 'Nastavenia',
    profile: 'Profil',
    logout: 'Odhlásiť sa',
    
    // Headers and Page Titles
    carRentalAdmin: 'Správa prenájmu áut',
    managementPanel: 'Ovládací panel',
    welcomeBack: 'Vitajte späť',
    signInToAdmin: 'Prihláste sa do admin účtu',
    
    // Login Page
    demoAccounts: 'Demo účty',
    clickAccountToFill: 'Kliknite na akýkoľvek účet nižšie pre automatické vyplnenie prihlasovacieho formulára:',
    admin: 'Admin',
    customer: 'Zákazník',
    fullAccess: 'Plný prístup ku všetkým funkciám',
    customerAccess: 'Prístup k zákazníckemu účtu',
    demoAppNote: '💡 Toto je demo aplikácia. Všetky údaje sú simulované.',
    email: 'E-mail',
    password: 'Heslo',
    signIn: 'Prihlásiť sa',
    loginFailed: 'Prihlásenie zlyhalo. Skúste to znova.',
    
    // Dashboard
    totalCars: 'Celkový počet áut',
    activeReservations: 'Aktívne rezervácie',
    totalCustomers: 'Celkový počet zákazníkov',
    monthlyRevenue: 'Mesačné tržby',
    recentReservations: 'Nedávne rezervácie',
    viewAll: 'Zobraziť všetko',
    reservationId: 'ID rezervácie',
    customerName: 'Meno zákazníka',
    carDetails: 'Detaily auta',
    dateRange: 'Dátumové rozmedzie',
    status: 'Stav',
    amount: 'Suma',
    fleetOverview: 'Prehľad vozového parku',
    available: 'Dostupné',
    booked: 'Rezervované',
    maintenance: 'Údržba',
    outOfService: 'Mimo prevádzky',
    
    // Cars Page
    cars: 'Autá',
    addCar: 'Pridať auto',
    editCar: 'Upraviť auto',
    viewCar: 'Zobraziť auto',
    deleteCar: 'Vymazať auto',
    carInformation: 'Informácie o aute',
    brand: 'Značka',
    model: 'Model',
    year: 'Rok',
    registrationNumber: 'Evidenčné číslo',
    vin: 'VIN',
    color: 'Farba',
    category: 'Kategória',
    fuelType: 'Typ paliva',
    transmission: 'Prevodovka',
    seats: 'Počet sedadiel',
    doors: 'Počet dverí',
    mileage: 'Najazdené km',
    description: 'Popis',
    deposit: 'Záloha',
    dailyRate: 'Denná sadzba',
    weeklyRate: 'Týždenná sadzba',
    monthlyRate: 'Mesačná sadzba',
    location: 'Lokácia',
    features: 'Vlastnosti',
    images: 'Obrázky',
    maintenance: 'Údržba',
    insurance: 'Poistenie',
    
    // Car Categories
    economy: 'Ekonomická',
    compact: 'Kompaktná',
    midsize: 'Stredná',
    fullsize: 'Veľká',
    luxury: 'Luxusná',
    suv: 'SUV',
    minivan: 'Minivan',
    convertible: 'Kabriolet',
    sports: 'Športové',
    
    // Fuel Types
    gasoline: 'Benzín',
    diesel: 'Nafta',
    hybrid: 'Hybrid',
    electric: 'Elektrické',
    
    // Transmission Types
    manual: 'Manuálna',
    automatic: 'Automatická',
    cvt: 'CVT',
    
    // Car Features
    airConditioning: 'Klimatizácia',
    gps: 'GPS',
    bluetooth: 'Bluetooth',
    heatedSeats: 'Vyhrievané sedadlá',
    sunroof: 'Strešné okno',
    leatherSeats: 'Kožené sedadlá',
    backupCamera: 'Cúvacia kamera',
    cruiseControl: 'Tempomat',
    usbPorts: 'USB porty',
    wifi: 'WiFi',
    
    // Reservations Page
    newReservation: 'Nová rezervácia',
    editReservation: 'Upraviť rezerváciu',
    deleteReservation: 'Vymazať rezerváciu',
    reservationDetails: 'Detaily rezervácie',
    selectCustomer: 'Vybrať zákazníka',
    selectCar: 'Vybrať auto',
    startDate: 'Dátum začiatku',
    endDate: 'Dátum ukončenia',
    pickupLocation: 'Miesto vyzdvihnutia',
    dropoffLocation: 'Miesto vrátenia',
    totalDays: 'Celkový počet dní',
    totalAmount: 'Celková suma',
    reservationStatus: 'Stav rezervácie',
    confirmed: 'Potvrdené',
    pending: 'Čakajúce',
    cancelled: 'Zrušené',
    completed: 'Dokončené',
    active: 'Aktívne',
    rentalPeriod: 'Obdobie prenájmu',
    duration: 'Trvanie',
    
    // Customers Page
    addCustomer: 'Pridať zákazníka',
    editCustomer: 'Upraviť zákazníka',
    deleteCustomer: 'Vymazať zákazníka',
    customerInformation: 'Informácie o zákazníkovi',
    firstName: 'Meno',
    lastName: 'Priezvisko',
    phone: 'Telefón',
    dateOfBirth: 'Dátum narodenia',
    address: 'Adresa',
    street: 'Ulica',
    city: 'Mesto',
    state: 'Štát',
    zipCode: 'PSČ',
    country: 'Krajina',
    drivingLicense: 'Vodičský preukaz',
    licenseNumber: 'Číslo preukazu',
    licenseExpiry: 'Platnosť preukazu',
    emergencyContact: 'Núdzový kontakt',
    
    // Payments Page
    createPayment: 'Vytvoriť platbu',
    paymentDetails: 'Detaily platby',
    paymentAmount: 'Suma platby',
    paymentMethod: 'Spôsob platby',
    paymentStatus: 'Stav platby',
    paymentDate: 'Dátum platby',
    transactionId: 'ID transakcie',
    invoice: 'Faktúra',
    downloadInvoice: 'Stiahnuť faktúru',
    previewInvoice: 'Náhľad faktúry',
    confirmPayment: 'Potvrdiť platbu',
    paid: 'Zaplatené',
    unpaid: 'Nezaplatené',
    refunded: 'Vrátené',
    
    // Calendar Page
    calendarView: 'Kalendárový pohľad',
    trackAllocations: 'Sledovanie pridelení áut, rezervácií a plánov údržby.',
    month: 'Mesiac',
    week: 'Týždeň',
    today: 'Dnes',
    
    // Settings Page
    systemSettings: 'Systémové nastavenia',
    configureSettings: 'Konfigurovať systémové nastavenia, obchodné pravidlá a predvoľby aplikácie.',
    businessHours: 'Pracovné hodiny a prevádzkové nastavenia',
    pricingRules: 'Cenové pravidlá a konfigurácia daní',
    notifications: 'Predvoľby oznámení',
    userRoles: 'Používateľské role a oprávnenia',
    underDevelopment: 'Táto stránka bude obsahovať možnosti konfigurácie systému vrátane:',
    
    // Customer Portal
    welcomeUser: 'Vitajte, {name}!',
    customerPortal: 'Zákaznícky portál',
    myReservations: 'Moje rezervácie',
    viewManageReservations: 'Zobraziť a spravovať vaše rezervácie áut',
    rentalHistory: 'História prenájmov',
    viewPastRentals: 'Zobraziť vaše minulé prenájmy áut',
    profileSettings: 'Nastavenia profilu',
    updatePersonalInfo: 'Aktualizovať vaše osobné údaje',
    paymentMethods: 'Spôsoby platby',
    managePaymentMethods: 'Spravovať vaše spôsoby platby',
    comingSoon: 'Už čoskoro',
    accessFeature: 'Prístup k funkcii',
    customerPortalDev: 'Zákaznícky portál v štádiu vývoja',
    demoApplication: 'Toto je demo aplikácia prezentujúca riadenie prístupu podľa rolí. Funkcie zákazníckeho portálu sú momentálne vo vývoji.',
    yourAccountDetails: 'Detaily vášho účtu',
    accountStatus: 'Stav účtu',
    accountActive: 'Aktívny',
    accountInactive: 'Neaktívny',
    roleLabel: 'Rola',
    
    // Common Actions
    save: 'Uložiť',
    cancel: 'Zrušiť',
    delete: 'Vymazať',
    edit: 'Upraviť',
    view: 'Zobraziť',
    add: 'Pridať',
    search: 'Hľadať',
    filter: 'Filtrovať',
    export: 'Exportovať',
    import: 'Importovať',
    print: 'Tlačiť',
    refresh: 'Obnoviť',
    back: 'Späť',
    next: 'Ďalej',
    previous: 'Predchádzajúci',
    close: 'Zavrieť',
    open: 'Otvoriť',
    submit: 'Odoslať',
    reset: 'Resetovať',
    clear: 'Vyčistiť',
    
    // Form Validation
    required: 'Toto pole je povinné',
    invalidEmail: 'Neplatná e-mailová adresa',
    invalidPhone: 'Neplatné telefónne číslo',
    invalidDate: 'Neplatný dátum',
    passwordTooShort: 'Heslo musí mať aspoň 6 znakov',
    passwordsDoNotMatch: 'Heslá sa nezhodujú',
    startDateRequired: 'Dátum začiatku je povinný',
    endDateRequired: 'Dátum ukončenia je povinný',
    endDateAfterStart: 'Dátum ukončenia musí byť po dátume začiatku',
    startDateNotPast: 'Dátum začiatku nemôže byť v minulosti',
    customer_required: 'Zákazník je povinný',
    car_required: 'Auto je povinné',
    start_date_required: 'Dátum začiatku je povinný',
    end_date_required: 'Dátum ukončenia je povinný',
    end_date_must_be_after_start_date: 'Dátum ukončenia musí byť po dátume začiatku',
    pickup_location_required: 'Miesto vyzdvihnutia je povinné',
    dropoff_location_required: 'Miesto vrátenia je povinné',
    start_date_cannot_be_in_the_past: 'Dátum začiatku nemôže byť v minulosti',
    an_error_occurred_while_saving_the_reservation_please_check_the_console_for_details: 'Vyskytla sa chyba pri ukladaní rezervácie. Skontrolujte konzolu pre podrobnosti.',
    
    // Status Messages
    success: 'Úspech',
    error: 'Chyba',
    warning: 'Upozornenie',
    info: 'Informácia',
    loading: 'Načítava sa...',
    noData: 'Žiadne údaje',
    noResults: 'Žiadne výsledky',
    
    // Confirmations
    confirmDelete: 'Ste si istí, že chcete vymazať túto položku?',
    confirmCancel: 'Ste si istí, že chcete zrušiť? Všetky neuložené zmeny budú stratené.',
    unsavedChanges: 'Máte neuložené zmeny. Chcete pokračovať?',
    
    // Dashboard specific messages
    welcomeBackMessage: 'Vitajte späť! Tu je to, čo sa deje s vaším prenájmom áut dnes.',
    vsLastMonth: 'vs minulý mesiac',
    revenue: 'Tržby',
    
    // Time and Date
    days: 'dní',
    hours: 'hodín',
    minutes: 'minút',
    seconds: 'sekúnd',
    
    // Numbers
    total: 'Celkom',
    subtotal: 'Medzisúčet',
    tax: 'Daň',
    discount: 'Zľava',
    
    // Location
    locationName: 'Názov lokácie',
    addressDetails: 'Detaily adresy',
    
    // Insurance
    insuranceProvider: 'Poskytovateľ poistenia',
    policyNumber: 'Číslo poistky',
    expiryDate: 'Dátum ukončenia platnosti',
    coverageAmount: 'Výška krytia',
    
    // Maintenance
    lastServiceDate: 'Dátum posledného servisu',
    nextServiceDate: 'Dátum ďalšieho servisu',
    nextServiceMileage: 'Ďalší servis pri km',
    maintenanceNotes: 'Poznámky k údržbe',
    
    // File Upload
    uploadImages: 'Nahrať obrázky',
    selectFiles: 'Vybrať súbory',
    dragDropFiles: 'Pretiahnite súbory sem alebo kliknite pre výber',
    supportedFormats: 'Podporované formáty',
    maxFileSize: 'Maximálna veľkosť súboru',
    
    // Roles
    role: 'Rola',
    staff: 'Personál'
  }
}

// Get translation function
export const t = (key, language = 'sk', params = {}) => {
  let translation = translations[language]?.[key] || key
  
  // Replace parameters in translation
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{${param}}`, params[param])
  })
  
  return translation
}

// Export translations object for direct access
export default translations 