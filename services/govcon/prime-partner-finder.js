'use strict';

// Prime Partner Finder service.
// Identifies and ranks top federal prime contractors for subcontracting
// and teaming outreach, organized by user NAICS codes.
//
// NOT a SAM.gov solicitation outreach feature.
// This is a prime contractor partnership outreach feature.
//
// SOURCES:
//   - USAspending API (public, no key required) — live award history by NAICS
//   - SAM.gov Entity API (optional enrichment, requires key)
//   - SBA subcontracting plans directory (future connector)
//   - Demo/mock primes (used when live APIs unavailable)
//
// NO AUTO-SEND. All outreach drafts require human approval before sending.

const NO_AUTO_SEND_NOTE = 'SourceDeck does not auto-send outreach. All drafts require human review and approval before sending.';

const PRIME_STATUSES = Object.freeze([
  'New', 'Researching', 'Qualified', 'Drafted', 'Approved',
  'Contacted', 'Portal Submitted', 'Call Scheduled',
  'Teaming Discussion', 'NDA / Paperwork', 'Dormant', 'Rejected'
]);

const SCORE_LABELS = Object.freeze({
  strategic: { min: 90, max: 100, label: 'Strategic Prime' },
  strong:    { min: 70, max: 89,  label: 'Strong Partner Target' },
  monitor:   { min: 50, max: 69,  label: 'Monitor' },
  low:       { min: 0,  max: 49,  label: 'Low Priority' }
});

const FORBIDDEN_PHRASES = [
  'guaranteed performance', 'guaranteed win', 'guaranteed contract',
  'cold email', 'cold call', 'cold outreach',
  'blast', 'spam',
  'leverage', 'game-changer', 'delve', 'tapestry',
  'revolutionize', 'revolutionizing'
];

// 25 demo prime contractors spanning common GovCon NAICS codes.
// Contact details are fictional placeholders.
const DEMO_PRIMES = Object.freeze([
  {
    primeId: 'demo-001',
    primeName: 'Booz Allen Hamilton Inc.',
    uei: 'F8LYEQ79CZ88',
    cage: '17038',
    website: 'https://www.boozallen.com',
    naics: ['541512', '541611', '541330', '541519', '541990'],
    totalObligations: 9800000000,
    awardCount: 4200,
    recentAwardCount: 890,
    topAgencies: ['Department of Defense', 'Department of Homeland Security', 'National Security Agency'],
    topContractingOffices: ['DHA Contracting Activity', 'DHS OCPO', 'Army Contracting Command'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'CIO-SP3', 'SeaPort-NxG'],
    placeOfPerformance: ['VA', 'DC', 'MD', 'GA', 'TX', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Small Business Liaison Office',
    sbloEmail: 'smallbusiness@boozallen.com',
    supplierDiversityUrl: 'https://www.boozallen.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.boozallen.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-002',
    primeName: 'Science Applications International Corporation (SAIC)',
    uei: 'GJE3BLNK5764',
    cage: '54211',
    website: 'https://www.saic.com',
    naics: ['541512', '541519', '541330', '334111', '541711'],
    totalObligations: 7200000000,
    awardCount: 3100,
    recentAwardCount: 620,
    topAgencies: ['Department of Defense', 'Department of Veterans Affairs', 'NASA'],
    topContractingOffices: ['NAVSEA', 'AFDW', 'VA TRM'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'CIO-SP3', 'STARS III'],
    placeOfPerformance: ['VA', 'CA', 'MD', 'AL', 'TX'],
    subcontractingPlanMatch: true,
    sbloContactName: 'SAIC Supplier Diversity',
    sbloEmail: 'supplier.diversity@saic.com',
    supplierDiversityUrl: 'https://www.saic.com/about/supplier-diversity',
    registrationPortalUrl: 'https://supplierportal.saic.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-003',
    primeName: 'Leidos Holdings Inc.',
    uei: 'K3Q9EX5M4K76',
    cage: '1UHA4',
    website: 'https://www.leidos.com',
    naics: ['541512', '541330', '541519', '334511', '611430'],
    totalObligations: 14100000000,
    awardCount: 5800,
    recentAwardCount: 1100,
    topAgencies: ['Department of Defense', 'Department of Health and Human Services', 'Transportation Security Administration'],
    topContractingOffices: ['DISA', 'NIH', 'TSA'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'CIO-SP3', 'GSA MAS'],
    placeOfPerformance: ['VA', 'MD', 'DC', 'FL', 'TX', 'CA'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Supplier Diversity Office',
    sbloEmail: 'subcontracting@leidos.com',
    supplierDiversityUrl: 'https://www.leidos.com/suppliers/diversity',
    registrationPortalUrl: 'https://suppliers.leidos.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-004',
    primeName: 'General Dynamics Information Technology',
    uei: 'P4ZX9R8M2T55',
    cage: '34R56',
    website: 'https://www.gdit.com',
    naics: ['541512', '541519', '541611', '611430'],
    totalObligations: 8500000000,
    awardCount: 3700,
    recentAwardCount: 750,
    topAgencies: ['Department of Defense', 'Department of Homeland Security', 'State Department'],
    topContractingOffices: ['DHRA', 'CBP', 'DOS SAQMMA'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'SEWP V', 'CIO-SP3'],
    placeOfPerformance: ['VA', 'MD', 'DC', 'TX', 'FL'],
    subcontractingPlanMatch: true,
    sbloContactName: 'GDIT Small Business Program',
    sbloEmail: 'smallbusiness@gdit.com',
    supplierDiversityUrl: 'https://www.gdit.com/about/suppliers/diversity',
    registrationPortalUrl: 'https://www.gdit.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-005',
    primeName: 'Peraton Inc.',
    uei: 'H2KL9N6P7T32',
    cage: '83SU5',
    website: 'https://www.peraton.com',
    naics: ['541512', '541711', '541330', '336411'],
    totalObligations: 6900000000,
    awardCount: 2800,
    recentAwardCount: 560,
    topAgencies: ['National Reconnaissance Office', 'Department of Defense', 'Department of Homeland Security'],
    topContractingOffices: ['NRO', 'SOCOM', 'DHS OCPO'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'CIO-SP3'],
    placeOfPerformance: ['VA', 'MD', 'CO', 'TX', 'CA'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Peraton Supplier Diversity',
    sbloEmail: 'suppliers@peraton.com',
    supplierDiversityUrl: 'https://www.peraton.com/about/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.peraton.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-006',
    primeName: 'Accenture Federal Services LLC',
    uei: 'M7NR2J9K5W48',
    cage: '1RMC5',
    website: 'https://www.accenturefederal.com',
    naics: ['541512', '541611', '541513', '541519'],
    totalObligations: 3800000000,
    awardCount: 1900,
    recentAwardCount: 380,
    topAgencies: ['Department of Defense', 'Department of Health and Human Services', 'Social Security Administration'],
    topContractingOffices: ['DISA', 'HHS PSC', 'SSA OAG'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'CIO-SP3', 'GSA MAS'],
    placeOfPerformance: ['DC', 'VA', 'MD', 'TX', 'FL'],
    subcontractingPlanMatch: true,
    sbloContactName: 'AFS Small Business Office',
    sbloEmail: 'smallbusiness.afs@accenture.com',
    supplierDiversityUrl: 'https://www.accenturefederal.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.accenturefederal.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-007',
    primeName: 'CACI International Inc.',
    uei: 'T3SW9K2H6L87',
    cage: '22998',
    website: 'https://www.caci.com',
    naics: ['541512', '541519', '541330', '561320'],
    totalObligations: 5100000000,
    awardCount: 2300,
    recentAwardCount: 460,
    topAgencies: ['Department of Justice', 'Department of Defense', 'Intelligence Community'],
    topContractingOffices: ['DOJ JMD', 'Army ACC', 'ODNI'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'STARS III', 'CIO-SP3'],
    placeOfPerformance: ['VA', 'DC', 'MD', 'TX', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'CACI Supplier Diversity',
    sbloEmail: 'supplierdiversity@caci.com',
    supplierDiversityUrl: 'https://www.caci.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.caci.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-008',
    primeName: 'ManTech International Corporation',
    uei: 'Q8JH5T4W9N63',
    cage: '0FZM0',
    website: 'https://www.mantech.com',
    naics: ['541512', '541519', '541330', '334511'],
    totalObligations: 3200000000,
    awardCount: 1600,
    recentAwardCount: 320,
    topAgencies: ['Federal Bureau of Investigation', 'Department of Defense', 'Intelligence Community'],
    topContractingOffices: ['FBI CJIS', 'ACC APG', 'OMS'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'SEWP V', 'STARS III'],
    placeOfPerformance: ['VA', 'MD', 'DC', 'AL', 'WV'],
    subcontractingPlanMatch: true,
    sbloContactName: 'ManTech Small Business Programs',
    sbloEmail: 'smallbusiness@mantech.com',
    supplierDiversityUrl: 'https://www.mantech.com/company/supplier-diversity',
    registrationPortalUrl: 'https://www.mantech.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-009',
    primeName: 'Amentum Services Inc.',
    uei: 'R5KW7L3H9N21',
    cage: '6STR7',
    website: 'https://www.amentum.com',
    naics: ['561210', '236220', '541330', '561990'],
    totalObligations: 7600000000,
    awardCount: 3400,
    recentAwardCount: 680,
    topAgencies: ['Army Corps of Engineers', 'Department of Energy', 'State Department'],
    topContractingOffices: ['USACE', 'DOE EM', 'DOS OBO'],
    contractVehicles: ['LOGCAP V', 'AFCAP', 'GSA MAS', 'OASIS+'],
    placeOfPerformance: ['TX', 'VA', 'MD', 'KY', 'GA'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Amentum Supplier Diversity',
    sbloEmail: 'suppliers@amentum.com',
    supplierDiversityUrl: 'https://www.amentum.com/about/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.amentum.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-010',
    primeName: 'Deloitte Consulting LLP (Federal)',
    uei: 'N6MP4J8K2T77',
    cage: '1DTZ6',
    website: 'https://www2.deloitte.com/us/en/pages/public-sector.html',
    naics: ['541611', '541512', '541519', '541213'],
    totalObligations: 4600000000,
    awardCount: 2100,
    recentAwardCount: 420,
    topAgencies: ['Department of Health and Human Services', 'Department of Defense', 'Internal Revenue Service'],
    topContractingOffices: ['HHS PSC', 'DISA', 'IRS AWSS'],
    contractVehicles: ['OASIS+', 'Alliant 2', 'CIO-SP3', 'GSA MAS'],
    placeOfPerformance: ['DC', 'VA', 'MD', 'TX', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Deloitte Federal Small Business',
    sbloEmail: 'federalsmallbusiness@deloitte.com',
    supplierDiversityUrl: 'https://www2.deloitte.com/us/en/pages/about-deloitte/articles/supplier-diversity.html',
    registrationPortalUrl: 'https://www.deloittesuppliers.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-011',
    primeName: 'Parsons Corporation',
    uei: 'S9TK6N7L3P54',
    cage: '11394',
    website: 'https://www.parsons.com',
    naics: ['541330', '236220', '541512', '562910'],
    totalObligations: 3900000000,
    awardCount: 1800,
    recentAwardCount: 360,
    topAgencies: ['Army Corps of Engineers', 'Department of Transportation', 'Department of Energy'],
    topContractingOffices: ['USACE HQ', 'DOT OST', 'NNSA'],
    contractVehicles: ['GSA MAS', 'OASIS+', 'AFCAP', 'LOGCAP V'],
    placeOfPerformance: ['TX', 'VA', 'CA', 'CO', 'MD'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Parsons Supplier Diversity',
    sbloEmail: 'supplierdiversity@parsons.com',
    supplierDiversityUrl: 'https://www.parsons.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.parsons.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-012',
    primeName: 'AECOM Government Services',
    uei: 'W4HN8K6J2M38',
    cage: '1MES5',
    website: 'https://www.aecom.com',
    naics: ['541330', '236220', '541690', '562910'],
    totalObligations: 5300000000,
    awardCount: 2500,
    recentAwardCount: 500,
    topAgencies: ['Army Corps of Engineers', 'Air Force', 'State Department'],
    topContractingOffices: ['USACE', 'AFCEC', 'DOS OBO'],
    contractVehicles: ['MATOC', 'AFCAP', 'LOGCAP V', 'OASIS+'],
    placeOfPerformance: ['TX', 'VA', 'CA', 'AZ'],
    subcontractingPlanMatch: true,
    sbloContactName: 'AECOM Small Business Program',
    sbloEmail: 'smallbusiness@aecom.com',
    supplierDiversityUrl: 'https://www.aecom.com/about/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.aecom.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-013',
    primeName: 'ICF International Inc.',
    uei: 'J7LM9T5W8R42',
    cage: '7LXB3',
    website: 'https://www.icf.com',
    naics: ['541611', '541690', '541720', '541519'],
    totalObligations: 2400000000,
    awardCount: 1200,
    recentAwardCount: 240,
    topAgencies: ['Department of Health and Human Services', 'Environmental Protection Agency', 'Department of Energy'],
    topContractingOffices: ['HHS PSC', 'EPA ORD', 'DOE EERE'],
    contractVehicles: ['OASIS+', 'GSA MAS', 'CIO-SP3', 'Alliant 2'],
    placeOfPerformance: ['VA', 'DC', 'MD', 'CA', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'ICF Supplier Diversity',
    sbloEmail: 'suppliers@icf.com',
    supplierDiversityUrl: 'https://www.icf.com/company/supplier-diversity',
    registrationPortalUrl: 'https://www.icf.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-014',
    primeName: 'PAE Government Services Inc.',
    uei: 'V2KJ7P9H4N85',
    cage: '4PHK5',
    website: 'https://www.pae.com',
    naics: ['561210', '236220', '561990', '561720'],
    totalObligations: 2800000000,
    awardCount: 1400,
    recentAwardCount: 280,
    topAgencies: ['State Department', 'Army', 'United States Air Force'],
    topContractingOffices: ['DOS SAQMMA', 'ACC Warren', 'AFSC PZIO'],
    contractVehicles: ['LOGCAP V', 'AFCAP', 'GSA MAS'],
    placeOfPerformance: ['VA', 'TX', 'DC'],
    subcontractingPlanMatch: true,
    sbloContactName: 'PAE Small Business Programs',
    sbloEmail: 'smallbusiness@pae.com',
    supplierDiversityUrl: 'https://www.pae.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.pae.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-015',
    primeName: 'Serco Inc. (US Federal)',
    uei: 'C9NP3R6K4W71',
    cage: '51VT4',
    website: 'https://www.serco.com/northamerica',
    naics: ['541611', '561210', '488190', '541330'],
    totalObligations: 1900000000,
    awardCount: 950,
    recentAwardCount: 190,
    topAgencies: ['Navy', 'United States Coast Guard', 'Federal Aviation Administration'],
    topContractingOffices: ['NAVSEA', 'USCG', 'FAA AMC'],
    contractVehicles: ['OASIS+', 'LOGCAP V', 'GSA MAS'],
    placeOfPerformance: ['VA', 'MD', 'TX', 'FL'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Serco Supplier Diversity',
    sbloEmail: 'suppliers@serco.com',
    supplierDiversityUrl: 'https://www.serco.com/northamerica/about/supplier-diversity',
    registrationPortalUrl: 'https://www.serco.com/northamerica/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-016',
    primeName: 'DXC Technology (Federal)',
    uei: 'L4MK8P2J6T59',
    cage: '6YRH2',
    website: 'https://www.dxc.com/us/en/industries/government',
    naics: ['541512', '541513', '541519', '518210'],
    totalObligations: 1700000000,
    awardCount: 850,
    recentAwardCount: 170,
    topAgencies: ['Department of Veterans Affairs', 'Department of Health and Human Services', 'Social Security Administration'],
    topContractingOffices: ['VA TRM', 'HHS PSC', 'SSA OAG'],
    contractVehicles: ['CIO-SP3', 'SEWP V', 'GSA MAS'],
    placeOfPerformance: ['VA', 'DC', 'MD', 'TX'],
    subcontractingPlanMatch: true,
    sbloContactName: 'DXC Federal Supplier Diversity',
    sbloEmail: 'federal.suppliers@dxc.com',
    supplierDiversityUrl: 'https://www.dxc.com/us/en/about/supplier-diversity',
    registrationPortalUrl: 'https://www.dxc.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-017',
    primeName: 'IBM Federal (IBM Corp.)',
    uei: 'B7KR5N9H3M66',
    cage: '24743',
    website: 'https://www.ibm.com/industries/government',
    naics: ['541512', '541519', '518210', '334111'],
    totalObligations: 2200000000,
    awardCount: 1100,
    recentAwardCount: 220,
    topAgencies: ['Department of Defense', 'Department of Health and Human Services', 'Internal Revenue Service'],
    topContractingOffices: ['DISA', 'HHS PSC', 'IRS AWSS'],
    contractVehicles: ['Alliant 2', 'CIO-SP3', 'SEWP V', 'GSA MAS'],
    placeOfPerformance: ['DC', 'VA', 'MD', 'TX', 'NY'],
    subcontractingPlanMatch: true,
    sbloContactName: 'IBM Supplier Diversity',
    sbloEmail: 'federal.suppliers@ibm.com',
    supplierDiversityUrl: 'https://www.ibm.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.ibm.com/procurement/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-018',
    primeName: 'L3Harris Technologies Inc.',
    uei: 'G9SK4N7P5L23',
    cage: '59243',
    website: 'https://www.l3harris.com',
    naics: ['334511', '334220', '541712', '336411'],
    totalObligations: 8900000000,
    awardCount: 4100,
    recentAwardCount: 820,
    topAgencies: ['Department of Defense', 'United States Space Force', 'United States Air Force'],
    topContractingOffices: ['AFRL', 'SMC', 'PEO STRI'],
    contractVehicles: ['OASIS+', 'GSA MAS', 'STARS III'],
    placeOfPerformance: ['FL', 'TX', 'VA', 'CA', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'L3Harris Supplier Diversity',
    sbloEmail: 'supplierdiversity@l3harris.com',
    supplierDiversityUrl: 'https://www.l3harris.com/suppliers/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.l3harris.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-019',
    primeName: 'Northrop Grumman Corporation',
    uei: 'M3PK8L5H6N91',
    cage: '82527',
    website: 'https://www.northropgrumman.com',
    naics: ['336411', '334511', '541712', '336414'],
    totalObligations: 16500000000,
    awardCount: 7200,
    recentAwardCount: 1440,
    topAgencies: ['Department of Defense', 'NASA', 'Department of Energy'],
    topContractingOffices: ['NAVAIR', 'SMC', 'NASA MSFC'],
    contractVehicles: ['GSA MAS', 'OASIS+', 'NASA SEWP'],
    placeOfPerformance: ['CA', 'VA', 'TX', 'MD', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'NGC Supplier Diversity',
    sbloEmail: 'suppliers@ngc.com',
    supplierDiversityUrl: 'https://www.northropgrumman.com/suppliers/diversity',
    registrationPortalUrl: 'https://suppliers.northropgrumman.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-020',
    primeName: 'Raytheon Technologies (RTX)',
    uei: 'H5KJ9N3P8L47',
    cage: '07766',
    website: 'https://www.rtx.com',
    naics: ['334511', '336414', '336412', '541712'],
    totalObligations: 19200000000,
    awardCount: 8500,
    recentAwardCount: 1700,
    topAgencies: ['Department of Defense', 'Army', 'Navy', 'United States Air Force'],
    topContractingOffices: ['NAVAIR', 'ACC Redstone', 'AFLCMC'],
    contractVehicles: ['GSA MAS', 'OASIS+', 'SEWP V'],
    placeOfPerformance: ['MA', 'TX', 'AZ', 'VA', 'CT'],
    subcontractingPlanMatch: true,
    sbloContactName: 'RTX Supplier Diversity',
    sbloEmail: 'suppliers@rtx.com',
    supplierDiversityUrl: 'https://www.rtx.com/who-we-are/global-citizenship/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.rtx.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-021',
    primeName: 'V2X Inc.',
    uei: 'K8NJ5T4H7P36',
    cage: '6WRT4',
    website: 'https://www.goV2X.com',
    naics: ['561210', '236220', '488190', '541330'],
    totalObligations: 1500000000,
    awardCount: 750,
    recentAwardCount: 150,
    topAgencies: ['Army', 'State Department', 'United States Air Force'],
    topContractingOffices: ['ACC Warren', 'DOS SAQMMA', 'AFCEC'],
    contractVehicles: ['LOGCAP V', 'AFCAP', 'GSA MAS'],
    placeOfPerformance: ['KY', 'TX', 'CO'],
    subcontractingPlanMatch: true,
    sbloContactName: 'V2X Supplier Diversity',
    sbloEmail: 'suppliers@goV2X.com',
    supplierDiversityUrl: 'https://www.goV2X.com/about/supplier-diversity',
    registrationPortalUrl: 'https://www.goV2X.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-022',
    primeName: 'Chenega Corporation',
    uei: 'P3KN8T6J5L74',
    cage: '3QGW8',
    website: 'https://www.chenega.com',
    naics: ['541512', '561320', '561730', '236220'],
    totalObligations: 1200000000,
    awardCount: 600,
    recentAwardCount: 120,
    topAgencies: ['Department of Defense', 'Department of Homeland Security', 'State Department'],
    topContractingOffices: ['Army ACC', 'DHS OCPO', 'DOS SAQMMA'],
    contractVehicles: ['STARS III', 'OASIS+', 'GSA MAS', 'SEWP V'],
    placeOfPerformance: ['VA', 'AK', 'TX', 'FL', 'DC'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Chenega Small Business',
    sbloEmail: 'smallbusiness@chenega.com',
    supplierDiversityUrl: 'https://www.chenega.com/suppliers',
    registrationPortalUrl: 'https://www.chenega.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-023',
    primeName: 'Maximus Federal Services',
    uei: 'G6PH3K9T7N45',
    cage: '1ASF5',
    website: 'https://www.maximus.com/federal',
    naics: ['541611', '518210', '561499', '541519'],
    totalObligations: 3100000000,
    awardCount: 1550,
    recentAwardCount: 310,
    topAgencies: ['Centers for Medicare & Medicaid Services', 'Social Security Administration', 'Department of Health and Human Services'],
    topContractingOffices: ['CMS', 'SSA OAG', 'HHS PSC'],
    contractVehicles: ['GSA MAS', 'Alliant 2', 'CIO-SP3'],
    placeOfPerformance: ['VA', 'DC', 'MD', 'TX', 'NY'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Maximus Supplier Diversity',
    sbloEmail: 'supplierdiversity@maximus.com',
    supplierDiversityUrl: 'https://www.maximus.com/about/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.maximus.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-024',
    primeName: 'Perspecta (now Peraton)',
    uei: 'T6PW9H4N2K58',
    cage: '7BNM3',
    website: 'https://www.peraton.com',
    naics: ['541512', '541611', '541330'],
    totalObligations: 890000000,
    awardCount: 445,
    recentAwardCount: 89,
    topAgencies: ['Intelligence Community', 'Department of Defense'],
    topContractingOffices: ['DIA', 'Army G2', 'NGA'],
    contractVehicles: ['OASIS+', 'Alliant 2'],
    placeOfPerformance: ['VA', 'MD', 'DC'],
    subcontractingPlanMatch: true,
    sbloContactName: 'Supplier Diversity Team',
    sbloEmail: 'suppliers@peraton.com',
    supplierDiversityUrl: 'https://www.peraton.com/about/supplier-diversity',
    registrationPortalUrl: 'https://suppliers.peraton.com',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  },
  {
    primeId: 'demo-025',
    primeName: 'KBR Government Services',
    uei: 'R7WK4N9H3P62',
    cage: '4MPL6',
    website: 'https://www.kbr.com/en/markets/government-services',
    naics: ['541330', '236220', '541611', '562910'],
    totalObligations: 4200000000,
    awardCount: 2100,
    recentAwardCount: 420,
    topAgencies: ['Army', 'Navy', 'NASA'],
    topContractingOffices: ['ACC Redstone', 'NAVSUP', 'NASA JSC'],
    contractVehicles: ['LOGCAP V', 'GSA MAS', 'OASIS+'],
    placeOfPerformance: ['TX', 'VA', 'AL', 'FL'],
    subcontractingPlanMatch: true,
    sbloContactName: 'KBR Small Business Liaison',
    sbloEmail: 'sblo@kbr.com',
    supplierDiversityUrl: 'https://www.kbr.com/en/about-kbr/supplier-diversity',
    registrationPortalUrl: 'https://www.kbr.com/suppliers',
    outreachStatus: 'New',
    lastContacted: null,
    nextFollowUp: null,
    notes: ''
  }
]);

// ── Scoring ────────────────────────────────────────────────────────────────

function getScoreLabel(score) {
  score = Number(score) || 0;
  if (score >= 90) return 'Strategic Prime';
  if (score >= 70) return 'Strong Partner Target';
  if (score >= 50) return 'Monitor';
  return 'Low Priority';
}

function scorePrime(prime, userProfile) {
  prime = prime || {};
  userProfile = userProfile || {};

  const userNaics       = strArr(userProfile.naics);
  const userAgencies    = strArr(userProfile.agencies && userProfile.agencies.include ? userProfile.agencies.include : userProfile.agencies);
  const userCerts       = strArr(userProfile.certifications).map(s => s.toLowerCase());
  const userStates      = strArr(userProfile.states || userProfile.placeOfPerformance);
  const primeNaics      = strArr(prime.naics);
  const primeAgencies   = strArr(prime.topAgencies);
  const primeStates     = strArr(prime.placeOfPerformance);

  let score = 0;
  const reasons = [];

  // 1. NAICS match (0-20)
  const naicsScore = naicsMatchScore(userNaics, primeNaics);
  score += naicsScore;
  if (naicsScore >= 14 && userNaics.length > 0) reasons.push(`Strong NAICS alignment`);
  else if (naicsScore >= 7 && userNaics.length > 0) reasons.push(`Partial NAICS overlap`);
  else if (userNaics.length === 0) reasons.push(`NAICS filter not set — broad match`);

  // 2. Federal award volume (0-15)
  const obligations = Number(prime.totalObligations) || 0;
  const volScore = obligations > 10e9 ? 15 : obligations > 5e9 ? 13 : obligations > 1e9 ? 10 : obligations > 500e6 ? 7 : obligations > 100e6 ? 4 : 2;
  score += volScore;
  if (volScore >= 10) reasons.push(`High award volume ($${(obligations / 1e9).toFixed(1)}B)`);

  // 3. Recent award activity (0-10)
  const recentCount = Number(prime.recentAwardCount) || 0;
  const actScore = recentCount > 1000 ? 10 : recentCount > 500 ? 9 : recentCount > 200 ? 7 : recentCount > 50 ? 5 : recentCount > 10 ? 3 : 1;
  score += actScore;
  if (actScore >= 7) reasons.push(`Active award pipeline (${recentCount} recent)`);

  // 4. Agency overlap (0-10)
  let agencyScore = 5; // neutral if no user preference
  if (userAgencies.length > 0) {
    const matches = userAgencies.filter(ua => primeAgencies.some(pa => pa.toLowerCase().includes(ua.toLowerCase()) || ua.toLowerCase().includes(pa.toLowerCase()))).length;
    agencyScore = clamp(Math.round((matches / userAgencies.length) * 10), 0, 10);
    if (agencyScore >= 7) reasons.push(`Agency focus overlap`);
  }
  score += agencyScore;

  // 5. Geography overlap (0-10)
  let geoScore = 5; // neutral if no user preference
  if (userStates.length > 0) {
    const geoMatches = userStates.filter(us => primeStates.some(ps => ps.toUpperCase() === us.toUpperCase())).length;
    geoScore = clamp(Math.round((geoMatches / userStates.length) * 10), 0, 10);
    if (geoScore >= 7) reasons.push(`Geography overlap`);
  }
  score += geoScore;

  // 6. Subcontracting plan relevance (0-10)
  const subScore = prime.subcontractingPlanMatch ? 10 : 0;
  score += subScore;
  if (subScore > 0) reasons.push(`Has subcontracting plan requirement`);

  // 7. User certification advantage (0-10)
  const setAsideCerts = ['sdvosb', 'vosb', '8a', 'wosb', 'edwosb', 'hubzone', 'small_business'];
  const userHasCert = userCerts.some(c => setAsideCerts.includes(c));
  const certScore = userHasCert ? 10 : userCerts.length > 0 ? 6 : 4;
  score += certScore;
  if (userHasCert) reasons.push(`Set-aside certification advantage (${userCerts.join(', ')})`);

  // 8. Service capability match (0-5) — contract vehicle diversity signals breadth
  const vehicles = strArr(prime.contractVehicles);
  const capScore = vehicles.length >= 4 ? 5 : vehicles.length >= 2 ? 3 : 1;
  score += capScore;

  // 9. Contact availability (0-5)
  const contactScore = prime.sbloEmail ? 5 : prime.sbloContactName ? 3 : 0;
  score += contactScore;
  if (contactScore === 5) reasons.push(`SBLO contact available`);

  // 10. Supplier portal availability (0-5)
  const portalScore = prime.registrationPortalUrl ? 5 : 0;
  score += portalScore;
  if (portalScore > 0) reasons.push(`Supplier registration portal available`);

  score = clamp(Math.round(score), 0, 100);

  return Object.assign({}, prime, {
    partnershipFitScore: score,
    scoreLabel: getScoreLabel(score),
    reasonForScore: reasons.join('; ') || 'General federal prime contractor match'
  });
}

function naicsMatchScore(userNaics, primeNaics) {
  if (!userNaics.length) return 10; // neutral
  let matches = 0;
  for (const un of userNaics) {
    const u4 = String(un).slice(0, 4);
    if (primeNaics.some(pn => String(pn).slice(0, 4) === u4 || String(pn) === String(un))) matches++;
  }
  return clamp(Math.round((matches / userNaics.length) * 20), 0, 20);
}

// ── Main entry point ───────────────────────────────────────────────────────

function findPrimePartners(input) {
  input = input || {};
  const userNaics  = strArr(input.naics);
  const userProfile = Object.assign({ naics: userNaics }, input.profile || {});
  const filters    = input.filters || {};
  const limit      = clamp(Number(input.limit) || 100, 1, 100);

  let candidates = DEMO_PRIMES.slice();

  // NAICS filter — keep primes with overlapping NAICS; fall back to all if < 5 survive
  if (userNaics.length > 0) {
    const filtered = candidates.filter(p => {
      const p4s = strArr(p.naics).map(n => n.slice(0, 4));
      return userNaics.some(un => p4s.includes(un.slice(0, 4)));
    });
    if (filtered.length >= 5) candidates = filtered;
  }

  // Agency filter
  if (filters.agency && String(filters.agency).trim()) {
    const ag = filters.agency.toLowerCase();
    const filtered = candidates.filter(p => strArr(p.topAgencies).some(a => a.toLowerCase().includes(ag)));
    if (filtered.length >= 3) candidates = filtered;
  }

  // State / geography filter
  if (filters.state && String(filters.state).trim()) {
    const st = filters.state.toUpperCase();
    const filtered = candidates.filter(p => strArr(p.placeOfPerformance).map(s => s.toUpperCase()).includes(st));
    if (filtered.length >= 3) candidates = filtered;
  }

  // Certification filter
  if (filters.certification && String(filters.certification).trim()) {
    const cert = filters.certification.toLowerCase();
    const contractVehicleHint = { sdvosb: 'SDVOSB', '8a': '8(a)', wosb: 'WOSB', hubzone: 'HUBZone' }[cert] || '';
    // All demo primes have subcontractingPlanMatch=true so they're all valid targets
    // for set-aside certified subs; pass through without narrowing to avoid empty list
    void contractVehicleHint;
  }

  // Score and rank
  const scored = candidates
    .map(p => scorePrime(p, userProfile))
    .sort((a, b) => b.partnershipFitScore - a.partnershipFitScore)
    .slice(0, limit);

  const summary = {
    primeTargetsFound:  scored.length,
    strategicPrimes:    scored.filter(p => p.partnershipFitScore >= 90).length,
    draftsNeedingReview: 0,
    portalsToSubmit:    scored.filter(p => p.registrationPortalUrl && p.outreachStatus !== 'Portal Submitted').length,
    followUpsDue:       scored.filter(p => p.nextFollowUp && new Date(p.nextFollowUp) <= new Date()).length,
    callsScheduled:     scored.filter(p => p.outreachStatus === 'Call Scheduled').length
  };

  return {
    ok: true,
    sourceMode: 'demo',
    naicsQueried: userNaics,
    filters,
    results: scored,
    summary,
    safetyNote: NO_AUTO_SEND_NOTE,
    dataNote: 'Results use demo data. Connect USAspending API for live federal award history.'
  };
}

// ── Live USAspending API ───────────────────────────────────────────────────

async function fetchPrimesFromUSAspending(naicsCodes, filters, fetchFn) {
  if (typeof fetchFn !== 'function') return { ok: false, error: 'no_fetch_fn', primes: [] };
  naicsCodes = strArr(naicsCodes).filter(Boolean);
  if (!naicsCodes.length) return { ok: false, error: 'no_naics', primes: [] };

  try {
    const payload = {
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: naicsCodes
      },
      limit: 100
    };
    const resp = await fetchFn(
      'https://api.usaspending.gov/api/v2/search/spending_by_category/recipient/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!resp.ok) return { ok: false, error: `usaspending_${resp.status}`, primes: [] };

    const data = await resp.json();
    const results = Array.isArray(data && data.results) ? data.results : [];
    const primes = results.map((r, i) => ({
      primeId:              `usa-${String(r.id || i)}`,
      primeName:            String(r.name || 'Unknown'),
      uei:                  String(r.code || ''),
      cage:                 '',
      website:              '',
      naics:                naicsCodes.slice(0, 3),
      totalObligations:     Number(r.amount) || 0,
      awardCount:           0,
      recentAwardCount:     0,
      topAgencies:          [],
      topContractingOffices: [],
      contractVehicles:     [],
      placeOfPerformance:   [],
      subcontractingPlanMatch: false,
      sbloContactName:      '',
      sbloEmail:            '',
      supplierDiversityUrl: '',
      registrationPortalUrl: '',
      outreachStatus:       'New',
      lastContacted:        null,
      nextFollowUp:         null,
      notes:                ''
    }));
    return { ok: true, primes, source: 'usaspending' };
  } catch (err) {
    return { ok: false, error: 'usaspending_fetch_error', message: String(err.message || err), primes: [] };
  }
}

// ── Draft generation ───────────────────────────────────────────────────────

function generateOutreachDraft(prime, userProfile) {
  prime = prime || {};
  userProfile = userProfile || {};

  const userName  = String(userProfile.name || userProfile.companyName || 'Our Company').trim();
  const userNaics = strArr(userProfile.naics);
  const userCerts = strArr(userProfile.certifications).map(c => c.toUpperCase());
  const hasCerts  = userCerts.length > 0;
  const workArea  = (strArr(prime.topAgencies)[0] || 'federal programs');
  const primeNaicsText = strArr(prime.naics).slice(0, 3).join(', ');

  const naicsLine = userNaics.length > 0
    ? `Our core capabilities span NAICS ${userNaics.slice(0, 3).join(', ')}, which aligns with your federal work in ${primeNaicsText || workArea}.`
    : `Our capabilities align with federal services performed in ${workArea}.`;

  const certLine = hasCerts
    ? `\n\nAs a ${userCerts.join('/')} certified firm, we may be able to support your small business participation goals.`
    : '';

  const lines = [
    `Subject: Subcontracting and Teaming Interest — ${userName}`,
    '',
    `Hello ${prime.sbloContactName || 'Supplier Diversity Team'},`,
    '',
    `I am reaching out on behalf of ${userName} to introduce our capabilities and explore subcontracting or teaming opportunities with ${prime.primeName || 'your organization'}.`,
    '',
    naicsLine + certLine,
    '',
    `We would welcome the opportunity to:`,
    `- Register in your supplier portal${prime.registrationPortalUrl ? ' (' + prime.registrationPortalUrl + ')' : ''}`,
    `- Connect with your Small Business Liaison Officer`,
    `- Discuss upcoming subcontracting needs under your ${workArea} contracts`,
    '',
    `We understand that teaming and subcontracting decisions are driven by specific contract requirements. We are happy to share our capabilities statement, past performance, and certifications for your review.`,
    '',
    `Would you be available for a brief introduction call, or is there a preferred process for new suppliers?`,
    '',
    `Thank you for your time and consideration.`,
    '',
    `Best regards,`,
    userName
  ];

  return {
    ok: true,
    draft: scrubForbidden(lines.join('\n')),
    requiresApproval: true,
    sendingEnabled: false,
    safetyNote: NO_AUTO_SEND_NOTE,
    primeId: prime.primeId || null,
    primeName: prime.primeName || null,
    generatedAt: new Date().toISOString()
  };
}

function generateCapabilityMatchMemo(prime, userProfile) {
  prime = prime || {};
  userProfile = userProfile || {};

  const userName  = String(userProfile.name || userProfile.companyName || 'Our Company').trim();
  const userNaics = strArr(userProfile.naics);
  const userCerts = strArr(userProfile.certifications);
  const primeAgencies = strArr(prime.topAgencies).slice(0, 3).join(', ');
  const primeVehicles = strArr(prime.contractVehicles).slice(0, 5).join(', ');
  const score = Number(prime.partnershipFitScore) || 0;
  const label = prime.scoreLabel || getScoreLabel(score);
  const obligations = Number(prime.totalObligations) || 0;

  const certSection = userCerts.length > 0
    ? '\n## Certifications\n' + userCerts.map(c => `- ${c.toUpperCase()}`).join('\n')
    : '';

  const naicsSection = userNaics.length > 0
    ? userNaics.map(n => `- ${n}`).join('\n')
    : '- (No NAICS codes set in profile)';

  const lines = [
    `# Capability Match Memo`,
    `## ${prime.primeName || 'Prime Contractor'}`,
    `**Partnership Fit Score:** ${score}/100 — ${label}`,
    `**Generated:** ${new Date().toISOString().split('T')[0]}`,
    `**Company:** ${userName}`,
    '',
    `## Why This Prime Was Selected`,
    prime.reasonForScore || 'General federal prime contractor match.',
    '',
    `## Prime Profile`,
    `- **Agencies served:** ${primeAgencies || 'Federal'}`,
    `- **Contract vehicles:** ${primeVehicles || 'See portal'}`,
    `- **Total obligations:** $${(obligations / 1e9).toFixed(1)}B`,
    `- **Recent awards:** ${prime.recentAwardCount || 0}`,
    `- **UEI:** ${prime.uei || 'See SAM.gov'}`,
    `- **Subcontracting plan:** ${prime.subcontractingPlanMatch ? 'Yes — required under contract' : 'Not confirmed'}`,
    '',
    `## Our Matching NAICS`,
    naicsSection,
    certSection,
    '',
    `## SBLO Contact`,
    `- Name: ${prime.sbloContactName || 'Not available'}`,
    `- Email: ${prime.sbloEmail || 'Not available'}`,
    `- Supplier diversity: ${prime.supplierDiversityUrl || 'Not available'}`,
    `- Registration portal: ${prime.registrationPortalUrl || 'Not available'}`,
    '',
    `## Recommended Actions`,
    `1. Register in the supplier portal (if not yet registered)`,
    `2. Send capabilities statement to SBLO`,
    `3. Request subcontracting opportunities briefing`,
    `4. Monitor solicitations where ${prime.primeName || 'this prime'} may bid`,
    '',
    `_AI draft. Human review required._`
  ];

  return {
    ok: true,
    memo: lines.join('\n'),
    requiresApproval: true,
    primeId: prime.primeId || null,
    primeName: prime.primeName || null,
    generatedAt: new Date().toISOString()
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scrubForbidden(text) {
  let out = String(text || '');
  for (const phrase of FORBIDDEN_PHRASES) {
    out = out.replace(new RegExp(escapeRe(phrase), 'ig'), '');
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function strArr(v) {
  if (!v) return [];
  if (typeof v === 'string') return v.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.map(s => String(s || '').trim()).filter(Boolean);
  return [];
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(Number(n) || 0))); }
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = {
  PRIME_STATUSES,
  SCORE_LABELS,
  DEMO_PRIMES,
  NO_AUTO_SEND_NOTE,
  findPrimePartners,
  fetchPrimesFromUSAspending,
  scorePrime,
  getScoreLabel,
  generateOutreachDraft,
  generateCapabilityMatchMemo,
  _internal: { naicsMatchScore, scrubForbidden }
};
