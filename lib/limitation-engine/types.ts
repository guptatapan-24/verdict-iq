/**
 * VerdictIQ Statutory Limitation Engine - Type Definitions
 * 
 * Production-grade type system for dynamic Indian judicial limitation intelligence.
 * Designed for High Courts, State Legal Departments, Tribunals, and Government litigation cells.
 */

/**
 * Case categories reflecting Indian legal system structures
 * Extensible for future statute categories
 */
export type CaseCategory =
  | "service_law"
  | "civil_appeal"
  | "criminal_appeal"
  | "land_acquisition"
  | "tax_tribunal"
  | "constitutional_writ"
  | "regulatory"
  | "labor"
  | "environmental"
  | "commercial"
  | "family"
  | "custom";

/**
 * Jurisdiction types reflecting Indian court structure
 */
export type JurisdictionType =
  | "supreme_court"
  | "high_court"
  | "district_court"
  | "tribunal"
  | "consumer_forum";

/**
 * Government filing roles
 */
export type GovernmentRole =
  | "petitioner"
  | "respondent"
  | "appellant"
  | "authority";

/**
 * Urgency levels based on remaining days to deadline
 */
export type UrgencyLevel =
  | "safe" // >14 days remaining
  | "warning" // 8-14 days remaining
  | "critical" // 1-7 days remaining
  | "expired"; // 0 or fewer days

/**
 * Core limitation rule definition
 * Represents a statutory or regulatory limitation period
 */
export interface LimitationRule {
  /** Unique identifier for the rule */
  id: string;

  /** Case category this rule applies to */
  caseCategory: CaseCategory;

  /** Jurisdiction where rule applies */
  jurisdiction: JurisdictionType;

  /** Optional government role filter (undefined = applies to all roles) */
  governmentRole?: GovernmentRole;

  /** Statutory source/name (e.g., "Indian Penal Code", "Civil Procedure Code") */
  statute: string;

  /** Article/Section reference (e.g., "Section 21", "Article 32") */
  articleOrSection: string;

  /** Limitation period in days */
  limitationDays: number;

  /** Human-readable description of the limitation */
  description: string;

  /** Rule priority (higher = checked first when multiple rules match) */
  priority: number;

  /** Whether this rule is currently active */
  isActive: boolean;

  /** Detailed legal basis/citation */
  legalBasis: string;

  /** State-specific applicability (undefined = national) */
  applicableStates?: string[];

  /** Additional metadata for future enhancements */
  metadata?: Record<string, unknown>;
}

/**
 * Input for rule matching and limitation calculation
 */
export interface RuleMatchInput {
  /** Case category */
  caseCategory: CaseCategory;

  /** Jurisdiction */
  jurisdiction: JurisdictionType;

  /** Government role (if applicable) */
  governmentRole?: GovernmentRole;

  /** Optional priority override for specific rules */
  priorityOverride?: string;

  /** State code for state-specific rules (e.g., "MH", "DL") */
  state?: string;
}

/**
 * Result of limitation calculation
 * Production-safe structure with full audit trail
 */
export interface LimitationResult {
  /** Calculated deadline as ISO string */
  deadline: string;

  /** Statute applicable */
  statute: string;

  /** Article/Section reference */
  articleOrSection: string;

  /** Limitation period in days */
  limitationDays: number;

  /** ID of the matched rule */
  matchedRuleId: string;

  /** Whether the deadline was inferred vs. manually set */
  isInferred: boolean;

  /** Days remaining to deadline (negative if expired) */
  daysRemaining: number;

  /** Urgency classification */
  urgencyLevel: UrgencyLevel;

  /** Full legal basis citation */
  legalBasis: string;

  /** ISO timestamp of calculation */
  calculatedAt: string;

  /** Human-readable deadline string */
  deadlineFormatted: string;

  /** Human-readable days remaining */
  daysRemainingFormatted: string;
}

/**
 * Limitation engine configuration
 * For future extensibility (DB sources, API integrations, etc.)
 */
export interface LimitationEngineConfig {
  /** Rules source: "builtin" | "database" | "api" */
  rulesSource: "builtin" | "database" | "api";

  /** Enable strict rule matching (fail if no match found) */
  strictMatching: boolean;

  /** Enable logging for audit */
  enableAudit: boolean;

  /** Custom rule provider function for dynamic rules */
  customRuleProvider?: (input: RuleMatchInput) => LimitationRule | null;
}

/**
 * Audit entry for limitation calculations
 * Tracks all calculations for legal defensibility
 */
export interface LimitationAuditEntry {
  /** Unique calculation ID */
  calculationId: string;

  /** Case ID if applicable */
  caseId?: number;

  /** Input used for calculation */
  input: RuleMatchInput;

  /** Result of calculation */
  result: LimitationResult;

  /** User who triggered calculation */
  userId?: string;

  /** Timestamp of calculation */
  timestamp: string;

  /** Notes or comments */
  notes?: string;
}

/**
 * Manual override for limitation deadline
 * For verified exceptions and court-approved extensions
 */
export interface LimitationOverride {
  /** Rule that was overridden */
  originalRuleId: string;

  /** New deadline */
  overriddenDeadline: string;

  /** Reason for override */
  reason: string;

  /** Court/Authority that approved override */
  approvedBy: string;

  /** Date of approval */
  approvalDate: string;

  /** Supporting order reference */
  orderReference?: string;
}

/**
 * Escalation recommendation for near-expiry cases
 */
export interface EscalationRecommendation {
  /** Whether escalation is recommended */
  recommended: boolean;

  /** Escalation level: "review", "priority", "emergency" */
  level?: "review" | "priority" | "emergency";

  /** Reason for recommendation */
  reason: string;

  /** Suggested action */
  suggestedAction: string;

  /** Timeline for action */
  timelineForAction: string;
}

/**
 * Limitation summary for case dashboard
 */
export interface LimitationSummary {
  /** Case ID */
  caseId: number;

  /** Current limitation deadline */
  deadline: string;

  /** Days remaining */
  daysRemaining: number;

  /** Urgency level */
  urgency: UrgencyLevel;

  /** Statute and section */
  statute: string;

  /** Next action required */
  nextAction?: string;

  /** Escalation needed */
  escalationNeeded: boolean;
}

/**
 * Error type for limitation engine
 */
export class LimitationEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "LimitationEngineError";
  }
}
