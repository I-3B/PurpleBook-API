require("dotenv").config();
import FacebookTokenStrategy from "passport-facebook-token";
import User from "../models/User";
import { addFriendRequests } from "../utils/addFriendRequests";
const fbStrategy = new FacebookTokenStrategy(
    {
        clientID: process.env["FACEBOOK_APP_ID"] || "",
        clientSecret: process.env["FACEBOOK_APP_SECRET"] || "",
        fbGraphVersion: "v3.0",
    },
    async function (
        accessToken: any,
        refreshToken: any,
        profile: any,
        done: (arg0: any, arg1: any) => any
    ) {
        const userFound = await User.findOne(
            { email: profile._json.email },
            { facebookId: 1, email: 1, isAdmin: 1 }
        );
        if (!userFound) {
            User.create(
                {
                    facebookId: profile.id,
                    firstName: profile._json.first_name,
                    lastName: profile._json.last_name,
                    email: profile._json.email,
                    imageMini: {
                        data: Buffer.from(""),
                        contentType: "",
                    },
                    imageFull: {
                        data: Buffer.from(""),
                        contentType: "",
                    },
                },
                function (error: any, user: any) {
                    addFriendRequests(user._id);
                    return done(error, {
                        id: user._id.toString(),
                        email: user.email,
                        isAdmin: false,
                    });
                }
            );
        } else {
            done(null, {
                id: userFound._id.toString(),
                email: userFound.email,
                isAdmin: userFound.isAdmin,
            });
        }
    }
);
export default fbStrategy;
