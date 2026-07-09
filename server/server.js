require('dotenv').config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./controllers/auth.controller");
const usersRoutes = require("./controllers/users.controller");
const ticketsRoutes = require("./controllers/tickets.controller");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(cors({
  origin: process.env.FRONTEND_URL
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/ticket", ticketsRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Rotta non trovata" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ ok: false, error: "Errore interno del server" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend ON at port ${PORT}`);
});