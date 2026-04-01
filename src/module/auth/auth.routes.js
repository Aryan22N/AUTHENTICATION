import { Router } from "express";
import * as controller from "./auth.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import ForgotPasswordDto from "./dto/forgot-password.dto.js";
import ResetPasswordDto from "./dto/reset-password.dto.js";
import { authenticate } from "./auth.middleware.js";

const router = Router();

router.post("/register", validate(RegisterDto), controller.register);
router.get("/verify-email/:token", controller.verifyEmail);
router.post("/login", validate(LoginDto), controller.login);
router.post("/refresh-token", controller.refreshToken);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.getMe);
router.post("/forgot-password", validate(ForgotPasswordDto), controller.forgotPassword,);
router.put("/reset-password/:token", validate(ResetPasswordDto), controller.resetPassword,);

export default router;
