require("dotenv").config();
require("express-async-errors");
require("./src/configs/mongoConfig");
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import createError from "http-errors";
import passport from "passport";
import indexRouter from "./src/routes/indexRouter";
import FacebookStrategy from "./src/strategies/FacebookTokenStrategy";
import jwtStrategy from "./src/strategies/jwtStrategy";

const app: Application = express();
const port = 8080;

passport.use(jwtStrategy);
passport.use(FacebookStrategy);
// Body parsing Middleware
// if (process.env.NODE_ENV !== "test") app.use(logger("dev"));

app.use(cors());
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
    res.locals.error = req.app.get("env") === "dev" ? err : {};
    res.status(err.status || 500);
    console.log(err);
    res.json(err);
});
if (process.env.NODE_ENV != "test") {
    try {
        app.listen(port, (): void => {
            console.log(`Connected successfully on port ${port}`);

            // if (process.env.NODE_ENV == "dev") populateDB();
        });
    } catch (error: any) {
        console.error(`Error occurred: ${error.message}`);
    }
}
export default app;
