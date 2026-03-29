import ApiError from "../utils/api-error.js";

const validate = (Dtoclass) => {
  return (req, res, next) => {
    const { error, value } = Dtoclass.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.join("; "));
    }
    req.body = value;
    next();
  };
};

export default validate;
