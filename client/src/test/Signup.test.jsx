import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Signup from "../pages/Signup.jsx";
import { useAuth } from "../context/AuthContext.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn()
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe("Signup page", () => {
  let signup;

  beforeEach(() => {
    signup = vi.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ signup });
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Signup />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Character name"), "New Hero");
    await user.type(screen.getByLabelText("Email"), "hero@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(
      screen.getByRole("button", { name: "Start the adventure" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match."
    );
    expect(signup).not.toHaveBeenCalled();
  });

  it("submits a valid character registration", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Signup />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Character name"), "New Hero");
    await user.type(screen.getByLabelText("Email"), "hero@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.type(screen.getByLabelText("Confirm password"), "password");
    await user.click(
      screen.getByRole("button", { name: "Start the adventure" })
    );

    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith({
        name: "New Hero",
        email: "hero@example.com",
        password: "password"
      })
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });
});
