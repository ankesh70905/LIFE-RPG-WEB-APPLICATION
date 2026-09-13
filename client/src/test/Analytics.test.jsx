import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Analytics from "../pages/Analytics.jsx";
import {
  getAnalyticsInsights,
  getAnalyticsOverview
} from "../services/analyticsService.js";

vi.mock("../services/analyticsService.js", () => ({
  getAnalyticsInsights: vi.fn(),
  getAnalyticsOverview: vi.fn()
}));

const analytics = {
  quests_completed: 3,
  xp_earned: 60,
  gold_earned: 15,
  current_streak: 2,
  active_days: 2,
  most_productive_day: "Monday",
  top_category: "intellect",
  daily_activity: [
    { date: "2026-09-11", quests_completed: 1, xp_earned: 20, gold_earned: 5 },
    { date: "2026-09-12", quests_completed: 2, xp_earned: 40, gold_earned: 10 }
  ],
  category_distribution: {
    intellect: 2,
    strength: 0,
    discipline: 1,
    creativity: 0
  },
  difficulty_distribution: {
    easy: 2,
    normal: 1,
    hard: 0,
    epic: 0
  },
  trend: {
    direction: "improving",
    quests_change: 50,
    xp_change: 50
  }
};

describe("Analytics page", () => {
  beforeEach(() => {
    getAnalyticsOverview.mockResolvedValue({ period: 30, analytics });
    getAnalyticsInsights.mockResolvedValue({
      insights: [
        {
          type: "productive_day",
          title: "Most productive day",
          message: "Monday is your most productive day."
        }
      ]
    });
  });

  it("renders summary data and reloads when the period changes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Quests completed")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Analytics period" }), "7");
    await waitFor(() => expect(getAnalyticsOverview).toHaveBeenLastCalledWith(7));
    expect(screen.getByText("Monday is your most productive day.")).toBeInTheDocument();
  });

  it("shows an empty state when the selected period has no activity", async () => {
    getAnalyticsOverview.mockResolvedValueOnce({
      period: 7,
      analytics: {
        ...analytics,
        quests_completed: 0,
        daily_activity: [{ date: "2026-09-12", quests_completed: 0, xp_earned: 0, gold_earned: 0 }]
      }
    });
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    expect(await screen.findByText("Your charts are waiting")).toBeInTheDocument();
  });
});
