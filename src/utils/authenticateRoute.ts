import { NextFunction, Request, Response } from "express";
import passport from "passport";

const authenticateRoute = (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth/")) return next();
    return passport.authenticate("jwt", { session: false })(req, res, next);
};
export default authenticateRoute;
