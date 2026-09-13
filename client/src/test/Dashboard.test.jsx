import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../pages/Dashboard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getAchievements } from "../services/achievementService.js";
import { getActivity } from "../services/activityService.js";
import { getCharacter } from "../services/characterService.js";
import { getTasks } from "../services/taskService.js";
import { getWeeklyAnalytics } from "../services/analyticsService.js";
import { getRecommendations } from "../services/recommendationService.js";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn()
}));
vi.mock("../services/achievementService.js", () => ({
  getAchievements: vi.fn()
}));
vi.mock("../services/activityService.js", () => ({
  getActivity: vi.fn()
}));
vi.mock("../services/characterService.js", () => ({
  getCharacter: vi.fn()
}));
vi.mock("../services/taskService.js", () => ({
  getTasks: vi.fn()
}));
vi.mock("../services/analyticsService.js", () => ({
  getWeeklyAnalytics: vi.fn()
}));
vi.mock("../services/recommendationService.js", () => ({
  getRecommendations: vi.fn()
}));

const character = {
  user: { name: "Dashboard Hero", email: "hero@example.com" },
  progression: {
    level: 2,
    total_xp: 150,
    current_level_xp: 50,
    xp_for_next_level: 400,
    xp_remaining: 350,
    progress_percentage: 12.5
  },
  resources: { gold: 25 },
  streak: { current_streak: 3, longest_streak: 5 },
  attributes: {
    intellect: 2,
    strength: 1,
    discipline: 0,
    creativity: 0,
    total_attributes: 3
  },
  attribute_ranking: [
    { name: "intellect", value: 2 },
    { name: "strength", value: 1 },
    { name: "discipline", value: 0 },
    { name: "creativity", value: 0 }
  ]
};

describe("Dashboard page", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: { name: "Dashboard Hero" } });
    getCharacter.mockResolvedValue(character);
    getTasks.mockResolvedValue([
      {
        id: "1",
        title: "Open quest",
        category: "intellect",
        difficulty: "normal",
        xp_reward: 20,
        gold_reward: 5,
        completed: false
      },
      {
        id: "2",
        title: "Completed quest",
        category: "strength",
        difficulty: "easy",
        xp_reward: 10,
        gold_reward: 2,
        completed: true
      }
    ]);
    getActivity.mockResolvedValue([
      {
        date: "2026-09-12",
        quests_completed: 1,
        xp_earned: 20,
        gold_earned: 5
      }
    ]);
    getAchievements.mockResolvedValue([
      {
        id: "1",
        name: "First Quest",
        description: "Complete your first quest.",
        icon: "🔥",
        category: "quests",
        unlocked: true
      }
    ]);
    getWeeklyAnalytics.mockResolvedValue({
      quests_completed: 1,
      xp_earned: 20,
      weekly_change: null,
      top_category: "discipline"
    });
    getRecommendations.mockResolvedValue({
      recommendations: [
        {
          type: "streak",
          priority: "high",
          title: "Protect your streak",
          message: "Complete one quest today.",
          action: "create_quest"
        }
      ]
    });
  });

  it("shows loading and then the dashboard summary", async () => {
    let resolveCharacter;
    getCharacter.mockReturnValue(
      new Promise((resolve) => {
        resolveCharacter = resolve;
      })
    );
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
    resolveCharacter(character);

    expect(
      await screen.findByRole("heading", {
        name: "Welcome back, Dashboard Hero."
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Daily activity")).toBeInTheDocument();
    expect(screen.getByText("First Quest")).toBeInTheDocument();
  });

  it("shows a retryable error when dashboard requests fail", async () => {
    getCharacter.mockRejectedValue(new Error("Dashboard unavailable"));
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Dashboard unavailable"
      )
    );
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument();
  });
});
