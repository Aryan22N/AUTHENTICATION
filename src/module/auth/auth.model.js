import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      trim: true,

      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
      //We know ;)
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

//This is a mongoose middleware that runs before saving a user document. It checks if the password field has been modified. If it has, it hashes the password using bcrypt with a salt round of 12 and then proceeds to save the document.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (clearTextPassword) {
  return bcrypt.compare(clearTextPassword, this.password);
};

export default mongoose.model("User", userSchema);
