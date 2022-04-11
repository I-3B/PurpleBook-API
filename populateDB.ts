import { login, signup } from "./tests/utils/auth.utils";
import { addComment } from "./tests/utils/comment.utils";
import { addLikeToPost, addPost } from "./tests/utils/post.utils";
import { acceptFriendRequest, addFriendRequest } from "./tests/utils/user.utils";

const populateDB = async () => {
    await signup("Zero", 201);
    await signup("One", 201);
    const zero = (await login("Zero", 200)).body;
    const one = (await login("One", 200)).body;

    const zeroPost = (await addPost(zero.token, 70, 201)).body;
    await Promise.all([
        addLikeToPost(zero.token, zeroPost.postId, 200),
        addLikeToPost(one.token, zeroPost.postId, 200),
        addComment(zero.token, zeroPost.postId, 50, 201),
        addComment(one.token, zeroPost.postId, 50, 201),
    ]);
    await addFriendRequest(zero.userId, one.token, 200).then(async () => {
        await acceptFriendRequest(zero.userId, zero.token, one.userId, 200);
    });
};
export default populateDB;
