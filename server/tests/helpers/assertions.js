import { expect } from "vitest";

export function expectSafeError(response, statusCode) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toMatchObject({
    success: false
  });
  expect(response.body).not.toHaveProperty("stack");
  expect(response.body).not.toHaveProperty("detail");
  expect(response.body).not.toHaveProperty("query");
}
