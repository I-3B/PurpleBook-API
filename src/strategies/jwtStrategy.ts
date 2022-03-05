require("dotenv").config();
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const User = require("../models/User");

const opts = { jwtFromRequest: null, secretOrKey: "" };
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.SECRET || "";

export default new JwtStrategy(
    opts,
    (jwt_payload: { email: any }, done: (arg0: null, arg1: boolean) => any) => {
        User.findOne({ email: jwt_payload.email }).exec(
            (err: any, user: boolean) => {
                if (err) return done(null, false);
                return done(null, user);
            }
        );
    }
);
