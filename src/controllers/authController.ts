import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { createProfilePicture } from "../utils/processImage";
import { validateFirstAndLastName } from "../utils/validateForm";
const authController = {
    login: [
        body("email").exists().isEmail().withMessage("Wrong email format.").escape(),
        body("password").escape(),
        async (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            } else {
                const user = await User.findOne({
                    email: req.body.email,
                });
                if (user) {
                    bcrypt.compare(req.body.password, user.password, (err, result) => {
                        if (err) return next(err);
                        if (result) {
                            const secret = process.env.SECRET || "SECRET";
                            const token = jwt.sign({ email: user.email }, secret);
                            return res.status(200).json({
                                userId: user._id,
                                token,
                            });
                        } else {
                            return res.status(400).json({
                                error: {
                                    value: req.body.password,
                                    msg: "wrong password",
                                    param: "password",
                                    location: "body",
                                },
                            });
                        }
                    });
                } else {
                    return res.status(404).json({
                        error: {
                            value: req.body.email,
                            msg: "User not found",
                            param: "email",
                            location: "body",
                        },
                    });
                }
            }
        },
    ],

    signup: [
        ...validateFirstAndLastName,
        body("email").exists().trim().isEmail().withMessage("Wrong email format.").escape(),
        body("password")
            .exists()
            .trim()
            .isLength({ min: 8, max: 32 })
            .withMessage("password cannot be less than 8 or more then 32 characters.")
            .escape(),
        async (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            const files = req.files as Express.Multer.File[];
            const imageBuffer = files[0] ? files[0].buffer : Buffer.from("");
            const imageMimetype = files[0] ? files[0].mimetype : "";
            const profilePicture = await createProfilePicture(imageBuffer);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            } else {
                const emailUsed = await isEmailUsed(req.body.email);
                if (emailUsed) {
                    return res.status(400).json({
                        errors: [
                            {
                                value: req.body.email,
                                msg: "email is already used",
                                param: "email",
                                location: "body",
                            },
                        ],
                    });
                } else {
                    bcrypt.hash(req.body.password, 10, async (err: any, hashedPassword: String) => {
                        if (err) next(err);
                        const user = await User.create({
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            password: hashedPassword,
                            email: req.body.email,
                            imageMini: {
                                data: profilePicture.mini,
                                contentType: imageMimetype,
                            },
                            imageFull: {
                                data: profilePicture.full,
                                contentType: imageMimetype,
                            },
                        });
                        if (user)
                            return res.status(201).json({
                                userId: user._id.toString(),
                            });
                    });
                }
            }
        },
    ],
};
const isEmailUsed = async (email: String) => {
    const found = await User.findOne({ email });
    return !!found;
};
export default authController;
