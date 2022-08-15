require("dotenv").config();
require("express-async-errors");
if (process.env.NODE_ENV === "development") require("./src/configs/mongoConfigDevelopment");
else if (process.env.NODE_ENV === "production") require("./src/configs/mongoConfigProduction");

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import createError from "http-errors";
import logger from "morgan";
import passport from "passport";
import path from "path";
import populateDB from "./populateDB";
import APIRouter from "./src/routes/APIRouter";
import jwtStrategy from "./src/strategies/jwtStrategy";
import authenticateRoute from "./src/utils/authenticateRoute";
const app: Application = express();
const port = 8080;

passport.use(jwtStrategy);
// Body parsing Middleware
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, "build")));
app.use("/api", authenticateRoute, APIRouter);
app.get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err: { message: any; status: any }, req: Request, res: Response, next: NextFunction) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500);
    console.log(err);
    res.json(err);
});
if (process.env.NODE_ENV != "test") {
    try {
        app.listen(port, () => {
            console.log(`Connected successfully on port ${port}`);

            if (process.env.NODE_ENV === "development") populateDB();
        });
    } catch (error: any) {
        console.error(`Error occurred: ${error.message}`);
    }
}
export default app;
