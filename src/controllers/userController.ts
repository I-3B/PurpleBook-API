import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User";

const userController = {
    //send user's full profile if the requester is the user
    //else it will send the profile without sensitive data
    getUser: async (req: Request, res: Response, next: NextFunction) => {
        let user;
        if (req.user?.isAuthorized) {
            user = await User.findById(req.params.id, { password: 0 }).catch(
                (err) => {
                    next(err);
                }
            );
        } else {
            user = await User.findById(req.params.id, {
                firstName: 1,
                lastName: 1,
                profilePicture: 1,
                posts: 1,
                friends: 1,
            }).catch((err) => {
                return next(err);
            });
        }
        if (user) {
            return res
                .status(200)
                .json({ statusBool: true, message: "User found", user: user });
        }
        return res
            .status(404)
            .json({ statusBool: false, message: "User not found" });
    },
    editUser: [
        body("firstName")
            .exists()
            .trim()
            .matches("^[a-zA-Z]+$")
            .withMessage("First name can only contain A-Z, a-z")
            .isLength({ min: 1, max: 20 })
            .withMessage(
                "First name cannot be empty or more than 20 characters."
            )
            .escape(),
        body("lastName")
            .exists()
            .trim()
            .matches("^[a-zA-Z]+$")
            .withMessage("Last name can only contain A-Z, a-z")
            .isLength({ min: 1, max: 20 })
            .withMessage(
                "Last name cannot be empty or more than 20 characters."
            )
            .escape(),

        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.user?.isAuthorized)
                return res.status(403).json({
                    statusBool: false,
                    message: "User is not authorized",
                });
            const errors = validationResult(req);
            const files = req.files as Express.Multer.File[];
            const profilePicture = files[0]
                ? files[0]
                : { buffer: "", mimetype: "" };
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    statusBool: false,
                    message: "update failed",
                    errors: [...errors.array()],
                });
            } else {
                const user = await User.findByIdAndUpdate(
                    req.user?.id,
                    {
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        profilePicture: {
                            data: profilePicture.buffer,
                            contentType: profilePicture.mimetype,
                        },
                    },
                    {
                        new: true,
                        fields: {
                            firstName: 1,
                            lastName: 1,
                            profilePicture: 1,
                        },
                    }
                ).catch((err: any) => {
                    next(err);
                });
                if (user)
                    return res.status(200).json({
                        statusBool: true,
                        message: "update succeeded",
                        user: user,
                    });
            }
        },
    ],
};

export default userController;
