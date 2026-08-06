/**
 * Verdict system tests — the trust UI must be unambiguous:
 * all 7 states render distinct labels, icons AND text (never color-only),
 * and the panel announces via role=status (a11y, spec §12).
 */
import { render, screen } from "@testing-library/react";
import { VERDICTS, type Verdict } from "@/constants";
import { CheckList, VerdictBadge, VerdictPanel } from "@/components/domain/verdict";

const ALL: Verdict[] = ["VALID", "REVOKED", "SUPERSEDED", "EXPIRED", "TAMPERED", "UNKNOWN_ISSUER", "SUSPENDED_ISSUER"];

describe("VerdictBadge", () => {
  it.each(ALL)("renders a text label for %s (never color-only)", (verdict) => {
    render(<VerdictBadge verdict={verdict} />);
    expect(screen.getByText(VERDICTS[verdict].label)).toBeInTheDocument();
  });

  it("all seven labels are distinct", () => {
    const labels = ALL.map((v) => VERDICTS[v].label);
    expect(new Set(labels).size).toBe(7);
  });
});

describe("VerdictPanel", () => {
  it("announces the verdict via role=status with explanation", () => {
    render(<VerdictPanel verdict="VALID" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Valid certificate");
    expect(status).toHaveTextContent(/cryptographically verified/i);
  });

  it("TAMPERED carries the do-not-rely warning", () => {
    render(<VerdictPanel verdict="TAMPERED" />);
    expect(screen.getByRole("status")).toHaveTextContent(/do not rely on it/i);
  });
});

describe("CheckList", () => {
  it("shows pass/fail per check with plain-language labels", () => {
    render(
      <CheckList
        checks={{
          integrity: { pass: true },
          merkle_proof: { pass: true },
          anchor: { pass: false },
          revocation: { pass: true },
        }}
      />,
    );
    expect(screen.getByText("Content integrity")).toBeInTheDocument();
    expect(screen.getByText("Blockchain record")).toBeInTheDocument();
    expect(screen.getAllByText("Passed")).toHaveLength(3);
    expect(screen.getAllByText("Failed")).toHaveLength(1);
  });
});
