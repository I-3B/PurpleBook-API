declare global {
    namespace Express {
        interface User {
            id: String;
            isAdmin: boolean;
            userRouteAuthorized: boolean;
        }
    }
}
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
export default global;
