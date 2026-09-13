import request from "supertest";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import { expectSafeError } from "./helpers/assertions.js";
import {
  deleteTestUsers,
  describeWithDatabase
} from "./helpers/testDb.js";
import { createTestUser } from "./helpers/testUser.js";

describeWithDatabase("authentication API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("signs up, rejects duplicate emails, and never returns password hashes", async () => {
    const email = `phase12-auth-${Date.now()}@example.com`;
    emails.push(email);

    const signup = await request(app).post("/api/auth/signup").send({
      name: "Auth Adventurer",
      email,
      password: "phase12-password"
    });

    expect(signup.status).toBe(201);
    expect(signup.body).toMatchObject({
      success: true,
      user: { email }
    });
    expect(signup.body.user).not.toHaveProperty("password_hash");
    expect(signup.body.token).toEqual(expect.any(String));

    const duplicate = await request(app).post("/api/auth/signup").send({
      name: "Another Adventurer",
      email: email.toUpperCase(),
      password: "phase12-password"
    });

    expectSafeError(duplicate, 409);
  });

  it("validates signup and login credentials", async () => {
    expectSafeError(
      await request(app).post("/api/auth/signup").send({}),
      400
    );
    expectSafeError(
      await request(app).post("/api/auth/signup").send({
        name: "Invalid",
        email: "not-an-email",
        password: "phase12-password"
      }),
      400
    );
    expectSafeError(
      await request(app).post("/api/auth/signup").send({
        name: "Weak Password",
        email: "weak@example.com",
        password: "short"
      }),
      400
    );

    const user = await createTestUser(app, "login");
    emails.push(user.email);

    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "phase12-password"
    });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(user.email);
    expect(login.body.user).not.toHaveProperty("password_hash");

    expectSafeError(
      await request(app).post("/api/auth/login").send({
        email: user.email,
        password: "wrong-password"
      }),
      401
    );
    expectSafeError(
      await request(app).post("/api/auth/login").send({
        email: "missing@example.com",
        password: "phase12-password"
      }),
      401
    );
    expectSafeError(await request(app).post("/api/auth/login").send({}), 400);
  });

  it("protects current-user access and rejects invalid or expired tokens", async () => {
    const user = await createTestUser(app, "token");
    emails.push(user.email);

    const currentUser = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${user.token}`);

    expect(currentUser.status).toBe(200);
    expect(currentUser.body.user.email).toBe(user.email);
    expect(currentUser.body.user).not.toHaveProperty("password_hash");

    expectSafeError(await request(app).get("/api/auth/me"), 401);
    expectSafeError(
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer not-a-token"),
      401
    );

    const expiredToken = jwt.sign(
      { id: user.user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );
    expectSafeError(
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`),
      401
    );
  });
});
