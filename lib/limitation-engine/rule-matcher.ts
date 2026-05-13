/**
 * VerdictIQ Statutory Limitation Engine - Rule Matcher
 * 
 * Intelligent rule matching logic:
 * Determines the best applicable limitation rule based on case metadata,
 * jurisdiction, and government role.
 * 
 * Matching strategy:
 * 1. Filter by case category
 * 2. Filter by jurisdiction
 * 3. Filter by government role (if applicable)
 * 4. Apply priority ordering
 * 5. Return highest priority match
 * 6. Throw clear error if no match found
 */

import {
  type RuleMatchInput,
  type LimitationRule,
  LimitationEngineError,
} from "./types";
import {
  LIMITATION_RULES,
  sortRulesByPriority,
} from "./rules";

/**
 * Find the best applicable rule for given case metadata
 * 
 * Algorithm:
 * 1. Get active rules
 * 2. Filter by case category
 * 3. Filter by jurisdiction
 * 4. Filter by government role (if provided)
 * 5. Sort by priority
 * 6. Return first match
 * 7. Throw error if no match found
 */
export function findApplicableRule(
  input: RuleMatchInput
): LimitationRule {
  // Validate input
  if (!input.caseCategory || !input.jurisdiction) {
    throw new LimitationEngineError(
      "Invalid rule match input: caseCategory and jurisdiction are required",
      "INVALID_INPUT",
      { input }
    );
  }

  // Step 1: Get all active rules
  let candidates = LIMITATION_RULES.filter((rule) => rule.isActive);

  // Step 2: Filter by case category
  candidates = candidates.filter(
    (rule) => rule.caseCategory === input.caseCategory
  );

  if (candidates.length === 0) {
    throw new LimitationEngineError(
      `No rules found for case category: ${input.caseCategory}`,
      "NO_CATEGORY_MATCH",
      { caseCategory: input.caseCategory }
    );
  }

  // Step 3: Filter by jurisdiction
  candidates = candidates.filter(
    (rule) => rule.jurisdiction === input.jurisdiction
  );

  if (candidates.length === 0) {
    throw new LimitationEngineError(
      `No rules found for jurisdiction: ${input.jurisdiction} in category: ${input.caseCategory}`,
      "NO_JURISDICTION_MATCH",
      {
        caseCategory: input.caseCategory,
        jurisdiction: input.jurisdiction,
      }
    );
  }

  // Step 4: Filter by government role (if provided)
  // Rules with specific role requirement take precedence over role-agnostic rules
  if (input.governmentRole) {
    const roleSpecificRules = candidates.filter(
      (rule) =>
        rule.governmentRole === undefined ||
        rule.governmentRole === input.governmentRole
    );

    if (roleSpecificRules.length > 0) {
      candidates = roleSpecificRules;
    }
    // If no role-specific rules, fall back to role-agnostic rules
  }

  // Step 5: Apply priority override if provided
  if (input.priorityOverride) {
    const overriddenRule = candidates.find(
      (rule) => rule.id === input.priorityOverride
    );
    if (overriddenRule) {
      return overriddenRule;
    }
  }

  // Step 6: Filter by state if provided (optional state-specific rules)
  if (input.state !== undefined && candidates.length > 1) {
    const stateValue = input.state;
    const stateSpecificRules = candidates.filter(
      (rule) =>
        !rule.applicableStates ||
        rule.applicableStates.length === 0 ||
        rule.applicableStates.includes(stateValue)
    );
    if (stateSpecificRules.length > 0) {
      candidates = stateSpecificRules;
    }
  }

  // Step 7: Sort by priority and return highest
  const sortedRules = sortRulesByPriority(candidates);

  if (sortedRules.length === 0) {
    throw new LimitationEngineError(
      `No applicable rule found after filtering`,
      "NO_APPLICABLE_RULE",
      {
        caseCategory: input.caseCategory,
        jurisdiction: input.jurisdiction,
        governmentRole: input.governmentRole,
      }
    );
  }

  return sortedRules[0];
}

/**
 * Find all applicable rules (not just the best match)
 * Useful for verification, dashboards, and alternative suggestions
 */
export function findAllApplicableRules(
  input: RuleMatchInput
): LimitationRule[] {
  if (!input.caseCategory || !input.jurisdiction) {
    return [];
  }

  let candidates = LIMITATION_RULES.filter((rule) => rule.isActive);

  candidates = candidates.filter(
    (rule) => rule.caseCategory === input.caseCategory
  );

  candidates = candidates.filter(
    (rule) => rule.jurisdiction === input.jurisdiction
  );

  if (input.governmentRole) {
    const roleSpecificRules = candidates.filter(
      (rule) =>
        rule.governmentRole === undefined ||
        rule.governmentRole === input.governmentRole
    );

    if (roleSpecificRules.length > 0) {
      candidates = roleSpecificRules;
    }
  }

  if (input.state !== undefined && candidates.length > 0) {
    const stateValue = input.state;
    const stateSpecificRules = candidates.filter(
      (rule) =>
        !rule.applicableStates ||
        rule.applicableStates.length === 0 ||
        rule.applicableStates.includes(stateValue)
    );
    if (stateSpecificRules.length > 0) {
      candidates = stateSpecificRules;
    }
  }

  return sortRulesByPriority(candidates);
}

/**
 * Check if a rule exists for given input
 * Useful for validation before calculation
 */
export function hasApplicableRule(input: RuleMatchInput): boolean {
  try {
    findApplicableRule(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a specific rule by ID
 */
export function getRuleById(ruleId: string): LimitationRule | null {
  return (
    LIMITATION_RULES.find((rule) => rule.id === ruleId && rule.isActive) ||
    null
  );
}

/**
 * Get a specific rule by ID or throw error
 */
export function getRuleByIdOrThrow(ruleId: string): LimitationRule {
  const rule = getRuleById(ruleId);
  if (!rule) {
    throw new LimitationEngineError(
      `Rule not found or inactive: ${ruleId}`,
      "RULE_NOT_FOUND",
      { ruleId }
    );
  }
  return rule;
}

/**
 * Validate that a rule ID matches the given input criteria
 * Useful for checking overrides
 */
export function isRuleApplicableToInput(
  ruleId: string,
  input: RuleMatchInput
): boolean {
  const rule = getRuleById(ruleId);
  if (!rule) return false;

  // Check category
  if (rule.caseCategory !== input.caseCategory) return false;

  // Check jurisdiction
  if (rule.jurisdiction !== input.jurisdiction) return false;

  // Check role (if rule specifies one)
  if (
    rule.governmentRole &&
    input.governmentRole &&
    rule.governmentRole !== input.governmentRole
  ) {
    return false;
  }

  // Check state (if rule specifies states)
  if (
    rule.applicableStates &&
    rule.applicableStates.length > 0 &&
    input.state &&
    !rule.applicableStates.includes(input.state)
  ) {
    return false;
  }

  return true;
}
