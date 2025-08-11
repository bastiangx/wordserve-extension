// @ts-nocheck

import {BILLING_FIELD_REGEX, CREDIT_FIELD_REGEX, EMAIL_FIELD_REGEX, GOV_ID_REGEX,} from "../src/lib/domains";

describe("Field Regex patterns", () => {
  it("should match common credit field names", () => {
    expect(CREDIT_FIELD_REGEX.test("credit-card-number")).toBe(true);
    expect(CREDIT_FIELD_REGEX.test("cvc")).toBe(true);
    expect(CREDIT_FIELD_REGEX.test("expiry_date")).toBe(true);
  });
  it("should match billing fields", () => {
    expect(BILLING_FIELD_REGEX.test("billingAddress")).toBe(true);
    expect(BILLING_FIELD_REGEX.test("postal-code")).toBe(true);
  });
  it("should match government ID fields", () => {
    expect(GOV_ID_REGEX.test("passport_number")).toBe(true);
    expect(GOV_ID_REGEX.test("driver license")).toBe(true);
  });
  it("should match email fields", () => {
    expect(EMAIL_FIELD_REGEX.test("email")).toBe(true);
    expect(EMAIL_FIELD_REGEX.test("e-mail")).toBe(true);
  });
});
