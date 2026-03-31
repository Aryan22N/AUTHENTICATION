import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    ApiResponse.created(res, "Registration success", user);
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    await authService.verifyEmail(req.params.token);
    ApiResponse.ok(res, "Email verified successfully");
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    ApiResponse.ok(res, "Login success", user);
  } catch (err) {
    next(err);
  }
};

export { register, verifyEmail, login };
