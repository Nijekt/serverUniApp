import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileUrl: {
      type: String,
      required: false,
    },
    fileUrlDepartment: {
      type: String,
      required: false,
    },
    department: {
      type: String,
      required: false,
    },

    status: {
      type: String,
      default: "W toku",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Task", TaskSchema);
