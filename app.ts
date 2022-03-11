require("dotenv").config();
require("express-async-errors");
require("./src/configs/mongoConfig");
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import createError from "http-errors";
import logger from "morgan";
import passport from "passport";
import indexRouter from "./src/routes/indexRouter";
import FacebookStrategy from "./src/strategies/FacebookTokenStrategy";
import jwtStrategy from "./src/strategies/jwtStrategy";

const app: Application = express();
const port = 3000;

passport.use(jwtStrategy);
passport.use(FacebookStrategy);
// Body parsing Middleware

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use("/", indexRouter);
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err: { message: any; status: any }, req: Request, res: Response, next: NextFunction) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    res.status(err.status || 500);
    res.json({ statusBool: false, ...err });
});
try {
    app.listen(port, (): void => {
        console.log(`Connected successfully on port ${port}`);
    });
} catch (error: any) {
    console.error(`Error occurred: ${error.message}`);
}
