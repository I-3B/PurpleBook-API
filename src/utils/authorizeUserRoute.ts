import { NextFunction, Request, Response } from "express";

const authorizeUserRoute = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.id === req.params.userId) req.user.isAuthorized = true;
    else if (req.user) req.user.isAuthorized = false;
    return next();
};
export default authorizeUserRoute;
