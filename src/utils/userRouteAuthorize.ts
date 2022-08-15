import { NextFunction, Request, Response } from "express";

const userRouteAuthorize = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user.id === req.params.userId || req.user.isAdmin) req.user.userRouteAuthorized = true;
    else if (req.user) req.user.userRouteAuthorized = false;
    return next();
};
export default userRouteAuthorize;
