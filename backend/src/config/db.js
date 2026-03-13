import mongoose from "mongoose";

const connectDb = (uri) => {
  try {
    mongoose.connect(uri);
    console.log("Connected to db successfully!");
  } catch (error) {
    console.log(error);
  }
};

export default connectDb;
