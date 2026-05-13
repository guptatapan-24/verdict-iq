/**
 * VerdictIQ Statutory Limitation Engine - Deadline Calculator
 * 
 * Core calculation logic:
 * Determines legal deadline, days remaining, and urgency levels.
 * 
 * Safety features:
 * - Defensive date parsing
 * - Timezone-safe logic
 * - Full audit trail
 * - Production-ready error handling
 */

import {
  type RuleMatchInput,
  type LimitationResult,
  type UrgencyLevel,
  LimitationEngineError,
} from "./types";
import {
  findApplicableRule,
  getRuleByIdOrThrow,
} from "./rule-matcher";

/**
 * Parse date defensively (ISO string or Date object)
 * Returns Date object or throws clear error
 */
export function parseDate(dateInput: Date | string): Date {
  try {
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) {
        throw new Error("Invalid Date object");
      }
      return dateInput;
    }

    if (typeof dateInput === "string") {
      const parsed = new Date(dateInput);
      if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date string: ${dateInput}`);
      }
      return parsed;
    }

    throw new Error(
      `Invalid date type: ${typeof dateInput}. Expected Date or string.`
    );
  } catch (error) {
    throw new LimitationEngineError(
      `Date parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      "DATE_PARSE_ERROR",
      { dateInput }
    );
  }
}

/**
 * Calculate days between two dates (inclusive of end date)
 */
export function calculateDaysBetween(fromDate: Date, toDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.ceil(diffMs / msPerDay);
}

/**
 * Calculate deadline by adding days to a date
 * Returns deadline as Date (normalized to start of day UTC)
 */
export function calculateDeadline(
  startDate: Date,
  daysToAdd: number
): Date {
  const deadline = new Date(startDate.getTime());
  deadline.setUTCDate(deadline.getUTCDate() + daysToAdd);
  // Normalize to start of day
  deadline.setUTCHours(0, 0, 0, 0);
  return deadline;
}

/**
 * Determine urgency level based on days remaining
 */
export function determineUrgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining < 0) {
    return "expired";
  }
  if (daysRemaining <= 7) {
    return "critical";
  }
  if (daysRemaining <= 14) {
    return "warning";
  }
  return "safe";
}

/**
 * Format date as human-readable string
 */
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };
  return date.toLocaleDateString("en-IN", options);
}

/**
 * Format days remaining as human-readable string
 */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const daysPassed = Math.abs(daysRemaining);
    return `Expired ${daysPassed} day${daysPassed !== 1 ? "s" : ""} ago`;
  }
  if (daysRemaining === 0) {
    return "Expires today";
  }
  if (daysRemaining === 1) {
    return "Expires tomorrow";
  }
  return `${daysRemaining} days remaining`;
}

/**
 * Main calculation function
 * 
 * Input: case metadata + order date
 * Output: full limitation result with audit trail
 */
export function calculateDeadlineForCase(
  input: RuleMatchInput,
  orderDate: Date | string
): LimitationResult {
  try {
    // Step 1: Parse order date defensively
    const parsedOrderDate = parseDate(orderDate);

    // Step 2: Find applicable rule
    const rule = findApplicableRule(input);

    // Step 3: Calculate deadline
    const deadline = calculateDeadline(parsedOrderDate, rule.limitationDays);

    // Step 4: Calculate days remaining (from today)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const daysRemaining = calculateDaysBetween(today, deadline);

    // Step 5: Determine urgency
    const urgencyLevel = determineUrgencyLevel(daysRemaining);

    // Step 6: Format human-readable strings
    const deadlineFormatted = formatDate(deadline);
    const daysRemainingFormatted = formatDaysRemaining(daysRemaining);

    // Step 7: Return comprehensive result
    const result: LimitationResult = {
      deadline: deadline.toISOString(),
      statute: rule.statute,
      articleOrSection: rule.articleOrSection,
      limitationDays: rule.limitationDays,
      matchedRuleId: rule.id,
      isInferred: true,
      daysRemaining,
      urgencyLevel,
      legalBasis: rule.legalBasis,
      calculatedAt: new Date().toISOString(),
      deadlineFormatted,
      daysRemainingFormatted,
    };

    return result;
  } catch (error) {
    if (error instanceof LimitationEngineError) {
      throw error;
    }

    throw new LimitationEngineError(
      `Deadline calculation failed: ${error instanceof Error ? error.message : String(error)}`,
      "CALCULATION_ERROR",
      { input, orderDate }
    );
  }
}

/**
 * Calculate deadline for a specific rule (for override scenarios)
 */
export function calculateDeadlineForRuleId(
  ruleId: string,
  orderDate: Date | string
): LimitationResult {
  try {
    const parsedOrderDate = parseDate(orderDate);
    const rule = getRuleByIdOrThrow(ruleId);

    const deadline = calculateDeadline(parsedOrderDate, rule.limitationDays);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const daysRemaining = calculateDaysBetween(today, deadline);
    const urgencyLevel = determineUrgencyLevel(daysRemaining);
    const deadlineFormatted = formatDate(deadline);
    const daysRemainingFormatted = formatDaysRemaining(daysRemaining);

    const result: LimitationResult = {
      deadline: deadline.toISOString(),
      statute: rule.statute,
      articleOrSection: rule.articleOrSection,
      limitationDays: rule.limitationDays,
      matchedRuleId: rule.id,
      isInferred: true,
      daysRemaining,
      urgencyLevel,
      legalBasis: rule.legalBasis,
      calculatedAt: new Date().toISOString(),
      deadlineFormatted,
      daysRemainingFormatted,
    };

    return result;
  } catch (error) {
    if (error instanceof LimitationEngineError) {
      throw error;
    }

    throw new LimitationEngineError(
      `Deadline calculation failed for rule: ${error instanceof Error ? error.message : String(error)}`,
      "RULE_CALCULATION_ERROR",
      { ruleId, orderDate }
    );
  }
}

/**
 * Check if a case is near expiry (within warning threshold)
 */
export function isNearExpiry(daysRemaining: number): boolean {
  return daysRemaining <= 14 && daysRemaining > 0;
}

/**
 * Check if a case has expired
 */
export function isExpired(daysRemaining: number): boolean {
  return daysRemaining < 0;
}

/**
 * Check if case requires immediate escalation
 */
export function requiresEscalation(daysRemaining: number): boolean {
  return daysRemaining <= 7 && daysRemaining >= 0;
}

/**
 * Calculate working days remaining (excludes weekends)
 * Simplified: excludes Saturdays and Sundays
 * Production version could integrate holiday calendars
 */
export function calculateWorkingDaysRemaining(deadline: Date): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let workingDays = 0;
  const currentDate = new Date(today);

  while (currentDate <= deadline) {
    const dayOfWeek = currentDate.getUTCDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return workingDays;
}

/**
 * Generate a limitation summary for dashboard display
 */
export function generateLimitationSummary(
  _caseId: number,
  result: LimitationResult
): string {
  const statusEmoji =
    result.urgencyLevel === "expired"
      ? "🔴"
      : result.urgencyLevel === "critical"
        ? "🟠"
        : result.urgencyLevel === "warning"
          ? "🟡"
          : "🟢";

  return (
    `${statusEmoji} ${result.statute} (${result.articleOrSection})\n` +
    `Deadline: ${result.deadlineFormatted}\n` +
    `Status: ${result.daysRemainingFormatted}`
  );
}
