import ApiError from "../utils/api-error.js";

const validate = (Dtoclass) => {
  return (req, res, next) => {
    if (!req.body) {
      throw ApiError.badRequest(
        "Request body is missing. Make sure to set Content-Type: application/json"
      );
    }
    const { error, value } = Dtoclass.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.join("; "));
    }
    req.body = value;
    next();
  };
};

export default validate;
