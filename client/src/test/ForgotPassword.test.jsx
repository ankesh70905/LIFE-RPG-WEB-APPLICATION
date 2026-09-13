import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetOtp
} from "../services/authService.js";

vi.mock("../services/authService.js", () => ({
  requestPasswordReset: vi.fn(),
  resendPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  verifyPasswordResetOtp: vi.fn()
}));

describe("ForgotPassword page", () => {
  beforeEach(() => {
    requestPasswordReset.mockResolvedValue({ success: true });
    verifyPasswordResetOtp.mockResolvedValue({
      success: true,
      resetToken: "opaque-reset-token"
    });
    resetPassword.mockResolvedValue({ success: true });
  });

  it("completes the request, OTP verification, and reset flow", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Email"), "hero@example.com");
    await user.click(screen.getByRole("button", { name: "Send recovery code" }));
    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith("hero@example.com")
    );

    await user.type(screen.getByLabelText("Recovery code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() =>
      expect(verifyPasswordResetOtp).toHaveBeenCalledWith(
        "hero@example.com",
        "123456"
      )
    );

    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith(
        "opaque-reset-token",
        "new-password"
      )
    );
    expect(
      await screen.findByRole("heading", { name: "Password updated" })
    ).toBeInTheDocument();
  });
});

