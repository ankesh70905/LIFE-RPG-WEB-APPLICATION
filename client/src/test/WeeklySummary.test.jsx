import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WeeklySummary from "../pages/WeeklySummary.jsx";
import { getWeeklySummary } from "../services/analyticsService.js";

vi.mock("../services/analyticsService.js", () => ({ getWeeklySummary: vi.fn() }));

describe("Weekly summary page", () => {
  beforeEach(() => {
    getWeeklySummary.mockResolvedValue({
      quests_completed: 4,
      xp_earned: 80,
      weekly_change: { quests: 25 },
      top_category: "discipline"
    });
  });

  it("loads the dedicated weekly summary service", async () => {
    render(<MemoryRouter><WeeklySummary /></MemoryRouter>);
    expect(await screen.findByText("Your strongest focus was discipline. Keep building that momentum next week.")).toBeInTheDocument();
    expect(getWeeklySummary).toHaveBeenCalledTimes(1);
  });
});
