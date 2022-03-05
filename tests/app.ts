import express from "express";
import indexRouter from "../src/routes/indexRouter";
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use("/", indexRouter);
export default app;
