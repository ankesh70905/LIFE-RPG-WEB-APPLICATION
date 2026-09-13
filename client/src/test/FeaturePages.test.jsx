import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import Habits from "../pages/Habits.jsx";
import Challenges from "../pages/Challenges.jsx";
import * as habitService from "../services/habitService.js";
import * as challengeService from "../services/challengeService.js";

describe("phase 15-18 feature pages", () => {
  it("renders an accessible empty habits state", async () => {
    vi.spyOn(habitService, "getHabits").mockResolvedValue([]);
    render(<MemoryRouter><ToastProvider><Habits /></ToastProvider></MemoryRouter>);
    expect(await screen.findByText("No habits yet")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Habit title" })).toBeInTheDocument();
  });
  it("renders challenge progress", async () => {
    vi.spyOn(challengeService, "getChallenges").mockResolvedValue([{ id: 1, cadence: "daily", title: "Daily Quest Sprint", description: "Complete quests", progress: 1, target: 2, xp_reward: 5, gold_reward: 2 }]);
    render(<MemoryRouter><Challenges /></MemoryRouter>);
    expect(await screen.findByText("Daily Quest Sprint")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});
