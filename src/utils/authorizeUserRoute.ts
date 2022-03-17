import { NextFunction, Request, Response } from "express";

const authorizeUserRoute = (req: Request, res: Response, next: NextFunction) => {
    if (req.user.id === req.params.userId) req.user.userRouteAuthorized = true;
    else if (req.user) req.user.userRouteAuthorized = false;
    return next();
};
export default authorizeUserRoute;
