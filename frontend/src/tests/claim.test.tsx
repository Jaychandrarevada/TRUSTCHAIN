/**
 * Claim flow tests — validation UX + success + identity-mismatch guidance
 * (the API is mocked; the form/validation logic is real).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ClaimPage from "@/pages/student/ClaimPage";
import { walletApi } from "@/services/api";
import { ApiError } from "@/services/http";

vi.mock("@/services/api", () => ({
  walletApi: { claim: vi.fn() },
}));

function renderClaim() {
  return render(<MemoryRouter><ClaimPage /></MemoryRouter>);
}

describe("ClaimPage", () => {
  it("rejects malformed certificate IDs client-side", async () => {
    renderClaim();
    await userEvent.type(screen.getByLabelText(/certificate id/i), "not-a-cert-id");
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: /claim certificate/i }));
    expect(await screen.findByText(/look like TC-XXXX/i)).toBeInTheDocument();
    expect(walletApi.claim).not.toHaveBeenCalled();
  });

  it("claims successfully and celebrates", async () => {
    vi.mocked(walletApi.claim).mockResolvedValue({ cert_uid: "TC-1111-2222-3333", status: "claimed" });
    renderClaim();
    await userEvent.type(screen.getByLabelText(/certificate id/i), "TC-1111-2222-3333");
    await userEvent.type(screen.getByLabelText(/email/i), "arjun@example.com");
    await userEvent.click(screen.getByRole("button", { name: /claim certificate/i }));
    expect(await screen.findByText(/certificate claimed!/i)).toBeInTheDocument();
  });

  it("identity mismatch shows guidance, not a dead end", async () => {
    vi.mocked(walletApi.claim).mockRejectedValue(new ApiError({
      status: 422, code: "INVALID_STATE", title: "x",
      detail: "Identity details don't match", errors: [], traceId: "t",
    }));
    renderClaim();
    await userEvent.type(screen.getByLabelText(/certificate id/i), "TC-1111-2222-3333");
    await userEvent.type(screen.getByLabelText(/email/i), "wrong@example.com");
    await userEvent.click(screen.getByRole("button", { name: /claim certificate/i }));
    await waitFor(() =>
      expect(screen.getByText(/don't match this certificate/i)).toBeInTheDocument());
  });
});
