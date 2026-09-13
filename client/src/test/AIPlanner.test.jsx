import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AIPlanner from "../pages/AIPlanner.jsx";
import { getQuestSuggestions, planGoal } from "../services/aiService.js";
import { getRecommendations } from "../services/recommendationService.js";

vi.mock("../services/aiService.js", () => ({
  getQuestSuggestions: vi.fn(),
  planGoal: vi.fn()
}));
vi.mock("../services/recommendationService.js", () => ({
  getRecommendations: vi.fn()
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}:{location.state?.prefill?.title || ""}
    </output>
  );
}

describe("AI Planner page", () => {
  beforeEach(() => {
    getRecommendations.mockResolvedValue({
      recommendations: []
    });
    getQuestSuggestions.mockResolvedValue({
      source: "fallback",
      suggestions: [
        {
          title: "Practice Python",
          description: "Review one programming concept.",
          category: "intellect",
          difficulty: "easy",
          reason: "Intellect is ready for attention."
        }
      ]
    });
    planGoal.mockResolvedValue({
      source: "fallback",
      goal: "Learn Python",
      plan: [
        {
          step: 1,
          title: "Learn the basics",
          description: "Build a foundation.",
          suggested_quests: [
            {
              title: "Read a Python guide",
              description: "Read for 20 minutes.",
              category: "intellect",
              difficulty: "easy"
            }
          ]
        }
      ]
    });
  });

  it("loads fallback suggestions and opens the quest flow with prefilled data", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AIPlanner />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Generate quest suggestions"
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Practice Python" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI is currently unavailable/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create quest" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/tasks:Practice Python"
      )
    );
  });

  it("submits a goal and renders its plan", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AIPlanner />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("What do you want to achieve?"), "Learn Python");
    await user.click(screen.getByRole("button", { name: "Generate plan" }));

    await waitFor(() => expect(planGoal).toHaveBeenCalledWith("Learn Python"));
    expect(await screen.findByText("Read a Python guide")).toBeInTheDocument();
  });

  it("shows safe messages for non-validation request failures", async () => {
    const user = userEvent.setup();
    getRecommendations.mockRejectedValueOnce(new Error("database details"));
    getQuestSuggestions.mockRejectedValueOnce(
      Object.assign(new Error("provider details"), { status: 500 })
    );

    render(
      <MemoryRouter>
        <AIPlanner />
      </MemoryRouter>
    );

    expect(
      await screen.findByText("Recommendations are temporarily unavailable.")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Generate quest suggestions" })
    );

    expect(
      await screen.findByText("Quest suggestions are temporarily unavailable.")
    ).toBeInTheDocument();
    expect(screen.queryByText("provider details")).not.toBeInTheDocument();
  });
});
