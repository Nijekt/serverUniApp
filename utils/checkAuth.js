import jwt from "jsonwebtoken";

export default async (req, res, next) => {
  const token = (req.headers.authorization || "").replace(/Bearer\s/g, "");
  if (token) {
    try {
      const decoded = jwt.verify(token, "secret");

      req.userId = decoded._id;

      console.log(decoded);
      next();
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "No access",
      });
    }
  } else {
    res.status(404).json({
      message: "Token is not correct",
    });
  }
};
