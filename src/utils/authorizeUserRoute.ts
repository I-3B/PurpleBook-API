import { NextFunction, Request, Response } from "express";

const authorizeUserRoute = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.id === req.params.id) req.user.isAuthorized = true;
    return next();
};
export default authorizeUserRoute;
