import "dotenv/config.js";
import app from "./src/app.js";
import connectDB from "./src/common/config/db.js";

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    //connect to DB
    await connectDB();
    //start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

start().catch((error) => {
  console.log("Error starting the server", error);
  process.exit(1);
});
