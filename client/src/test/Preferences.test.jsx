import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Preferences from "../pages/Preferences.jsx";
import { getPreferences, updatePreferences } from "../services/preferencesService.js";

vi.mock("../services/preferencesService.js", async () => {
  const actual = await vi.importActual("../services/preferencesService.js");
  return { ...actual, getPreferences: vi.fn(), updatePreferences: vi.fn() };
});

describe("Preferences page", () => {
  beforeEach(() => {
    getPreferences.mockResolvedValue({
      ai_coach_enabled: false,
      ai_personalization_enabled: true,
      reminders_enabled: true,
      timezone: "UTC"
    });
    updatePreferences.mockResolvedValue({
      ai_coach_enabled: true,
      ai_personalization_enabled: true,
      reminders_enabled: true,
      timezone: "UTC"
    });
  });

  it("loads server preferences instead of local-only values", async () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    expect(screen.getByText("Loading your preferences...")).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: "AI coach" })).not.toBeChecked();
    expect(getPreferences).toHaveBeenCalledTimes(1);
  });

  it("patches changed preferences and shows a saved state", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    const coach = await screen.findByRole("checkbox", { name: "AI coach" });
    await user.click(coach);
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith(expect.objectContaining({
      ai_coach_enabled: true,
      timezone: "UTC"
    })));
    expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
  });

  it("shows a retryable error when loading fails", async () => {
    getPreferences.mockRejectedValueOnce(new Error("Preferences unavailable"));
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Preferences unavailable");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
