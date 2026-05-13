/**
 * VerdictIQ Statutory Limitation Engine - Public API
 * 
 * Main entry point for the limitation intelligence engine.
 * Re-exports all core components and provides a clean public interface.
 */

// Type exports
export type {
  CaseCategory,
  JurisdictionType,
  GovernmentRole,
  UrgencyLevel,
  LimitationRule,
  RuleMatchInput,
  LimitationResult,
  LimitationEngineConfig,
  LimitationAuditEntry,
  LimitationOverride,
  EscalationRecommendation,
  LimitationSummary,
} from "./types";

export { LimitationEngineError } from "./types";

// Rule exports
export {
  LIMITATION_RULES,
  getAllActiveRules,
  getRulesByCategory,
  getRulesByJurisdiction,
  sortRulesByPriority,
} from "./rules";

// Matcher exports
export {
  findApplicableRule,
  findAllApplicableRules,
  hasApplicableRule,
  getRuleById,
  getRuleByIdOrThrow,
  isRuleApplicableToInput,
} from "./rule-matcher";

// Calculator exports
export {
  parseDate,
  calculateDaysBetween,
  calculateDeadline,
  determineUrgencyLevel,
  formatDate,
  formatDaysRemaining,
  calculateDeadlineForCase,
  calculateDeadlineForRuleId,
  isNearExpiry,
  isExpired,
  requiresEscalation,
  calculateWorkingDaysRemaining,
  generateLimitationSummary,
} from "./calculator";
