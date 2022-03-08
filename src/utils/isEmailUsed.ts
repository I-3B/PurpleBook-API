import User from "../models/User";

const isEmailUsed = async (email: String) => {
    const found = await User.findOne({ email });
    return !!found;
};
export default isEmailUsed