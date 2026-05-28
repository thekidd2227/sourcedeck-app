'use strict';

const FAR_19_7_NOTE = 'Subcontracting plans and small-business participation guidance must be reviewed against FAR Subpart 19.7, limitation-on-subcontracting rules, set-aside terms, and the solicitation.';

function sourceSubcontractors(input) {
  input = input && typeof input === 'object' ? input : {};
  const opportunity = input.opportunity || {};
  const sowText = [input.sowText, opportunity.description, opportunity.title].filter(Boolean).join('\n');
  const pop = normalizePlace(opportunity.placeOfPerformance || input.placeOfPerformance);
  const radiusMiles = Number(input.radiusMiles) > 0 ? Math.min(Number(input.radiusMiles), 250) : 50;
  const capabilityMap = mapCapabilities(sowText, opportunity);
  const candidates = normalizeCandidates([...(input.vendorCandidates || []), ...(input.bench || [])]);
  const vendors = dedupeVendors(candidates)
    .map(v => scoreVendor(v, capabilityMap, pop))
    .filter(v => v.distanceMiles === null || v.distanceMiles <= radiusMiles)
    .sort((a, b) => b.quoteRequestReadiness - a.quoteRequestReadiness || a.riskRating.localeCompare(b.riskRating))
    .slice(0, Number(input.targetCount) || 8);

  const sourcingPackage = buildPackage(opportunity, capabilityMap, vendors, pop, radiusMiles);
  return {
    ok: true,
    opportunityId: opportunity.noticeId || opportunity.solicitationNumber || null,
    radiusMiles,
    targetCount: 8,
    farNote: FAR_19_7_NOTE,
    farSubpart197Note: FAR_19_7_NOTE,
    vendors,
    methodology: sourcingPackage.methodology,
    deliverables: sourcingPackage.deliverables,
    formats: {
      tableRows: vendors.map(v => ({
        companyName: v.name,
        website: v.website,
        emailOrPublicContactMethod: v.emailOrContactMethod,
        phone: v.phone,
        location: v.location,
        distanceMiles: v.distanceMiles,
        relevantCapabilities: v.relevantCapabilities,
        certificationsLicenses: v.certificationsLicenses,
        naicsPscFit: v.naicsPscFit,
        vendorAvailabilityRating: v.vendorAvailabilityRating,
        riskRating: v.riskRating,
        quoteRequestReadiness: v.quoteRequestReadiness,
        sourceLinks: v.sourceLinks,
        sourceNotes: v.sourceNotes
      })),
      table: formatVendors(vendors, 'table'),
      bullets: formatVendors(vendors, 'bullets'),
      numbered: formatVendors(vendors, 'numbered')
    }
  };
}

function mapCapabilities(text, opportunity) {
  text = String(text || '').toLowerCase();
  const skills = [];
  const add = (cond, label) => { if (cond && !skills.includes(label)) skills.push(label); };
  add(/janitorial|custodial|clean/i.test(text), 'Janitorial/custodial services');
  add(/hvac|mechanical|plumbing|electrical|repair|maintenance/i.test(text), 'Facilities maintenance trades');
  add(/security|guard|patrol/i.test(text), 'Security services');
  add(/it|helpdesk|cyber|software|network/i.test(text), 'IT support');
  add(/staff|personnel|labor|shift/i.test(text), 'Staffing and labor coverage');
  add(/transport|delivery|logistics/i.test(text), 'Logistics and delivery');
  if (!skills.length) skills.push('Scope-specific subcontractor support');
  const certs = [];
  if (/license|licensed|permit/.test(text)) certs.push('Applicable license/permit');
  if (/bond|bonding/.test(text)) certs.push('Bonding capacity');
  if (/insurance|coi|liability/.test(text)) certs.push('Insurance/COI');
  if (/sdvosb|veteran|8\(a\)|wosb|hubzone|small business/.test(String(opportunity.setAside || '') + text)) certs.push('Similarly situated small-business status where required');
  return {
    requiredSkills: skills,
    certifications: certs,
    geographicPresence: 'Within 50 miles of place of performance unless remote delivery is allowed',
    naics: opportunity.naics || '',
    psc: opportunity.psc || ''
  };
}

function scoreVendor(v, capabilityMap, pop) {
  const hay = [v.name, v.relevantCapabilities.join(' '), v.certificationsLicenses.join(' '), v.naicsPscFit, v.sourceNotes].join(' ').toLowerCase();
  let fit = 0;
  for (const skill of capabilityMap.requiredSkills) {
    for (const tok of skill.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3)) {
      if (hay.includes(tok)) fit += 10;
    }
  }
  if (capabilityMap.certifications.some(c => hay.includes(c.toLowerCase().split('/')[0]))) fit += 12;
  const distanceMiles = distanceFrom(v, pop);
  if (distanceMiles !== null && distanceMiles <= 50) fit += 18;
  if (v.emailOrContactMethod || v.phone) fit += 12;
  if (v.website) fit += 6;
  fit = clamp(fit, 0, 100);
  return Object.assign({}, v, {
    distanceMiles,
    vendorAvailabilityRating: fit >= 75 ? 'High' : fit >= 45 ? 'Medium' : 'Low',
    riskRating: fit >= 75 ? 'Low' : fit >= 45 ? 'Medium' : 'High',
    quoteRequestReadiness: clamp(fit + (v.emailOrContactMethod ? 10 : 0), 0, 100)
  });
}

function buildPackage(opportunity, capabilityMap, vendors, pop, radiusMiles) {
  const density = vendors.length >= 6 ? 'healthy' : vendors.length >= 3 ? 'limited' : 'thin';
  return {
    methodology: {
      capabilityMapping: {
        requiredSkills: capabilityMap.requiredSkills,
        certifications: capabilityMap.certifications,
        geographicPresence: capabilityMap.geographicPresence
      },
      marketAnalysis: {
        regionalVendorDensity: `${density} (${vendors.length} candidates inside ${radiusMiles} miles)`,
        pricingBenchmarkNotes: 'Use written vendor quotes; treat web pricing as directional only.',
        capacityEstimate: vendors.length >= 4 ? 'Multiple backup paths likely' : 'Capacity risk: identify backup vendors before bid.'
      },
      vendorQualification: ['insurance', 'bonding', 'past performance', 'financial stability indicators'],
      relationshipStrategy: ['partnership terms', 'performance incentives', 'backup vendors']
    },
    deliverables: {
      requiredSubcontractorProfile: capabilityMap,
      geographicMarketAssessment: { placeOfPerformance: pop.label || '', radiusMiles, vendorCount: vendors.length, density },
      sourcingTimeline: ['Day 0: RFQ package', 'Day 1-2: Vendor outreach', 'Day 3: Quote comparison', 'Day 4: Compliance evidence', 'Day 5: Final pricing decision'],
      rfqTemplate: buildRfqTemplate(opportunity, capabilityMap),
      pricingNegotiationStrategy: 'Request itemized fixed-price quote, inclusions/exclusions, quote validity, and best-and-final option. Target at least two compliant quotes before final price.',
      performanceManagementFramework: 'Prime retains schedule, QA/QC, documentation, customer communication, issue escalation, invoicing, and acceptance tracking.',
      backupVendorPlan: vendors.slice(1, 4).map(v => v.name),
      bondQaNotes: 'Confirm performance bond, payment bond, insurance endorsements, wage compliance, and QA protocol where applicable.'
    }
  };
}

function buildRfqTemplate(opportunity, capabilityMap) {
  return [
    'Subject: RFQ support request - ' + (opportunity.solicitationNumber || opportunity.noticeId || opportunity.title || 'GovCon opportunity'),
    'Please provide a written quote for the scope areas below:',
    capabilityMap.requiredSkills.map(s => '- ' + s).join('\n'),
    'Include labor, materials, equipment, travel, assumptions, exclusions, schedule availability, insurance, bonding, licenses, and relevant past performance.'
  ].join('\n');
}

function formatVendors(vendors, mode) {
  vendors = Array.isArray(vendors) ? vendors : [];
  if (mode === 'bullets') return vendors.map(v => `- ${v.name} — ${v.vendorAvailabilityRating} availability; ${v.riskRating} risk; ${v.website || v.emailOrContactMethod || 'source note only'}`).join('\n');
  if (mode === 'numbered') return vendors.map((v, i) => `${i + 1}. ${v.name} — ${v.relevantCapabilities.join(', ') || 'capability review needed'} — quote readiness ${v.quoteRequestReadiness}/100`).join('\n');
  const header = '| Company | Website | Contact | Location | Distance | Capabilities | Risk | Quote Ready |\n|---|---|---|---|---:|---|---|---:|';
  return [header].concat(vendors.map(v => `| ${v.name} | ${v.website || ''} | ${v.emailOrContactMethod || v.phone || ''} | ${v.location || ''} | ${v.distanceMiles === null ? '' : v.distanceMiles} | ${v.relevantCapabilities.join(', ')} | ${v.riskRating} | ${v.quoteRequestReadiness} |`)).join('\n');
}

function normalizeCandidates(rows) {
  return (Array.isArray(rows) ? rows : []).map((r, idx) => ({
    id: String(r.id || r.organizationId || r.name || r.company || idx),
    name: clean(r.name || r.companyName || r.company || r.organizationName, 160),
    website: clean(r.website || r.domain || r.url, 240),
    emailOrContactMethod: clean(r.emailOrContactMethod || r.email || r.contact || r.contactUrl || r.website, 240),
    phone: clean(r.phone, 80),
    location: clean(r.location || r.city || r.address, 200),
    lat: num(r.lat || r.latitude),
    lon: num(r.lon || r.lng || r.longitude),
    relevantCapabilities: list(r.relevantCapabilities || r.capabilities || r.serviceCategory || r.notes),
    certificationsLicenses: list(r.certificationsLicenses || r.certifications || r.licenses),
    naicsPscFit: clean(r.naicsPscFit || r.naics || r.psc, 120),
    sourceLinks: list(r.sourceLinks || r.sources || r.website),
    sourceNotes: clean(r.sourceNotes || r.notes, 500)
  })).filter(v => v.name);
}

function dedupeVendors(rows) {
  const seen = new Set();
  return rows.filter(v => {
    const key = (v.website || v.name).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function distanceFrom(v, pop) {
  if (!pop || typeof pop.lat !== 'number' || typeof pop.lon !== 'number' || typeof v.lat !== 'number' || typeof v.lon !== 'number') return null;
  const R = 3958.8;
  const dLat = rad(v.lat - pop.lat);
  const dLon = rad(v.lon - pop.lon);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(rad(pop.lat)) * Math.cos(rad(v.lat)) * Math.sin(dLon/2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizePlace(p) {
  if (!p || typeof p !== 'object') return { label: String(p || ''), lat: null, lon: null };
  return { label: clean(p.label || p.city || p.address, 240), lat: num(p.lat || p.latitude), lon: num(p.lon || p.lng || p.longitude) };
}
function list(v) { if (typeof v === 'string') v = v.split(/[,;\n]/); return Array.isArray(v) ? v.map(x => clean(x, 140)).filter(Boolean).slice(0, 20) : []; }
function clean(v, max) { return String(v || '').trim().slice(0, max || 200); }
function num(v) { const n = Number(v); return isFinite(n) ? n : null; }
function rad(v) { return v * Math.PI / 180; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(Number(n) || 0))); }

module.exports = {
  FAR_19_7_NOTE,
  sourceSubcontractors,
  mapCapabilities,
  formatVendors,
  _internal: { distanceFrom, normalizeCandidates, dedupeVendors }
};
