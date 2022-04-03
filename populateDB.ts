import { login, signup } from "./tests/utils/auth.utils";
import { addComment, addLikeToComment } from "./tests/utils/comment.utils";
import { addLikeToPost, addPost } from "./tests/utils/post.utils";

const populateDB = async () => {
    await Promise.all([
        signup("Zero", 201),
        signup("One", 201),
        signup("Two", 201),
        signup("Three", 201),
        signup("Four", 201),
    ]);
    let users: Array<any> = await Promise.all([
        login("Zero", 200),
        login("One", 200),
        login("Two", 200),
        login("Three", 200),
        login("Four", 200),
    ]);
    users = users.map((user) => user.body);
    users.forEach((user) => {
        addPost(user.token, 100, 201).then((res) => {
            const postId = res.body.postId;
            users.forEach((user) => {
                addLikeToPost(user.token, postId, 200);
                addComment(user.token, postId, 50, 201).then((res) => {
                    const commentId = res.body.commentId;
                    addLikeToComment(user.token, postId, commentId, 200);
                });
            });
        });
    });
};
export default populateDB;
