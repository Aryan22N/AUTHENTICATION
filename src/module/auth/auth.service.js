import ApiError from "../../common/utils/api-error.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../../common/config/email.js";

import { generateResetToken, generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../common/utils/jwt.utils.js";

import User from "./auth.model.js";

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

export { register, verifyEmail };
