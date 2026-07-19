import assert from "node:assert/strict";
import test from "node:test";
import { FixtureDocumentSchema, TaxpayerProfileSchema } from "../src/index.js";

test("fixture schema rejects real documents", () => {
  const parsed = FixtureDocumentSchema.safeParse({
    id: "form16",
    kind: "form16",
    display_name: "Form 16",
    synthetic: false,
    entries: []
  });
  assert.equal(parsed.success, false);
});

test("supported profile rejects business income", () => {
  const parsed = TaxpayerProfileSchema.safeParse({
    assessment_year: "2026-27",
    residency: "resident",
    entity_type: "individual",
    age: 35,
    has_business_or_professional_income: true,
    has_foreign_income_or_assets: false,
    has_house_property_income: false,
    has_crypto_or_other_special_rate_income: false,
    claims_deductions_beyond_standard_deduction: false
  });
  assert.equal(parsed.success, false);
});
