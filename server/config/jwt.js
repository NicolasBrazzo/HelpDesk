// JWT CONFIGURATION

// Fail fast se manca il secret
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  SALT_ROUNDS: Number(process.env.SALT_ROUNDS) || 10,
};
