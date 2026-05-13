/**
 * VerdictIQ Limitation Engine - Usage Examples
 * 
 * Comprehensive examples demonstrating the dynamic limitation engine
 * for Indian judicial compliance systems.
 * 
 * @ts-nocheck - Examples file, allows some linting relaxation
 */

import {
  // Types
  type RuleMatchInput,
  type LimitationResult,
  
  // Rule system
  LIMITATION_RULES,
  getAllActiveRules,
  getRulesByCategory,
  
  // Matching
  findApplicableRule,
  findAllApplicableRules,
  hasApplicableRule,
  
  // Calculation
  calculateDeadlineForCase,
  isNearExpiry,
  isExpired,
  requiresEscalation,
  generateLimitationSummary,
} from "./index";

// ============================================================================
// EXAMPLE 1: Basic Civil Appeal Deadline Calculation
// ============================================================================

export function example1_BasicCivilAppeal() {
  console.log("=== Example 1: Civil Appeal in High Court ===\n");

  const input: RuleMatchInput = {
    caseCategory: "civil_appeal",
    jurisdiction: "high_court",
    governmentRole: "respondent",
  };

  const orderDate = "2024-05-13"; // Date of High Court judgment
  const result = calculateDeadlineForCase(input, orderDate);

  console.log(`Statute: ${result.statute}`);
  console.log(`Section: ${result.articleOrSection}`);
  console.log(`Limitation Period: ${result.limitationDays} days`);
  console.log(`Deadline: ${result.deadlineFormatted}`);
  console.log(`Days Remaining: ${result.daysRemainingFormatted}`);
  console.log(`Urgency: ${result.urgencyLevel}`);
  console.log(`Legal Basis: ${result.legalBasis}\n`);
}

// ============================================================================
// EXAMPLE 2: Constitutional Writ in High Court
// ============================================================================

export function example2_ConstitutionalWrit() {
  console.log("=== Example 2: Constitutional Writ (Article 226) ===\n");

  const input: RuleMatchInput = {
    caseCategory: "constitutional_writ",
    jurisdiction: "high_court",
  };

  const orderDate = "2024-05-10";
  const result = calculateDeadlineForCase(input, orderDate);

  console.log(`Statute: ${result.statute}`);
  console.log(`Article/Section: ${result.articleOrSection}`);
  console.log(`Deadline: ${result.deadlineFormatted}`);
  console.log(`Days Remaining: ${result.daysRemainingFormatted}\n`);
}

// ============================================================================
// EXAMPLE 3: Service Law Appeal - Government as Respondent
// ============================================================================

export function example3_ServiceLawAppeal() {
  console.log("=== Example 3: Service Law Appeal - Government as Respondent ===\n");

  const input: RuleMatchInput = {
    caseCategory: "service_law",
    jurisdiction: "tribunal",
    governmentRole: "respondent",
  };

  const orderDate = "2024-04-15"; // CAT order date
  const result = calculateDeadlineForCase(input, orderDate);

  console.log(`Tribunal: ${result.statute}`);
  console.log(`Rule: ${result.articleOrSection}`);
  console.log(`Deadline: ${result.deadlineFormatted}`);
  console.log(`Days Remaining: ${result.daysRemainingFormatted}`);
  console.log(`Urgency Level: ${result.urgencyLevel}\n`);

  // Check if escalation is needed
  if (requiresEscalation(result.daysRemaining)) {
    console.log("⚠️  ESCALATION REQUIRED: Case needs immediate attention\n");
  }
}

// ============================================================================
// EXAMPLE 4: Criminal Appeal to Supreme Court
// ============================================================================

export function example4_CriminalAppealSC() {
  console.log("=== Example 4: Criminal Appeal to Supreme Court ===\n");

  const input: RuleMatchInput = {
    caseCategory: "criminal_appeal",
    jurisdiction: "supreme_court",
  };

  const orderDate = "2024-05-01"; // High Court judgment date
  const result = calculateDeadlineForCase(input, orderDate);

  console.log(`Statute: ${result.statute}`);
  console.log(`Section: ${result.articleOrSection}`);
  console.log(`Limitation: ${result.limitationDays} days from judgment`);
  console.log(`Deadline: ${result.deadlineFormatted}`);
  console.log(`Status: ${result.daysRemainingFormatted}\n`);
}

// ============================================================================
// EXAMPLE 5: Tax Tribunal Appeal
// ============================================================================

export function example5_TaxTribunal() {
  console.log("=== Example 5: Tax Tribunal Appeal (Income Tax) ===\n");

  const input: RuleMatchInput = {
    caseCategory: "tax_tribunal",
    jurisdiction: "tribunal",
  };

  const orderDate = "2024-03-15"; // Income Tax Officer order
  const result = calculateDeadlineForCase(input, orderDate);

  console.log(`Statute: ${result.statute}`);
  console.log(`Section: ${result.articleOrSection}`);
  console.log(`Limitation: ${result.limitationDays} days`);
  console.log(`Deadline: ${result.deadlineFormatted}`);
  console.log(`Legal Basis: ${result.legalBasis}\n`);
}

// ============================================================================
// EXAMPLE 6: Finding All Applicable Rules for a Scenario
// ============================================================================

export function example6_FindAllApplicableRules() {
  console.log("=== Example 6: All Applicable Rules for Service Law in High Court ===\n");

  const input: RuleMatchInput = {
    caseCategory: "service_law",
    jurisdiction: "high_court",
    governmentRole: "respondent",
  };

  const allRules = findAllApplicableRules(input);

  console.log(`Found ${allRules.length} applicable rule(s):\n`);
  allRules.forEach((rule, index) => {
    console.log(
      `${index + 1}. ${rule.statute} (${rule.articleOrSection})`
    );
    console.log(`   Priority: ${rule.priority}`);
    console.log(`   Limitation: ${rule.limitationDays} days`);
    console.log(`   Description: ${rule.description}\n`);
  });
}

// ============================================================================
// EXAMPLE 7: Urgency Status for Case Dashboard
// ============================================================================

export function example7_UrgencyStatusDashboard() {
  console.log("=== Example 7: Dashboard Display of Multiple Cases ===\n");

  const cases = [
    {
      caseId: 101,
      name: "Civil Appeal - HC",
      input: {
        caseCategory: "civil_appeal" as const,
        jurisdiction: "high_court" as const,
      },
      orderDate: "2024-04-20",
    },
    {
      caseId: 102,
      name: "Criminal Appeal - SC",
      input: {
        caseCategory: "criminal_appeal" as const,
        jurisdiction: "supreme_court" as const,
      },
      orderDate: "2024-05-08",
    },
    {
      caseId: 103,
      name: "Constitutional Writ - HC",
      input: {
        caseCategory: "constitutional_writ" as const,
        jurisdiction: "high_court" as const,
      },
      orderDate: "2024-05-10",
    },
  ];

  console.log("Case Status Summary:");
  console.log("-".repeat(70) + "\n");

  cases.forEach((caseData) => {
    const result = calculateDeadlineForCase(caseData.input, caseData.orderDate);
    const summary = generateLimitationSummary(caseData.caseId, result);

    console.log(`Case ${caseData.caseId}: ${caseData.name}`);
    console.log(summary);
    console.log("-".repeat(70) + "\n");
  });
}

// ============================================================================
// EXAMPLE 8: Validation Before Calculation
// ============================================================================

export function example8_ValidationBeforeCalculation() {
  console.log("=== Example 8: Validate Rule Existence Before Processing ===\n");

  const testCases = [
    {
      category: "civil_appeal",
      jurisdiction: "high_court",
      valid: true,
    },
    {
      category: "civil_appeal",
      jurisdiction: "supreme_court",
      valid: true,
    },
    {
      category: "unknown_category",
      jurisdiction: "high_court",
      valid: false,
    },
  ];

  testCases.forEach((testCase) => {
    const input: RuleMatchInput = {
      caseCategory: testCase.category as any,
      jurisdiction: testCase.jurisdiction as any,
    };

    const isValid = hasApplicableRule(input);
    const status = isValid ? "✓ Valid" : "✗ Invalid";

    console.log(
      `${status}: ${testCase.category} in ${testCase.jurisdiction}`
    );
    console.log(`  Expected: ${testCase.valid}, Got: ${isValid}\n`);
  });
}

// ============================================================================
// EXAMPLE 9: Error Handling
// ============================================================================

export function example9_ErrorHandling() {
  console.log("=== Example 9: Error Handling ===\n");

  try {
    const invalidInput: RuleMatchInput = {
      caseCategory: "invalid_category" as any,
      jurisdiction: "high_court",
    };

    calculateDeadlineForCase(invalidInput, "2024-05-13");
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Error caught: ${error.message}`);
      console.log(`Error type: ${error.constructor.name}\n`);
    }
  }

  try {
    const validInput: RuleMatchInput = {
      caseCategory: "civil_appeal",
      jurisdiction: "high_court",
    };

    calculateDeadlineForCase(validInput, "invalid-date");
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Date error caught: ${error.message}\n`);
    }
  }
}

// ============================================================================
// EXAMPLE 10: Getting Rules by Category
// ============================================================================

export function example10_RulesByCategory() {
  console.log("=== Example 10: All Rules by Category ===\n");

  const categories = [
    "constitutional_writ",
    "civil_appeal",
    "criminal_appeal",
    "service_law",
    "tax_tribunal",
  ];

  categories.forEach((category) => {
    const rules = getRulesByCategory(category);
    console.log(`${category}:`);
    console.log(`  Total active rules: ${rules.length}`);

    rules.slice(0, 2).forEach((rule) => {
      console.log(`  - ${rule.statute} (${rule.articleOrSection})`);
    });

    if (rules.length > 2) {
      console.log(`  ... and ${rules.length - 2} more\n`);
    } else {
      console.log("");
    }
  });
}

// ============================================================================
// EXAMPLE 11: Rule Statistics
// ============================================================================

export function example11_RuleStatistics() {
  console.log("=== Example 11: Rule Registry Statistics ===\n");

  const allRules = getAllActiveRules();

  console.log(`Total Active Rules: ${allRules.length}`);
  console.log(
    `Highest Priority Rule: ${allRules.sort((a, b) => b.priority - a.priority)[0].id}`
  );

  // Group by category
  const byCategory: Record<string, number> = {};
  allRules.forEach((rule) => {
    byCategory[rule.caseCategory] = (byCategory[rule.caseCategory] || 0) + 1;
  });

  console.log(`\nRules by Category:`);
  Object.entries(byCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} rules`);
  });

  // Group by jurisdiction
  const byJurisdiction: Record<string, number> = {};
  allRules.forEach((rule) => {
    byJurisdiction[rule.jurisdiction] =
      (byJurisdiction[rule.jurisdiction] || 0) + 1;
  });

  console.log(`\nRules by Jurisdiction:`);
  Object.entries(byJurisdiction).forEach(([jurisdiction, count]) => {
    console.log(`  ${jurisdiction}: ${count} rules\n`);
  });
}

// ============================================================================
// EXAMPLE 12: State-Specific Rules
// ============================================================================

export function example12_StateSpecificRules() {
  console.log("=== Example 12: State-Specific Rule Matching ===\n");

  const input: RuleMatchInput = {
    caseCategory: "constitutional_writ",
    jurisdiction: "high_court",
    state: "MH", // Maharashtra
  };

  const rule = findApplicableRule(input);

  console.log(`For Maharashtra High Court Constitutional Writ:`);
  console.log(`  Rule ID: ${rule.id}`);
  console.log(`  Statute: ${rule.statute}`);
  console.log(`  Article: ${rule.articleOrSection}`);
  console.log(`  Limitation: ${rule.limitationDays} days`);
  if (rule.applicableStates) {
    console.log(`  Applicable States: ${rule.applicableStates.join(", ")}\n`);
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export function runAllExamples() {
  example1_BasicCivilAppeal();
  example2_ConstitutionalWrit();
  example3_ServiceLawAppeal();
  example4_CriminalAppealSC();
  example5_TaxTribunal();
  example6_FindAllApplicableRules();
  example7_UrgencyStatusDashboard();
  example8_ValidationBeforeCalculation();
  example9_ErrorHandling();
  example10_RulesByCategory();
  example11_RuleStatistics();
  example12_StateSpecificRules();
}

// To run examples (in a Node.js environment):
// runAllExamples();
