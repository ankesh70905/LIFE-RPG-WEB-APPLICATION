import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../pages/Login.jsx";
import { useAuth } from "../context/AuthContext.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn()
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe("Login page", () => {
  let login;

  beforeEach(() => {
    login = vi.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login });
  });

  it("renders the form and submits credentials", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "Continue your quest" })
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "hero@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "hero@example.com",
        password: "password"
      })
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("displays request errors", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new Error("Invalid email or password"));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Email"), "hero@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password"
    );
  });
});
