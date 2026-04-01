import ApiError from "../../common/utils/api-error.js";
import crypto from "crypto";
import { sendVerificationEmail, sendResetPasswordEmail } from "../../common/config/email.js";

import { generateResetToken, generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../common/utils/jwt.utils.js";

import User from "./auth.model.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("Email already exisits");

  const { rawToken, hashedToken } = generateResetToken();

  const user = await User.create({ name, email, password, verificationToken: hashedToken });


  user.verificationToken = hashedToken;
  await user.save();

  //TO Do :Email for verification
  try {
    await sendVerificationEmail(email, rawToken);
  } catch (err) {
    console.error("Failed to send verification email:", err.message);
  }

  const userObj = user.toObject();
  delete userObj.password;

  return userObj;
};

const verifyEmail = async (token) => {
  const trimmed = String(token).trim();
  if (!trimmed) {
    throw ApiError.badRequest("Invalid or expired verification token");
  }

  // DB stores SHA256(raw). Links / email use the raw token — we hash for lookup.
  // If you paste the hash from MongoDB into Postman, hashing again would not match;
  // so we also try a direct match on the stored value.
  const hashedInput = crypto.createHash("sha256").update(trimmed).digest("hex");
  let user = await User.findOne({ verificationToken: hashedInput }).select(
    "+verificationToken",
  );
  if (!user) {
    user = await User.findOne({ verificationToken: trimmed }).select(
      "+verificationToken",
    );
  }
  if (!user) throw ApiError.badRequest("Invalid or expired verification token");

  await User.findByIdAndUpdate(user._id, {
    $set: { isVerified: true },
    $unset: { verificationToken: 1 },
  });

  return user;
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized("Invalid email or password");

  if (!user.isVerified) {
    throw ApiError.forbidden("Please verify your email before logging in");
  }

  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  // Store hashed refresh token in DB so it can be invalidated on logout
  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  console.log(accessToken)
  console.log("***+++++++***")
  console.log(refreshToken)

  return { user: userObj, accessToken, refreshToken };
};

const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");

  const decoded = verifyRefreshToken(token);

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user) throw ApiError.unauthorized("User no longer exists");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token — please log in again");
  }

  const accessToken = generateAccessToken({ id: user._id });

  return { accessToken };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notfound("User not found");
  return user;
}

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound("No account with that email");

  const { rawToken, hashedToken } = generateResetToken();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  try {
    await sendResetPasswordEmail(email, rawToken);
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
  }
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) throw ApiError.badRequest("Invalid or expired reset token");

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
};

export { register, verifyEmail, login, refresh, logout, getMe, forgotPassword, resetPassword };
