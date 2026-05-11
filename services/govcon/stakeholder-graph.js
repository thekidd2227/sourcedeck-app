// services/govcon/stakeholder-graph.js
//
// FAR-aware stakeholder graph for a single opportunity.
//
// SourceDeck's stakeholder layer is reference intelligence. It is NOT
// an outreach engine for contracting officers. Every node carries a
// posture label that tells the operator what posture is appropriate
// per FAR / agency rules / solicitation communication windows.
//
// Five categories:
//   1. Contracting office (CO/CS/PCO)         -> reference only
//   2. Program / mission office               -> research target
//   3. Incumbent (current performer)          -> research target
//   4. Potential prime / sub partner          -> outreach candidate
//   5. Industry-day / SS respondents          -> engagement candidate
//                                                IF allowed
//
// We deliberately never produce strings like "DM the COR" or
// "cold-email the contracting officer". Tests assert on these
// safety properties (see tests/stakeholder-graph.test.js).

'use strict';

const POSTURE_LABELS = Object.freeze({
  reference_only:        'Reference intelligence only.',
  research_target:       'Research target. Approachable through public-record channels and industry days only.',
  outreach_candidate:    'Outreach candidate. Standard pre-RFP teaming/capability outreach.',
  engagement_candidate:  'Engagement candidate IF allowed by the solicitation and agency.',
  restricted:            'Restricted. Communications are limited to the official mechanism named in the solicitation.'
});

const POSTURE_BY_CATEGORY = Object.freeze({
  contracting_office:    'restricted',
  program_office:        'research_target',
  incumbent:             'research_target',
  partner_prime_or_sub:  'outreach_candidate',
  industry_day:          'engagement_candidate'
});

const SAFETY_NOTE = [
  'SourceDeck does not draft or send outreach to contracting officers, contracting specialists, or CORs.',
  'Communications during a restricted communication window must be routed through the official mechanism named in the solicitation.',
  'Pre-RFP capability conversations with Small Business Specialists or program offices are appropriate when the agency permits them; respect industry-day formats and source-sought response windows.',
  'See FAR 3.104 (procurement integrity) and the solicitation\'s Section L communication instructions before initiating any contact.'
].join(' ');

// Build the stakeholder graph for an opportunity.
// `opp` is a normalized opportunity object (see services/govcon/sam-search.js).
// Optional `extras` lets the caller pass user-curated additions
// (e.g. a known sub partner from the past-performance library).
function buildStakeholderGraph(opp, extras) {
  opp = opp || {};
  extras = extras || {};
  const inRestrictedWindow = isInRestrictedWindow(opp);

  const nodes = [];

  // 1. Contracting office (always reference-only)
  nodes.push(node({
    role: 'Contracting officer (CO)',
    category: 'contracting_office',
    label: opp.contractingOffice || (opp.subAgency || opp.agency || 'Agency contracting office'),
    posture: 'restricted',
    inRestrictedWindow,
    instructions: 'Use the SAM.gov Q&A mechanism (or other officially-named channel) for any communication about this solicitation.'
  }));

  // 2. Program / mission office
  nodes.push(node({
    role: 'Program / mission office',
    category: 'program_office',
    label: opp.subAgency || opp.agency || 'Program office',
    posture: 'research_target',
    inRestrictedWindow,
    instructions: 'Approachable through industry days, capability briefings, or other agency-published forums. Do not pitch in restricted period.'
  }));

  // 3. Small Business Specialist (if agency exposes one)
  nodes.push(node({
    role: 'Small Business Specialist (SBS)',
    category: 'program_office',
    label: opp.agency ? (opp.agency + ' SBS office') : 'Agency SBS office',
    posture: 'outreach_candidate',
    inRestrictedWindow,
    instructions: 'Standard pre-RFP capability outreach is generally appropriate. Confirm any agency-specific guidance before reaching out.'
  }));

  // 4. Incumbent (research target only)
  nodes.push(node({
    role: 'Likely incumbent',
    category: 'incumbent',
    label: 'Public-record FPDS award (if any)',
    posture: 'research_target',
    inRestrictedWindow,
    instructions: 'Win/loss analysis only. Use FPDS-NG award history to identify the current performer and incumbent contract value.'
  }));

  // 5. Potential prime / sub partners
  if (Array.isArray(extras.partners) && extras.partners.length) {
    for (const p of extras.partners) {
      nodes.push(node({
        role: p.role || 'Teaming partner',
        category: 'partner_prime_or_sub',
        label: p.label || p.name || 'Partner candidate',
        posture: 'outreach_candidate',
        inRestrictedWindow,
        instructions: 'Mutual NDA standard before sharing capability details.'
      }));
    }
  } else {
    nodes.push(node({
      role: 'Potential teaming partner',
      category: 'partner_prime_or_sub',
      label: 'Identify based on opportunity scope and gap analysis',
      posture: 'outreach_candidate',
      inRestrictedWindow,
      instructions: 'Mutual NDA standard before sharing capability details.'
    }));
  }

  // 6. Industry-day respondents (when applicable)
  if (opp.noticeGroup === 'pre_rfp_intel' || /sources\s*sought|industry\s*day/i.test(opp.noticeType || '')) {
    nodes.push(node({
      role: 'Industry-day / Sources-Sought respondents',
      category: 'industry_day',
      label: 'Other respondents to this notice (public list if agency publishes one)',
      posture: 'engagement_candidate',
      inRestrictedWindow,
      instructions: 'Engagement is appropriate when the agency publishes a respondents list and/or hosts an industry day. Never solicit non-public information.'
    }));
  }

  // Final sanity scan: drop anything whose label/instructions accidentally
  // contains a phrase we never want to ship (e.g. "cold email", "DM", etc.)
  const banned = /\b(cold\s+(?:email|call|outreach)|cold[-]?dm|dm\s+the\s+(?:co|cor|contracting))\b/i;
  const safeNodes = nodes.filter(n => !banned.test(n.label + ' ' + n.instructions));

  return Object.freeze({
    opportunityId: opp.noticeId || opp.solicitationNumber || null,
    nodes: safeNodes,
    safetyNote: SAFETY_NOTE,
    postureLabels: POSTURE_LABELS,
    inRestrictedWindow
  });
}

function node({ role, category, label, posture, inRestrictedWindow, instructions }) {
  // If we're in a restricted communication window, contracting-office
  // posture is always 'restricted' regardless of input.
  let p = posture;
  if (inRestrictedWindow && category === 'contracting_office') p = 'restricted';
  return Object.freeze({
    role,
    category,
    label,
    posture: p,
    postureLabel: POSTURE_LABELS[p],
    instructions
  });
}

function isInRestrictedWindow(opp) {
  // Heuristic: an active solicitation with a future response deadline
  // is in a restricted communication window per typical solicitation
  // language. A sources-sought / RFI is generally not.
  if (!opp) return false;
  if (opp.noticeGroup === 'pre_rfp_intel') return false;
  if (!opp.responseDeadline) return false;
  const t = Date.parse(opp.responseDeadline);
  return isFinite(t) && t >= Date.now();
}

module.exports = {
  buildStakeholderGraph,
  isInRestrictedWindow,
  POSTURE_LABELS,
  POSTURE_BY_CATEGORY,
  SAFETY_NOTE
};
