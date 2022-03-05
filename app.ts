require("dotenv").config();
require("./src/configs/mongoConfig");
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import createError from "http-errors";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/", indexRouter);
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use(
    (
        err: { message: any; status: any },
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get("env") === "development" ? err : {};
        // render the error page
        res.status(err.status || 500);
        res.json(err);
    }
);
try {
    app.listen(port, (): void => {
        console.log(`Connected successfully on port ${port}`);
    });
} catch (error: any) {
    console.error(`Error occurred: ${error.message}`);
}
