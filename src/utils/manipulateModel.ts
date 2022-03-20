import { ObjectId } from "mongoose";

const addLikedByUserField = (obj: { likes: Array<ObjectId> }, userId: String) => {
    let likedByUser = false;
    if (obj.likes.some((like) => like.toString() === userId)) {
        likedByUser = true;
    }
    const likedByUserAddedToPost = { likedByUser, ...obj };

    return likedByUserAddedToPost;
};
const removeLikesField = (obj: { likes: Array<ObjectId> }) => {
    const { likes, ...likesRemoved } = obj;
    return likesRemoved;
};
const addLikedByUserFieldAndRemoveLikesField = (
    obj: { likes: Array<ObjectId> },
    userId: String
) => {
    let objEdited = addLikedByUserField(obj, userId);
    return removeLikesField(objEdited);
};
export { addLikedByUserFieldAndRemoveLikesField };
