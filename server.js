// import cors from "cors";

import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import UserModel from "./Models/UserModel.js";
import TaskModel from "./Models/TaskModel.js";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
import { EmailClient } from "@azure/communication-email";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import checkAuth from "./utils/checkAuth.js";
import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect(
    "mongodb://hryniuk:R6O3HjAyiDNU08RSbC94k49oExPaxxoerZDkfoNBOvs0WmXXxArX56xTUrsiXiUST63JMLAw3rbXACDbQbeqTw==@hryniuk.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@hryniuk@"
  )
  .then(() => console.log("DB OK"))
  .catch((err) => console.log(err));

const connectString =
  "endpoint=https://testhryniuk.europe.communication.azure.com/;accesskey=2T3Hvbk3AoRlohpljZcGxLf3zypEglCpbc70pxzdBn5WtGQKColkJQQJ99ALACULyCpNKjuDAAAAAZCSICp5";
const emailClient = new EmailClient(connectString);

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_CONTAINER_NAME
);

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, "uploads");
  },
  filename: (_, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: multer.memoryStorage() });

app.use("/uploads", express.static("uploads"));

const uploadToAzure = async (file) => {
  try {
    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(file.buffer);
    return blockBlobClient.url;
  } catch (error) {
    console.error("Ошибка загрузки в Azure Blob Storage:", error);
    throw error;
  }
};

app.post("/api/upload", upload.single("file"), async (req, res) => {
  console.log(req.file);
  console.log(req.body);
  const fileUrl = await uploadToAzure(req.file);
  res.json({
    url: fileUrl,
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const doc = new UserModel({
      email: req.body.email,
      passwordHash: hash,
      role: req.body.role,
    });

    const user = await doc.save();

    const token = jwt.sign(
      {
        _id: user._id,
      },
      "secret",
      {
        expiresIn: "30d",
      }
    );

    const { passwordHash, ...userData } = user._doc;

    const message = {
      senderAddress:
        "donotreply@b7aec5eb-7048-4b19-9b6f-634447990d9e.azurecomm.net",
      content: {
        subject: "thank you for registaration",
        plainText: "Thank you for registration on our work platform",
      },
      recipients: {
        to: [
          {
            address: req.body.email,
          },
        ],
      },
    };

    // Отправка письма
    await emailClient.beginSend(message);

    res.json({
      ...userData,
      token,
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Can not create account",
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });

    if (!user) {
      return res.json({
        message: "User is not found",
      });
    }

    const isValidPassword = await bcrypt.compare(
      req.body.password,
      user._doc.passwordHash
    );

    if (!isValidPassword) {
      return res.json({
        message: "User or password is incorrect",
      });
    }

    const token = jwt.sign({ _id: user._id }, "secret", { expiresIn: "30d" });

    const { passwordHash, ...userData } = user._doc;

    res.json({
      ...userData,
      token,
    });
  } catch (err) {
    console.log(err);
    res.json({
      message: "Can not login to acc",
    });
  }
});

app.post("/api/createPersonalTask", checkAuth, async (req, res) => {
  try {
    const doc = new TaskModel({
      text: req.body.text,
      user: req.userId,
      fileUrl: req.body.fileUrl,
      fileUrlDepartment: req.body.fileUrlDepartment,
    });

    const post = await doc.save();
    console.log(post);

    res.json(post);
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: "Mistake with post creating",
    });
  }
});

app.get("/api/AuthMe", checkAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);

    if (!user) {
      return res.status(400).json({
        message: "User is not found",
      });
    }

    res.json(user);
  } catch (error) {
    res.status(404).json({
      message: "User in not found",
    });
  }
});

app.get("/api", (req, res) => res.send("Iasdasd"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
