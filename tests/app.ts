require("express-async-errors");
import express, { NextFunction, Request, Response } from "express";
import passport from "passport";
import indexRouter from "../src/routes/indexRouter";
import jwtStrategy from "../src/strategies/jwtStrategy";
const app = express();
passport.use(jwtStrategy);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use("/", indexRouter);
app.use((err: { message: any; status: any }, req: Request, res: Response, next: NextFunction) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500);
    // console.log(err);
    res.json({ statusBool: false, ...err });
});
export default app;
