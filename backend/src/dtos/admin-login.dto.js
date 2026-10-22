class AdminLoginRequestDto {
  constructor(identifier, password) {
    this.identifier = identifier;
    this.password = password;
  }

  static from(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new TypeError("El cuerpo de la solicitud no es válido");
    }

    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !password) {
      throw new TypeError("El usuario y la contraseña administrativos son obligatorios");
    }

    return new AdminLoginRequestDto(identifier, password);
  }
}

class AdminLoginResponseDto {
  constructor({ id, username, role }) {
    this.id = id;
    this.username = username;
    this.role = role;
  }
}

module.exports = {
  AdminLoginRequestDto,
  AdminLoginResponseDto,
};
