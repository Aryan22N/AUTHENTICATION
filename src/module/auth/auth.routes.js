import { Router } from "express";
import * as controller from "./auth.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";

const router = Router();

router.post("/register", validate(RegisterDto), controller.register);
router.get("/verify-email/:token", controller.verifyEmail);
router.post("/login", validate(LoginDto), controller.login);
router.post("/refresh-token", controller.refreshToken);

export default router;
