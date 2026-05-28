/**
 * SourceDeck Workspace Readiness Banner - spec module.
 *
 * This repository is currently a product/spec surface, not a running
 * application. This file defines the banner behavior and readiness checks
 * other UI or backend code can consume later.
 *
 * The banner does not claim a workspace is compliant, fully connected, or
 * safe to publish from. It only surfaces known missing setup items and the
 * next user action needed to resolve them.
 */

export type WorkspaceReadinessBannerSpec = {
  readonly featureName: 'SourceDeck Workspace Readiness Banner';
  readonly availability: 'all_tiers';
  readonly purpose: string;
  readonly placement: readonly BannerPlacement[];
  readonly visibilityRules: VisibilityRules;
  readonly readinessItems: readonly ReadinessItem[];
  readonly severityOrder: readonly ReadinessSeverity[];
  readonly emptyStateCopy: string;
  readonly safetyRules: readonly string[];
  readonly implementationStatus: 'spec_only';
};

export type BannerPlacement =
  | 'dashboard_top'
  | 'campaign_workspace_top'
  | 'content_agent_top'
  | 'settings_integrations_top';

export type ReadinessSeverity = 'critical' | 'warning' | 'info';

export type ReadinessItemStatus =
  | 'missing'
  | 'needs_review'
  | 'degraded'
  | 'ready'
  | 'not_applicable';

export type ReadinessDependency =
  | 'workspace_profile'
  | 'api_key_status'
  | 'platform_connection_status'
  | 'brand_profile'
  | 'campaign_goal'
  | 'approval_contact'
  | 'content_sources'
  | 'billing_entitlement'
  | 'demo_mode_state';

export type ImplementationPath =
  | 'frontend_now_with_existing_state'
  | 'requires_backend_status_endpoint'
  | 'requires_integration_health_checks';

export type VisibilityRules = {
  readonly showWhenAnyItemIsActionable: true;
  readonly hideWhenAllRequiredItemsReady: true;
  readonly allowUserDismissal: true;
  readonly dismissalScope: 'session';
  readonly reappearWhenNewCriticalIssueAppears: true;
};

export type ReadinessItem = {
  readonly id: string;
  readonly label: string;
  readonly userProblemSolved: string;
  readonly proposedUiBehavior: string;
  readonly dependency: ReadinessDependency;
  readonly tierImpact: string;
  readonly overclaimingRisk: string;
  readonly severityWhenActionable: ReadinessSeverity;
  readonly actionableStatuses: readonly ReadinessItemStatus[];
  readonly primaryActionLabel: string;
  readonly primaryActionTarget: string;
  readonly implementationPath: ImplementationPath;
};

export const workspaceReadinessBanner: WorkspaceReadinessBannerSpec = {
  featureName: 'SourceDeck Workspace Readiness Banner',
  availability: 'all_tiers',
  purpose:
    'Help users understand why a workspace is not ready to generate, approve, schedule, or safely send campaign content, then give them the shortest next setup action.',
  placement: [
    'dashboard_top',
    'campaign_workspace_top',
    'content_agent_top',
    'settings_integrations_top'
  ] as const,
  visibilityRules: {
    showWhenAnyItemIsActionable: true,
    hideWhenAllRequiredItemsReady: true,
    allowUserDismissal: true,
    dismissalScope: 'session',
    reappearWhenNewCriticalIssueAppears: true
  },
  readinessItems: [
    {
      id: 'workspace-profile',
      label: 'Workspace profile missing',
      userProblemSolved:
        'The user cannot tell whether SourceDeck understands the business, audience, and operating context.',
      proposedUiBehavior:
        'Show a critical banner row when the workspace name, business type, target audience, or primary offer is missing. The action opens the workspace profile setup panel.',
      dependency: 'workspace_profile',
      tierImpact:
        'All tiers need the basic profile. Premium tiers can expose deeper profile fields, but the banner should not block basic setup behind an upgrade.',
      overclaimingRisk:
        'Low. Phrase as missing workspace context, not as a quality or performance guarantee.',
      severityWhenActionable: 'critical',
      actionableStatuses: ['missing', 'needs_review'] as const,
      primaryActionLabel: 'Complete profile',
      primaryActionTarget: '/settings/workspace',
      implementationPath: 'frontend_now_with_existing_state'
    },
    {
      id: 'api-key',
      label: 'AI key not connected',
      userProblemSolved:
        'The user does not know why AI drafting, content review, or agent features are unavailable.',
      proposedUiBehavior:
        'Show a critical banner row when the required AI provider key is absent or invalid. Include concise copy explaining that the key enables drafting and review features.',
      dependency: 'api_key_status',
      tierImpact:
        'All tiers can see setup state. If a provider is premium-only, show the setup item as locked preview copy rather than a broken state.',
      overclaimingRisk:
        'Medium. Do not claim keys are fully secure, encrypted, or never accessible unless the backend implementation supports that claim.',
      severityWhenActionable: 'critical',
      actionableStatuses: ['missing', 'degraded'] as const,
      primaryActionLabel: 'Add API key',
      primaryActionTarget: '/settings/integrations/ai',
      implementationPath: 'requires_backend_status_endpoint'
    },
    {
      id: 'platform-connections',
      label: 'Publishing platform not connected',
      userProblemSolved:
        'The user cannot tell why a campaign cannot be scheduled or why platform readiness is incomplete.',
      proposedUiBehavior:
        'Show a warning row for missing, expired, or degraded LinkedIn/Facebook connections. Include last-checked text only when the backend has a real timestamp.',
      dependency: 'platform_connection_status',
      tierImpact:
        'All tiers can see platform readiness. Scheduling or multi-platform publishing can remain tier-gated if that matches entitlement policy.',
      overclaimingRisk:
        'Medium. Do not show "ready" unless provider status is current and permission scope is known.',
      severityWhenActionable: 'warning',
      actionableStatuses: ['missing', 'degraded'] as const,
      primaryActionLabel: 'Connect platform',
      primaryActionTarget: '/settings/integrations/social',
      implementationPath: 'requires_integration_health_checks'
    },
    {
      id: 'brand-profile',
      label: 'Brand voice needs review',
      userProblemSolved:
        'AI-generated content risks sounding generic or making unsupported claims because the product voice and claim boundaries are not defined.',
      proposedUiBehavior:
        'Show an info row when brand voice, blocked claims, approved CTAs, or audience notes are absent. Let users open the brand profile drawer.',
      dependency: 'brand_profile',
      tierImpact:
        'All tiers should support minimum brand voice setup. Premium can add richer claim rules, example posts, and source-traceable positioning.',
      overclaimingRisk:
        'High if SourceDeck implies content is safe just because voice is configured. Copy should say "helps improve fit", not "guarantees compliant content".',
      severityWhenActionable: 'info',
      actionableStatuses: ['missing', 'needs_review'] as const,
      primaryActionLabel: 'Review brand voice',
      primaryActionTarget: '/settings/brand',
      implementationPath: 'frontend_now_with_existing_state'
    },
    {
      id: 'approval-contact',
      label: 'Approval owner missing',
      userProblemSolved:
        'Generated content can stall because no one is clearly responsible for approving drafts before scheduling or publishing.',
      proposedUiBehavior:
        'Show a warning row when no approval owner is assigned. The action opens approval workflow settings.',
      dependency: 'approval_contact',
      tierImpact:
        'All tiers need a single approval owner. Multi-reviewer approval chains can be premium or enterprise.',
      overclaimingRisk:
        'Low. Avoid implying approval means legal or compliance review unless such a workflow exists.',
      severityWhenActionable: 'warning',
      actionableStatuses: ['missing'] as const,
      primaryActionLabel: 'Assign owner',
      primaryActionTarget: '/settings/approvals',
      implementationPath: 'frontend_now_with_existing_state'
    },
    {
      id: 'content-sources',
      label: 'No approved source material',
      userProblemSolved:
        'Users may expect strong AI-generated content even though SourceDeck has no evidence, documents, product pages, or approved claims to work from.',
      proposedUiBehavior:
        'Show an info row when no approved sources are attached. Link to upload documents, add product URLs, or continue in demo mode.',
      dependency: 'content_sources',
      tierImpact:
        'Basic source attachment can be shown across product tiers. Repository ingestion and advanced source analysis can remain premium.',
      overclaimingRisk:
        'High. Make clear that missing source material reduces confidence; do not say content will be wrong or guaranteed better after upload.',
      severityWhenActionable: 'info',
      actionableStatuses: ['missing', 'needs_review'] as const,
      primaryActionLabel: 'Add source material',
      primaryActionTarget: '/content/sources',
      implementationPath: 'requires_backend_status_endpoint'
    },
    {
      id: 'campaign-goal',
      label: 'Campaign goal not selected',
      userProblemSolved:
        'The user does not know what the content system is optimizing for: leads, traffic, authority, trust, or follow-up.',
      proposedUiBehavior:
        'Show an info row on campaign screens when the active campaign has no goal. Provide a compact selector rather than forcing a full settings trip.',
      dependency: 'campaign_goal',
      tierImpact:
        'All tiers. Premium can add goal-based recommendations and next-best-action ranking.',
      overclaimingRisk:
        'Medium. Do not imply selecting a goal guarantees performance.',
      severityWhenActionable: 'info',
      actionableStatuses: ['missing'] as const,
      primaryActionLabel: 'Choose goal',
      primaryActionTarget: '/campaigns/current/settings',
      implementationPath: 'frontend_now_with_existing_state'
    },
    {
      id: 'demo-mode',
      label: 'Demo data is active',
      userProblemSolved:
        'Prospects and new users can confuse seeded demo examples with real workspace status.',
      proposedUiBehavior:
        'Show a persistent info banner while demo mode is active. Clearly label readiness checks, revenue examples, drafts, and campaign statuses as sample data.',
      dependency: 'demo_mode_state',
      tierImpact:
        'All tiers and sales demos. Demo mode can preview premium workflows without granting live premium access.',
      overclaimingRisk:
        'High. Every sample metric and status must be labeled demo or sample.',
      severityWhenActionable: 'info',
      actionableStatuses: ['needs_review'] as const,
      primaryActionLabel: 'Use real workspace',
      primaryActionTarget: '/settings/workspace?mode=live',
      implementationPath: 'frontend_now_with_existing_state'
    }
  ] as const,
  severityOrder: ['critical', 'warning', 'info'] as const,
  emptyStateCopy:
    'Workspace setup is ready based on the checks SourceDeck can currently verify.',
  safetyRules: [
    'Do not describe a workspace as compliant, safe to send, or fully operational unless separate checks support that claim.',
    'Show "last checked" only when it comes from a real backend timestamp.',
    'Use "missing", "needs review", or "not connected" for unknown states instead of implying failure.',
    'Let users dismiss non-critical banners for the session, but show new critical issues immediately.',
    'In demo mode, label all readiness statuses and metrics as sample data.'
  ],
  implementationStatus: 'spec_only'
};

export default workspaceReadinessBanner;
