import ApiError from "../../common/utils/api-error.js";

import User from "./auth.model.js";

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("Email already exisits");

  const user = await User.create({ name, email, password });

  const userObj = user.toObject();
  delete userObj.password;

  return userObj;
};

export { register };
