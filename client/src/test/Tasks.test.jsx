import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Tasks from "../pages/Tasks.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  updateTask
} from "../services/taskService.js";

vi.mock("../context/ToastContext.jsx", () => ({
  useToast: vi.fn()
}));
vi.mock("../services/taskService.js", () => ({
  completeTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getTasks: vi.fn(),
  updateTask: vi.fn()
}));

const task = {
  id: "1",
  title: "Finish daily review",
  description: "Review today's notes",
  category: "discipline",
  difficulty: "normal",
  xp_reward: 20,
  gold_reward: 5,
  completed: false
};

describe("Tasks page", () => {
  beforeEach(() => {
    useToast.mockReturnValue({ showToast: vi.fn() });
    getTasks.mockResolvedValue([task]);
    completeTask.mockResolvedValue({
      rewards: { xp: 20, gold: 5, attribute: { name: "discipline" } },
      progression: {
        previous_level: 1,
        current_level: 1,
        leveled_up: false
      },
      streak: { current_streak: 1 },
      achievements: [],
      task: { id: "1", completed: true }
    });
  });

  it("renders a quest and shows reward feedback after completion", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Finish daily review" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => expect(completeTask).toHaveBeenCalledWith("1"));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Adventure advanced!"
    );
    expect(screen.getAllByText("+20 XP").length).toBeGreaterThanOrEqual(1);
  });

  it("validates a new quest title in the form", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );
    await user.click(
      await screen.findByRole("button", { name: "+ New quest" })
    );
    await user.type(screen.getByLabelText("Quest title"), " ");
    await user.click(screen.getByRole("button", { name: "Create quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Give your quest a title."
    );
    expect(createTask).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
    expect(deleteTask).not.toHaveBeenCalled();
  });
});
