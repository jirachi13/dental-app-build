import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import routes from "./routes/index";

const app = express();

app.use(cors());
app.use(express.json());

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api", routes);

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
