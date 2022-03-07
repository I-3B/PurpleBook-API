require("dotenv").config();
import User from "../models/User";
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const opts = { jwtFromRequest: "", secretOrKey: "" };
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.SECRET || "SECRET";
export default new JwtStrategy(opts, function (
    jwt_payload: { email: String },
    done: (arg0: null, arg1: boolean) => any
) {
    User.findOne(
        { email: jwt_payload.email },
        { _id: 1 },
        (err: null, user: boolean) => {
            if (err) {
                return done(err, false);
            }
            if (user) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        }
    );
});
