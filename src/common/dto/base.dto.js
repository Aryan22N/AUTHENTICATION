import joi from "joi";

class BaseDto {
  static schema = joi.object({});

  static validate(data) {
    const { error, value } = this.schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return { error: errors, value: null };
    }
    return { error: null, value };
  }
}
export default BaseDto;
