import ApiError from "../../common/utils/api-error.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

const authenticate = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) throw ApiError.unauthorized("Not authenticated");

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
    };
    next();
};

export { authenticate };