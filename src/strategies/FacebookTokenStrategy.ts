import User from "../models/User";

require("dotenv").config();
const FacebookTokenStrategy = require("passport-facebook-token");
export default new FacebookTokenStrategy(
    {
        clientID: process.env["FACEBOOK_APP_ID"],
        clientSecret: process.env["FACEBOOK_APP_SECRET"],
        fbGraphVersion: "v3.0",
    },
    function (
        accessToken: any,
        refreshToken: any,
        profile: {
            id: any;
            _json: { first_name: any; last_name: any; email: any };
            photos: { value: any }[];
        },
        done: (arg0: any, arg1: any) => any
    ) {
        User.findOneAndUpdate(
            { facebookId: profile.id },
            {
                firstName: profile._json.first_name,
                lastName: profile._json.last_name,
                email: profile._json.email,
                profilePicUrl: profile.photos[0].value,
            },
            { upsert: true },
            function (error: any, user: any) {
                return done(error, user);
            }
        );
    }
);
