/**
 * SourceDeck Premium Content Agent — spec module.
 *
 * Highest paid tier only. watsonx is referenced as the *planned* model
 * provider; this repository does not yet contain a watsonx integration.
 * Repository ingestion (GitHub / GitLab / Bitbucket) is *planned* in
 * the same sense — public-URL ingestion is in scope, private-repo
 * connectors require auth and are explicitly planned.
 *
 * This file is the canonical surface other code reads to render
 * marketing copy, gate access, generate prompts, and validate drafts.
 * It does not run any external API call. It does not auto-post.
 */

export type PremiumContentAgentSpec = {
  readonly featureName: 'SourceDeck Premium Content Agent';
  readonly tierRequirement: 'highest_paid_tier_only';
  readonly positioning: string;
  readonly poweredBy: 'watsonx';
  readonly poweredByStatus: 'planned' | 'implemented';
  readonly supportedPlatforms: readonly ['linkedin', 'facebook'];
  readonly contextInputs: readonly ContextInput[];
  readonly repositoryInputs: readonly RepositoryInput[];
  readonly repositoryIngestionStatus: 'planned' | 'implemented';
  readonly documentInputs: readonly DocumentInput[];
  readonly analysisOutputs: readonly string[];
  readonly contentTypes: {
    readonly linkedin: readonly LinkedInContentType[];
    readonly facebook: readonly FacebookContentType[];
  };
  readonly contentRatio: { readonly featureBenefit: 75; readonly diagnosticPOV: 25 };
  readonly platformGuidance: {
    readonly linkedin: PlatformGuidance;
    readonly facebook: PlatformGuidance;
  };
  readonly approvalWorkflow: ApprovalWorkflow;
  readonly safetyRules: readonly string[];
  readonly blockedClaims: readonly string[];
  readonly hashtagSchemas: HashtagSchemas;
  readonly ctaRules: readonly string[];
  readonly examplePrompts: readonly string[];
  readonly autoPostingClaim: 'not_supported_in_this_repo';
};

export type ContextInput =
  | 'uploadedDocuments'
  | 'linkedRepositories'
  | 'publicUrls'
  | 'productPages'
  | 'businessProfile'
  | 'services'
  | 'pipelineItems'
  | 'opportunityRecords'
  | 'vendorRecords'
  | 'proposalDocuments'
  | 'capabilityStatements'
  | 'releaseNotes'
  | 'changelogs'
  | 'codeRepositories'
  | 'readmeFiles'
  | 'apiDocs';

export type RepositoryInput =
  | 'GitHub'
  | 'GitLab'
  | 'Bitbucket'
  | 'public repository URLs'
  | 'private repository connection planned'
  | 'requires auth';

export type DocumentInput =
  | 'PDF'
  | 'Word'
  | 'Markdown'
  | 'plain text'
  | 'CSV'
  | 'slide deck'
  | 'capability statement'
  | 'SOP'
  | 'product documentation'
  | 'proposal document'
  | 'release notes'
  | 'changelog'
  | 'README'
  | 'API docs'
  | 'website URL'
  | 'public docs URL'
  | 'landing page URL';

export type LinkedInContentType =
  | 'text_authority'
  | 'poll'
  | 'document_pdf_outline'
  | 'product_feature_spotlight'
  | 'service_explainer'
  | 'govcon_authority'
  | 'pipeline_lesson'
  | 'website_cta'
  | 'founder_note'
  | 'operational_lesson'
  | 'build_in_public';

export type FacebookContentType =
  | 'service_education'
  | 'community_trust'
  | 'owner_update'
  | 'project_update'
  | 'customer_problem_solution'
  | 'business_tip'
  | 'website_cta'
  | 'soft_offer';

export type PlatformGuidance = {
  readonly toneNotes: string;
  readonly lengthGuidance: string;
  readonly hashtagCount: string;
  readonly mediaGuidance: string;
};

export type ApprovalWorkflow = {
  readonly mode: 'user_approval_required_before_publish';
  readonly autoPostingEnabled: false;
  readonly notes: string;
};

export type HashtagSchemas = {
  readonly linkedin: { readonly count: '10–12'; readonly tags: readonly string[] };
  readonly facebook: { readonly count: '3–6'; readonly tags: readonly string[] };
  readonly blocked: readonly string[];
};

export const premiumContentAgent: PremiumContentAgentSpec = {
  featureName: 'SourceDeck Premium Content Agent',
  tierRequirement: 'highest_paid_tier_only',
  positioning:
    'A watsonx-powered AI content strategist for the highest SourceDeck tier — turns the user\'s own documents, linked repositories, websites, product docs, and pipeline activity into LinkedIn and Facebook posts that build authority, traffic, and trust.',
  poweredBy: 'watsonx',
  poweredByStatus: 'planned',
  supportedPlatforms: ['linkedin', 'facebook'] as const,
  contextInputs: [
    'uploadedDocuments',
    'linkedRepositories',
    'publicUrls',
    'productPages',
    'businessProfile',
    'services',
    'pipelineItems',
    'opportunityRecords',
    'vendorRecords',
    'proposalDocuments',
    'capabilityStatements',
    'releaseNotes',
    'changelogs',
    'codeRepositories',
    'readmeFiles',
    'apiDocs'
  ] as const,
  repositoryInputs: [
    'GitHub',
    'GitLab',
    'Bitbucket',
    'public repository URLs',
    'private repository connection planned',
    'requires auth'
  ] as const,
  repositoryIngestionStatus: 'planned',
  documentInputs: [
    'PDF',
    'Word',
    'Markdown',
    'plain text',
    'CSV',
    'slide deck',
    'capability statement',
    'SOP',
    'product documentation',
    'proposal document',
    'release notes',
    'changelog',
    'README',
    'API docs',
    'website URL',
    'public docs URL',
    'landing page URL'
  ] as const,
  analysisOutputs: [
    'feature_inventory',
    'benefit_inventory',
    'differentiator_inventory',
    'audience_summary',
    'content_angle_recommendations',
    'post_drafts',
    'cta_recommendations',
    'hashtag_recommendations',
    'claim_confidence_labels',
    'safety_warnings'
  ],
  contentTypes: {
    linkedin: [
      'text_authority',
      'poll',
      'document_pdf_outline',
      'product_feature_spotlight',
      'service_explainer',
      'govcon_authority',
      'pipeline_lesson',
      'website_cta',
      'founder_note',
      'operational_lesson',
      'build_in_public'
    ] as const,
    facebook: [
      'service_education',
      'community_trust',
      'owner_update',
      'project_update',
      'customer_problem_solution',
      'business_tip',
      'website_cta',
      'soft_offer'
    ] as const
  },
  contentRatio: { featureBenefit: 75, diagnosticPOV: 25 } as const,
  platformGuidance: {
    linkedin: {
      toneNotes:
        'Direct, operator voice. No motivational filler. Use specific verbs and named workflows. Prefer numbered lists over adjectives.',
      lengthGuidance:
        'Text posts 800–1500 characters. Document outlines 5–9 slides. Polls 4 options max.',
      hashtagCount: '10–12 hashtags',
      mediaGuidance:
        'Media is optional. Document/PDF outlines benefit from carousel imagery; the user supplies or approves the visuals.'
    },
    facebook: {
      toneNotes:
        'Conversational, local, plainspoken. Speak as the owner. No corporate hedging.',
      lengthGuidance:
        'Short posts 250–600 characters. Use line breaks. End with a question or a soft CTA.',
      hashtagCount: '3–6 hashtags',
      mediaGuidance:
        'Single-image posts work best. Decks or PDFs should be summarized in a short caption with the file as the attached asset.'
    }
  },
  approvalWorkflow: {
    mode: 'user_approval_required_before_publish',
    autoPostingEnabled: false,
    notes:
      'The Premium Content Agent drafts and recommends. The user reviews every draft, edits inferred or candidate claims, and approves before the draft becomes a scheduled or published post. This repository contains no auto-publish code path.'
  },
  safetyRules: [
    'Never include secrets, tokens, API keys, environment variables, or signed URLs in any draft.',
    'Never publish private repository source code verbatim; only summarized, user-approved derivative content.',
    'Never publish confidential proposal narrative, pricing, evaluation criteria, or named-customer sections without explicit user opt-in.',
    'Redact PII (customer names, employee names, account numbers, contact details) by default; require user opt-in to reintroduce.',
    'Warn the user before drafting on sensitive GovCon material (set-aside posture, source selection, CUI markings, contract-vehicle-sensitive content) and require explicit confirmation to continue.',
    'Mark every claim verified, inferred, or candidate. Drafts with inferred or candidate claims surface those tags inline.',
    'Do not auto-post. Every draft passes through user approval.'
  ],
  blockedClaims: [
    'exaggerated_metrics',
    'fake_clients',
    'unsupported_certifications',
    'unsupported_compliance_claims',
    'cui_or_classified_content',
    'pii_without_user_approval',
    'secret_or_credential_leakage',
    'private_customer_data_without_approval',
    'guaranteed_results',
    'fabricated_case_studies'
  ],
  hashtagSchemas: {
    linkedin: {
      count: '10–12',
      // The recommended schema exposes 12 tags. Domain-specific extras
      // (e.g., #HUBZone, #VeteranOwnedBusiness, #DocumentControl,
      // #GovConPipeline) can be opted in per-draft when relevant.
      tags: [
        '#SourceDeck',
        '#GovCon',
        '#GovernmentContracting',
        '#BidReadiness',
        '#ProposalOperations',
        '#CaptureManagement',
        '#VendorTracking',
        '#ComplianceTracking',
        '#OpportunityPipeline',
        '#SmallBusinessContractors',
        '#FederalContracting',
        '#OperationsLeaders'
      ]
    },
    facebook: {
      count: '3–6',
      tags: [
        '#SourceDeck',
        '#SmallBusiness',
        '#GovernmentContracting',
        '#BusinessGrowth',
        '#FederalContracting',
        '#Operations'
      ]
    },
    blocked: [
      '#Viral',
      '#Trending',
      '#FollowForFollow',
      '#LikeForLike',
      '#GuaranteedResults',
      '#GetRichQuick'
    ]
  },
  ctaRules: [
    'Pick a CTA tied to the stated goal: traffic, authority, leads, or trust.',
    'Traffic CTAs link to a product or landing page approved by the user.',
    'Authority CTAs invite a comment-thread response, not a DM.',
    'Lead CTAs request a DM with a specific keyword, or link to a form approved by the user.',
    'Trust CTAs invite a soft conversation ("happy to share what we use") without a sale ask.',
    'Never use guaranteed-results language. Never promise a metric outcome.'
  ],
  examplePrompts: [
    'What business are you trying to grow?',
    'What service or product do you want to promote this week?',
    'Do you want to attach documents or paste links?',
    'Do you want to connect a GitHub, GitLab, or Bitbucket repository?',
    'Who is the audience for this post — federal buyers, small-business operators, partners, or someone else?',
    'What is the goal — website traffic, authority, leads, or trust?',
    'LinkedIn, Facebook, or both?',
    'Preferred format — text-only, poll, checklist, document outline, or media-supported?'
  ],
  autoPostingClaim: 'not_supported_in_this_repo'
};

export default premiumContentAgent;
