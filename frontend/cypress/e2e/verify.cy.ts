/**
 * E2E scaffold — golden verification path against a running stack
 * (backend on :5000 with seed data, frontend dev server on :3000).
 *
 * Run: npm run e2e  (requires `npx cypress install` once + both servers up;
 * the CERT_UID env var should point at a seeded certificate).
 */
describe("Public verification", () => {
  const certUid = Cypress.env("CERT_UID") ?? "TC-0000-0000-0000";

  it("shows a clear not-found state for unknown IDs", () => {
    cy.visit("/v/TC-0000-0000-0000");
    cy.contains(/no certificate found/i).should("be.visible");
  });

  it("verifies a seeded certificate end-to-end", function () {
    if (certUid === "TC-0000-0000-0000") this.skip(); // no seed configured
    cy.visit(`/v/${certUid}`);
    cy.findByRole("status").should("contain.text", "Valid certificate");
    cy.contains("Verification checks").should("be.visible");
    cy.contains("Proof & blockchain details").click();
    cy.contains(/merkle root/i).should("be.visible");
  });

  it("verify hub validates ID format before navigating", () => {
    cy.visit("/verify");
    cy.findByLabelText(/certificate id/i).type("garbage");
    cy.findByRole("button", { name: /^verify$/i }).click();
    cy.contains(/doesn't look like a certificate id/i).should("be.visible");
  });
});
