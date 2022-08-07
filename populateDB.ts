import { login, signup, signupWithImage } from "./tests/utils/auth.utils";
import { addComment } from "./tests/utils/comment.utils";
import { addLikeToPost, addPostWithImage } from "./tests/utils/post.utils";
import { acceptFriendRequest, addFriendRequest } from "./tests/utils/user.utils";

const populateDB = async () => {
    await signupWithImage("Zero", "/images/profile.png", 201);
    await signup("One", 201);
    const zero = (await login("Zero", 200)).body;
    const one = (await login("One", 200)).body;

    await signup("FriendOne", 201);
    await signup("FriendTwo", 201);
    await signup("RecOne", 201); // friend of Friend1
    await signup("RecTwo", 201); // friend of Friend2
    await signup("RecThree", 201); // friend of Friend1 and Friend2

    const { userId: uId, token: uToken } = (await login("Zero", 200)).body;
    const { userId: f1Id, token: f1Token } = (await login("FriendOne", 200)).body;
    const { userId: f2Id, token: f2Token } = (await login("FriendTwo", 200)).body;
    const { userId: r1Id, token: r1Token } = (await login("RecOne", 200)).body;
    const { userId: r2Id, token: r2Token } = (await login("RecTwo", 200)).body;
    const { userId: r3Id, token: r3Token } = (await login("RecThree", 200)).body;
    // user's friends
    await addFriendRequest(f1Id, uToken, 200);
    await addFriendRequest(uId, f2Token, 200);
    //friend's friends
    await addFriendRequest(f1Id, f2Token, 200);
    await addFriendRequest(r1Id, f1Token, 200);
    await addFriendRequest(r2Id, f2Token, 200);
    await addFriendRequest(r3Id, f1Token, 200);
    await addFriendRequest(r3Id, f2Token, 200);

    await acceptFriendRequest(f1Id, f1Token, uId, 200);
    // await acceptFriendRequest(uId, uIdToken, f2Id, 200);

    await acceptFriendRequest(f2Id, f2Token, f1Id, 200);
    await acceptFriendRequest(r1Id, r1Token, f1Id, 200);
    await acceptFriendRequest(r2Id, r2Token, f2Id, 200);
    await acceptFriendRequest(r3Id, r3Token, f1Id, 200);
    await acceptFriendRequest(r3Id, r3Token, f2Id, 200);

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
