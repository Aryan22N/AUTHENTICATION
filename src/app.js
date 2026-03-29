import express from "express";
import authRouter from "./module/auth/auth.routes.js";

const app = express();

// middleware to parse JSON
app.use(express.json());

// mount routes
app.use("/api/auth", authRouter);

export default app;
