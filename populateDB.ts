import { login, signup, signupWithImage } from "./tests/utils/auth.utils";
import { addComment } from "./tests/utils/comment.utils";
import { addLikeToPost, addPostWithImage } from "./tests/utils/post.utils";
import { acceptFriendRequest, addFriendRequest } from "./tests/utils/user.utils";

const populateDB = async () => {
    await signupWithImage("Zero", "/images/profile.png", 201);
    await signup("One", 201);
    const zero = (await login("Zero", 200)).body;
    const one = (await login("One", 200)).body;

    for (let i = 1; i <= 25; i++) {
        const zeroPost = (await addPostWithImage(zero.token, i, "/images/post.jpg", 201)).body;
        await Promise.all([
            addLikeToPost(zero.token, zeroPost.postId, 200),
            addLikeToPost(one.token, zeroPost.postId, 200),
        ]);
        for (let i = 1; i <= 15; i++) {
            await addComment(zero.token, zeroPost.postId, i, 201);
        }
    }
    await addFriendRequest(zero.userId, one.token, 200).then(async () => {
        await acceptFriendRequest(zero.userId, zero.token, one.userId, 200);
    });
};
export default populateDB;
