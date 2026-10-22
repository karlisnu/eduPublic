const assert = require("node:assert/strict");
const test = require("node:test");
const {
  AdminLoginRequestDto,
  AdminLoginResponseDto,
} = require("../src/dtos/admin-login.dto");

test("admin login request DTO trims the identifier and preserves the password", () => {
  const dto = AdminLoginRequestDto.from({
    identifier: "  admin@example.com ",
    password: " secret ",
  });

  assert.deepEqual({ ...dto }, {
    identifier: "admin@example.com",
    password: " secret ",
  });
});

test("admin login request DTO rejects missing or malformed fields", () => {
  for (const body of [
    null,
    [],
    {},
    { identifier: "admin@example.com" },
    { identifier: "   ", password: "secret" },
    { identifier: "admin@example.com", password: "" },
  ]) {
    assert.throws(() => AdminLoginRequestDto.from(body), TypeError);
  }
});

test("admin login response DTO exposes only public account fields", () => {
  const dto = new AdminLoginResponseDto({
    id: 5,
    username: "admin",
    role: "admin",
    password_hash: "not-for-response",
  });

  assert.deepEqual({ ...dto }, { id: 5, username: "admin", role: "admin" });
});
