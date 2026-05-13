/**
 * VerdictIQ Statutory Limitation Engine - Rule Registry
 * 
 * Comprehensive structured rule registry for Indian judicial limitations.
 * Designed for extensibility and database migration compatibility.
 * 
 * Each rule maps:
 *   case category + jurisdiction + role → statute → limitation period
 */

import type { LimitationRule } from "./types";

/**
 * Master rule registry
 * 
 * Architecture:
 * - Array-based for ordered priority evaluation
 * - Each rule is immutable
 * - Easily filterable and expandable
 * - Database-migration-ready (can be moved to DB with zero code changes)
 * 
 * Priority ordering:
 * - Rules are evaluated in descending priority order
 * - First match wins
 * - Role-specific rules take precedence over generic rules
 */
export const LIMITATION_RULES: LimitationRule[] = [
  // ============================================================================
  // CONSTITUTIONAL WRITS - HIGHEST PRIORITY
  // ============================================================================

  {
    id: "const_writ_sc_petition",
    caseCategory: "constitutional_writ",
    jurisdiction: "supreme_court",
    statute: "Constitution of India",
    articleOrSection: "Article 32",
    limitationDays: 30,
    description: "Constitutional petition under Article 32 in Supreme Court",
    priority: 1000,
    isActive: true,
    legalBasis:
      "Article 32 - Supreme Court can issue constitutional remedies. Practice recognized in SC jurisprudence.",
  },

  {
    id: "const_writ_hc_petition",
    caseCategory: "constitutional_writ",
    jurisdiction: "high_court",
    statute: "Constitution of India",
    articleOrSection: "Article 226",
    limitationDays: 30,
    description: "Constitutional petition under Article 226 in High Court",
    priority: 980,
    isActive: true,
    legalBasis:
      "Article 226 - High Court can issue constitutional remedies. State-specific limitation precedent applicable.",
    applicableStates: ["DL", "MH", "KA", "TN", "GJ"],
  },

  // ============================================================================
  // CIVIL APPEALS
  // ============================================================================

  {
    id: "civil_appeal_sc",
    caseCategory: "civil_appeal",
    jurisdiction: "supreme_court",
    statute: "Civil Procedure Code (CPC)",
    articleOrSection: "Section 21",
    limitationDays: 90,
    description: "Civil appeal to Supreme Court from High Court judgment",
    priority: 950,
    isActive: true,
    legalBasis:
      "CPC Section 21: Special appeal lies to SC from High Court judgment affecting constitutional questions. 90-day limitation from judgment date.",
  },

  {
    id: "civil_appeal_hc",
    caseCategory: "civil_appeal",
    jurisdiction: "high_court",
    statute: "Civil Procedure Code (CPC)",
    articleOrSection: "Section 21",
    limitationDays: 90,
    description: "Appeal to High Court from District Court judgment",
    priority: 940,
    isActive: true,
    legalBasis:
      "CPC Section 21: Second appeal lies on questions of law. 90-day limitation from District Court judgment.",
  },

  {
    id: "civil_appeal_dc",
    caseCategory: "civil_appeal",
    jurisdiction: "district_court",
    statute: "Civil Procedure Code (CPC)",
    articleOrSection: "Section 21",
    limitationDays: 60,
    description: "Appeal from subordinate court judgment at District level",
    priority: 930,
    isActive: true,
    legalBasis:
      "CPC Section 21: Appeal from subordinate court. 60-day limitation from judgment date.",
  },

  // ============================================================================
  // CRIMINAL APPEALS & PETITIONS
  // ============================================================================

  {
    id: "criminal_appeal_sc",
    caseCategory: "criminal_appeal",
    jurisdiction: "supreme_court",
    statute: "Criminal Procedure Code (CrPC)",
    articleOrSection: "Section 379",
    limitationDays: 30,
    description: "Criminal appeal to Supreme Court",
    priority: 920,
    isActive: true,
    legalBasis:
      "CrPC Section 379: Criminal appeal to SC from High Court. 30-day limitation from High Court judgment/order.",
  },

  {
    id: "criminal_appeal_hc",
    caseCategory: "criminal_appeal",
    jurisdiction: "high_court",
    statute: "Criminal Procedure Code (CrPC)",
    articleOrSection: "Section 377",
    limitationDays: 60,
    description: "Criminal appeal to High Court from Session/Lower court",
    priority: 910,
    isActive: true,
    legalBasis:
      "CrPC Section 377: Criminal appeal to High Court. 60-day limitation from Session court judgment.",
  },

  {
    id: "criminal_revision_hc",
    caseCategory: "criminal_appeal",
    jurisdiction: "high_court",
    statute: "Criminal Procedure Code (CrPC)",
    articleOrSection: "Section 401",
    limitationDays: 45,
    description: "Criminal revision petition in High Court",
    priority: 900,
    isActive: true,
    legalBasis:
      "CrPC Section 401: Discretionary jurisdiction for High Court revision. 45-day recommended limitation.",
  },

  // ============================================================================
  // GOVERNMENT ROLE SPECIFIC - SERVICE LAW & ADMINISTRATIVE
  // ============================================================================

  {
    id: "service_law_appeal_cat",
    caseCategory: "service_law",
    jurisdiction: "tribunal",
    governmentRole: "respondent",
    statute: "Central Administrative Tribunal Act (CAT Act)",
    articleOrSection: "Section 21",
    limitationDays: 90,
    description: "Service matter appeal in Central Administrative Tribunal",
    priority: 890,
    isActive: true,
    legalBasis:
      "CAT Act Section 21 & Rules: Appeal to CAT from departmental orders. 90-day limitation from order date.",
  },

  {
    id: "service_law_appeal_hc",
    caseCategory: "service_law",
    jurisdiction: "high_court",
    governmentRole: "respondent",
    statute: "Civil Procedure Code (CPC)",
    articleOrSection: "Section 21",
    limitationDays: 120,
    description: "Service matter appeal in High Court",
    priority: 880,
    isActive: true,
    legalBasis:
      "Service law jurisprudence: Appeals from CAT or administrative orders. 120-day limitation recognized in judicial precedent.",
  },

  {
    id: "service_law_writ_hc",
    caseCategory: "service_law",
    jurisdiction: "high_court",
    governmentRole: "respondent",
    statute: "Constitution of India",
    articleOrSection: "Article 226",
    limitationDays: 60,
    description: "Service matter writ petition in High Court",
    priority: 870,
    isActive: true,
    legalBasis:
      "Article 226 & Service Law principles: Writ jurisdiction for service matters. 60-day limitation from adverse order.",
  },

  // ============================================================================
  // TAX TRIBUNAL & REGULATORY
  // ============================================================================

  {
    id: "tax_tribunal_appeal",
    caseCategory: "tax_tribunal",
    jurisdiction: "tribunal",
    statute: "Income Tax Act / GST Laws",
    articleOrSection: "Section 254 / Rule 248",
    limitationDays: 120,
    description: "Appeal to Income Tax Appellate Tribunal",
    priority: 860,
    isActive: true,
    legalBasis:
      "IT Act Section 254: Appeal to IT Appellate Tribunal. 120-day limitation from tribunal/income tax order.",
  },

  {
    id: "tax_tribunal_sc_appeal",
    caseCategory: "tax_tribunal",
    jurisdiction: "supreme_court",
    statute: "Income Tax Act",
    articleOrSection: "Section 262",
    limitationDays: 90,
    description: "Tax case appeal to Supreme Court",
    priority: 850,
    isActive: true,
    legalBasis:
      "IT Act Section 262: Appeal to SC on legal questions. 90-day limitation from tribunal judgment.",
  },

  // ============================================================================
  // LAND ACQUISITION & PROPERTY
  // ============================================================================

  {
    id: "land_acquisition_appeal",
    caseCategory: "land_acquisition",
    jurisdiction: "high_court",
    governmentRole: "respondent",
    statute: "Land Acquisition Act (LAA) / Right to Fair Compensation Act",
    articleOrSection: "Section 34",
    limitationDays: 90,
    description: "Appeal in land acquisition matter",
    priority: 840,
    isActive: true,
    legalBasis:
      "LAA Section 34 & compensation jurisprudence: Appeal from Land Acquisition Officer/District Court. 90-day limitation.",
  },

  {
    id: "land_acquisition_reference",
    caseCategory: "land_acquisition",
    jurisdiction: "district_court",
    governmentRole: "respondent",
    statute: "Land Acquisition Act",
    articleOrSection: "Section 18",
    limitationDays: 120,
    description: "Reference for increase in compensation (LAA Section 18)",
    priority: 830,
    isActive: true,
    legalBasis:
      "LAA Section 18: Reference for compensation increase. 120-day limitation from publication date.",
  },

  // ============================================================================
  // LABOR LAW & INDUSTRIAL
  // ============================================================================

  {
    id: "labor_tribunal_appeal",
    caseCategory: "labor",
    jurisdiction: "tribunal",
    statute: "Industrial Disputes Act (IDA)",
    articleOrSection: "Section 7 / Rule 23",
    limitationDays: 45,
    description: "Appeal from Labor Tribunal decision",
    priority: 820,
    isActive: true,
    legalBasis:
      "IDA Section 7: Industrial disputes. 45-day limitation for appeal from labor tribunal recognized in precedent.",
  },

  {
    id: "labor_hc_appeal",
    caseCategory: "labor",
    jurisdiction: "high_court",
    statute: "Industrial Disputes Act",
    articleOrSection: "Section 7",
    limitationDays: 90,
    description: "High Court appeal in labor matter",
    priority: 810,
    isActive: true,
    legalBasis:
      "IDA jurisprudence: Appeal to High Court from tribunal. 90-day limitation established in judicial practice.",
  },

  // ============================================================================
  // ENVIRONMENTAL & REGULATORY
  // ============================================================================

  {
    id: "environmental_tribunal_appeal",
    caseCategory: "environmental",
    jurisdiction: "tribunal",
    statute: "National Green Tribunal Act / Environmental Laws",
    articleOrSection: "Section 16",
    limitationDays: 45,
    description: "Appeal to National Green Tribunal",
    priority: 800,
    isActive: true,
    legalBasis:
      "NGT Act Section 16: Appeal to NGT. 45-day limitation from order date.",
  },

  {
    id: "environmental_hc_appeal",
    caseCategory: "environmental",
    jurisdiction: "high_court",
    statute: "Constitution of India / Environmental Laws",
    articleOrSection: "Article 226 / Article 32",
    limitationDays: 60,
    description: "Environmental matter writ petition",
    priority: 790,
    isActive: true,
    legalBasis:
      "Constitutional jurisprudence: Environmental protection matters. 60-day limitation recognized in Supreme Court precedent.",
  },

  // ============================================================================
  // REGULATORY & COMMERCIAL
  // ============================================================================

  {
    id: "commercial_appeal_hc",
    caseCategory: "commercial",
    jurisdiction: "high_court",
    statute: "Civil Procedure Code (CPC)",
    articleOrSection: "Section 21",
    limitationDays: 90,
    description: "Commercial matter appeal in High Court",
    priority: 780,
    isActive: true,
    legalBasis:
      "CPC Section 21: Commercial disputes. 90-day limitation from District Court judgment.",
  },

  {
    id: "regulatory_appeal_tribunal",
    caseCategory: "regulatory",
    jurisdiction: "tribunal",
    statute: "Applicable Regulatory Statute",
    articleOrSection: "General",
    limitationDays: 60,
    description: "Regulatory tribunal appeal",
    priority: 770,
    isActive: true,
    legalBasis:
      "Standard regulatory practice: Appeal to tribunal. 60-day limitation from order date.",
  },

  // ============================================================================
  // FAMILY LAW
  // ============================================================================

  {
    id: "family_appeal_hc",
    caseCategory: "family",
    jurisdiction: "high_court",
    statute: "Hindu Marriage Act / Indian Succession Act",
    articleOrSection: "Section 28 / CPC Section 21",
    limitationDays: 90,
    description: "Family matter appeal in High Court",
    priority: 760,
    isActive: true,
    legalBasis:
      "CPC & family law: Appeals in marriage/succession matters. 90-day limitation from judgment.",
  },

  // ============================================================================
  // GENERAL/FALLBACK RULES
  // ============================================================================

  {
    id: "general_appeal_fallback",
    caseCategory: "custom",
    jurisdiction: "high_court",
    statute: "Civil Procedure Code (CPC)",
    articleOrSection: "Section 21",
    limitationDays: 90,
    description: "General appeal (fallback rule)",
    priority: 100,
    isActive: true,
    legalBasis: "CPC Section 21: General appeal limitation. 90-day standard.",
  },

  {
    id: "general_petition_fallback",
    caseCategory: "custom",
    jurisdiction: "high_court",
    statute: "Constitution of India",
    articleOrSection: "Article 226",
    limitationDays: 30,
    description: "General petition (fallback rule)",
    priority: 90,
    isActive: true,
    legalBasis:
      "Article 226: Constitutional remedies. 30-day limitation recognized in practice.",
  },
];

/**
 * Get all active rules
 */
export function getAllActiveRules(): LimitationRule[] {
  return LIMITATION_RULES.filter((rule) => rule.isActive);
}

/**
 * Get rules by category
 */
export function getRulesByCategory(
  category: string
): LimitationRule[] {
  return LIMITATION_RULES.filter(
    (rule) => rule.isActive && rule.caseCategory === category
  );
}

/**
 * Get rules by jurisdiction
 */
export function getRulesByJurisdiction(
  jurisdiction: string
): LimitationRule[] {
  return LIMITATION_RULES.filter(
    (rule) => rule.isActive && rule.jurisdiction === jurisdiction
  );
}

/**
 * Sort rules by priority (descending)
 */
export function sortRulesByPriority(rules: LimitationRule[]): LimitationRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}
