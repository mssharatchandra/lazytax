import { z } from "zod";

const ASSESSMENT_YEAR = "2026-27" as const;
const PRIVATE_REVIEW_DISCLAIMER =
  "Private local review only. LazyTax does not file a return and is not tax, legal, or financial advice. Verify all figures against AIS, Form 26AS, the official filing utility, and a qualified professional before acting." as const;

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use a real calendar date in YYYY-MM-DD format.");

const OpaqueIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/);

const UsStockTradeBaseSchema = z.object({
  trade_id: OpaqueIdSchema,
  ticker: z.string().regex(/^[A-Z][A-Z0-9.-]{0,14}$/),
  trade_date: IsoDateSchema,
  quantity: z.number().positive().max(1_000_000_000),
  price_usd: z.number().positive().max(10_000_000),
  fees_usd: z.number().nonnegative().max(1_000_000).default(0),
  source_ref: OpaqueIdSchema
});

export const UsStockTradeSchema = z.discriminatedUnion("side", [
  UsStockTradeBaseSchema.extend({
    side: z.literal("buy"),
    documented_acquisition_cost_inr: z.number().int().positive().max(1_000_000_000)
  }).strict(),
  UsStockTradeBaseSchema.extend({
    side: z.literal("sell"),
    sbi_tt_buying_rate_inr_per_usd: z.number().positive().max(1_000),
    fx_rate_date: IsoDateSchema
  }).strict()
]);
export type UsStockTrade = z.infer<typeof UsStockTradeSchema>;

export const ForeignEquityDisclosureSchema = z
  .object({
    disclosure_id: OpaqueIdSchema,
    ticker: z.string().regex(/^[A-Z][A-Z0-9.-]{0,14}$/),
    entity_name: z.string().min(1).max(160),
    acquired_on: IsoDateSchema,
    initial_value_inr: z.number().int().nonnegative().max(1_000_000_000),
    peak_value_inr: z.number().int().nonnegative().max(1_000_000_000),
    closing_value_inr: z.number().int().nonnegative().max(1_000_000_000),
    gross_credits_inr: z.number().int().nonnegative().max(1_000_000_000),
    gross_sale_proceeds_inr: z.number().int().nonnegative().max(1_000_000_000),
    source_ref: OpaqueIdSchema
  })
  .strict();
export type ForeignEquityDisclosure = z.infer<typeof ForeignEquityDisclosureSchema>;

export const ForeignCustodianDisclosureSchema = z
  .object({
    account_ref: OpaqueIdSchema,
    institution_ref: OpaqueIdSchema,
    opened_on: IsoDateSchema,
    peak_balance_inr: z.number().int().nonnegative().max(1_000_000_000),
    closing_balance_inr: z.number().int().nonnegative().max(1_000_000_000),
    gross_credits_inr: z.number().int().nonnegative().max(1_000_000_000),
    source_ref: OpaqueIdSchema
  })
  .strict();
export type ForeignCustodianDisclosure = z.infer<typeof ForeignCustodianDisclosureSchema>;

const MaskedForeignEquityDisclosureSchema = ForeignEquityDisclosureSchema.extend({
  disclosure_id: z.string().regex(/^disclosure_[a-f0-9]{16}$/),
  source_ref: z.string().regex(/^src_[a-f0-9]{16}$/)
}).strict();

const MaskedForeignCustodianDisclosureSchema = ForeignCustodianDisclosureSchema.extend({
  account_ref: z.string().regex(/^account_[a-f0-9]{16}$/),
  institution_ref: z.string().regex(/^institution_[a-f0-9]{16}$/),
  source_ref: z.string().regex(/^src_[a-f0-9]{16}$/)
}).strict();

export const UsStockComputationInputSchema = z
  .object({
    data_mode: z.literal("local_private"),
    assessment_year: z.literal(ASSESSMENT_YEAR),
    financial_year: z.literal("FY2025-26"),
    schedule_fa_calendar_year_end: z.literal("2025-12-31"),
    country_code: z.literal("002"),
    currency: z.literal("USD"),
    is_resident_and_ordinarily_resident: z.literal(true),
    asset_classification: z.literal("investment"),
    lot_method: z.literal("FIFO"),
    conversion_policy: z.literal("documented_inr_cost_and_rule115_sale"),
    trades: z.array(UsStockTradeSchema).max(10_000).default([]),
    equity_disclosures: z.array(ForeignEquityDisclosureSchema).max(5_000).default([]),
    custodian_disclosure: ForeignCustodianDisclosureSchema.optional(),
    has_corporate_actions: z.literal(false),
    has_employee_equity: z.literal(false),
    has_derivatives: z.literal(false),
    has_short_sales: z.literal(false),
    foreign_tax_on_capital_gains_inr: z.literal(0)
  })
  .strict()
  .refine(
    (value) => value.trades.length > 0 || value.equity_disclosures.length > 0,
    "Provide at least one trade or one Schedule FA equity-disclosure row."
  );
export type UsStockComputationInput = z.infer<typeof UsStockComputationInputSchema>;

export const UsStockMatchedLotSchema = z
  .object({
    ticker: z.string(),
    buy_trade_id: z.string().regex(/^trade_[a-f0-9]{16}$/),
    sell_trade_id: z.string().regex(/^trade_[a-f0-9]{16}$/),
    buy_source_ref: z.string().regex(/^src_[a-f0-9]{16}$/),
    sell_source_ref: z.string().regex(/^src_[a-f0-9]{16}$/),
    acquired_on: IsoDateSchema,
    sold_on: IsoDateSchema,
    quantity: z.number().positive(),
    holding_period_days: z.number().int().nonnegative(),
    classification: z.enum(["short_term_normal_rate", "long_term_section_112"]),
    acquisition_cost_inr: z.number().int().nonnegative(),
    sale_value_inr: z.number().int().nonnegative(),
    transfer_expenses_inr: z.number().int().nonnegative(),
    gain_loss_inr: z.number().int()
  })
  .strict();
export type UsStockMatchedLot = z.infer<typeof UsStockMatchedLotSchema>;

export const UsStockOpenLotSchema = z
  .object({
    ticker: z.string(),
    buy_trade_id: z.string().regex(/^trade_[a-f0-9]{16}$/),
    source_ref: z.string().regex(/^src_[a-f0-9]{16}$/),
    acquired_on: IsoDateSchema,
    remaining_quantity: z.number().positive(),
    remaining_cost_inr: z.number().int().nonnegative()
  })
  .strict();
export type UsStockOpenLot = z.infer<typeof UsStockOpenLotSchema>;

export const UsStockTaxBridgeEntrySchema = z
  .object({
    id: z.string(),
    label: z.string(),
    category: z.enum(["foreign_stock_stcg", "foreign_stock_ltcg"]),
    amount_inr: z.number().int().nonnegative(),
    locator: z.string()
  })
  .strict();

export const UsStockComputationResultSchema = z
  .object({
    schema_version: z.literal("lazytax.us-stocks.v1"),
    data_mode: z.literal("local_private"),
    assessment_year: z.literal(ASSESSMENT_YEAR),
    financial_year: z.literal("FY2025-26"),
    schedule_fa_calendar_year_end: z.literal("2025-12-31"),
    country_code: z.literal("002"),
    currency: z.literal("USD"),
    lot_method: z.literal("FIFO"),
    conversion_policy: z.literal("documented_inr_cost_and_rule115_sale"),
    matched_lots: z.array(UsStockMatchedLotSchema),
    open_lots: z.array(UsStockOpenLotSchema),
    totals: z
      .object({
        short_term_gains_inr: z.number().int().nonnegative(),
        short_term_losses_inr: z.number().int().nonnegative(),
        long_term_gains_inr: z.number().int().nonnegative(),
        long_term_losses_inr: z.number().int().nonnegative(),
        net_short_term_inr: z.number().int(),
        net_long_term_inr: z.number().int(),
        gross_sale_value_inr: z.number().int().nonnegative(),
        transfer_expenses_inr: z.number().int().nonnegative(),
        acquisition_cost_inr: z.number().int().nonnegative()
      })
      .strict(),
    ready_for_supported_tax_calculation: z.boolean(),
    tax_bridge_entries: z.array(UsStockTaxBridgeEntrySchema),
    schedule_cg: z
      .object({
        short_term_gain_taxed_at_normal_rates_inr: z.number().int().nonnegative(),
        long_term_section_112_gain_inr: z.number().int().nonnegative(),
        long_term_rate_percent: z.literal(12.5),
        losses_requiring_setoff_review_inr: z.number().int().nonnegative()
      })
      .strict(),
    schedule_fsi: z
      .object({
        head_of_income: z.literal("Capital Gains"),
        foreign_income_inr: z.number().int(),
        foreign_tax_paid_inr: z.literal(0),
        relief_available_inr: z.literal(0),
        treaty_article_review_required: z.literal(true)
      })
      .strict(),
    schedule_fa: z
      .object({
        calendar_year_end: z.literal("2025-12-31"),
        custodian: MaskedForeignCustodianDisclosureSchema.optional(),
        foreign_equities: z.array(MaskedForeignEquityDisclosureSchema),
        requires_raw_identifiers_at_filing: z.literal(true)
      })
      .strict(),
    source_set_hash: z.string().regex(/^[a-f0-9]{64}$/),
    warnings: z.array(z.string()),
    unsupported_items: z.array(z.string()),
    official_rule_urls: z.array(z.string().url()),
    disclaimer: z.literal(PRIVATE_REVIEW_DISCLAIMER)
  })
  .strict();
export type UsStockComputationResult = z.infer<typeof UsStockComputationResultSchema>;
