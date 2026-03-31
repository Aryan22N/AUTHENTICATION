import express from "express";
import authRouter from "./module/auth/auth.routes.js";

const app = express();

// middleware to parse JSON
app.use(express.json());

// mount routes
app.use("/api/auth", authRouter);

// Global error handler — must have 4 params for Express to treat it as error middleware
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ success: false, message });
});

export default app;
