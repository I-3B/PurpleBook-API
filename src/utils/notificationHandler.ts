import Comment from "../models/Comment";
import Notification from "../models/Notification";
import Post from "../models/Post";
import User from "../models/User";
const notificationHandler = {
    postLiked: async (likeSenderId: String, postId: string) => {
        const [likeSender, likedPost] = await Promise.all([
            User.findById(likeSenderId, {
                firstName: 1,
                lastName: 1,
                imageMini: 1,
            }),
            Post.findById(postId, { authorId: 1 }),
        ]);
        const likeSenderName = `${likeSender.firstName} ${likeSender.lastName}`;

        //if like sender is the post author don't send notification
        if (likeSenderId !== likedPost.authorId.toString())
            Notification.create({
                userId: likedPost.authorId,
                image: likeSender.imageMini,
                links: [
                    { linkId: postId, ref: "Post" },
                    { linkId: likeSenderId, ref: "User" },
                ],
                content: `${likeSenderName} liked your post`,
            });
    },
    commentLiked: async (likeSenderId: String, postId: string, commentId: string) => {
        const [likeSender, likedComment, postCommentedOn] = await Promise.all([
            User.findById(likeSenderId, {
                firstName: 1,
                lastName: 1,
                imageMini: 1,
            }),
            Comment.findById(commentId, { authorId: 1 }),
            Post.findById(postId, { authorId: 1 }).populate("authorId", {
                firstName: 1,
                lastName: 1,
            }),
        ]);
        const likeSenderName = `${likeSender.firstName} ${likeSender.lastName}`;
        const postAuthor = `${postCommentedOn.authorId.firstName} ${postCommentedOn.authorId.lastName}`;
        //if like sender is the post author don't send notification
        if (likeSenderId !== likedComment.authorId.toString())
            Notification.create({
                userId: likedComment.authorId,
                image: likeSender.imageMini,
                links: [
                    { linkId: commentId, ref: "Comment" },
                    { linkId: postId, ref: "Post" },
                    { linkId: likeSenderId, ref: "User" },
                ],
                content: `${likeSenderName} liked your comment on ${postAuthor}'s posts`,
            });
    },
    postCommentedOn: async (commenterId: String, postId: string, commentId: string) => {
        const [commenter, postCommentedOn] = await Promise.all([
            User.findById(commenterId, { firstName: 1, lastName: 1, imageMini: 1 }),
            Post.findById(postId, { authorId: 1 }),
        ]);

        const commenterName = `${commenter.firstName} ${commenter.lastName}`;

        //if commenter is the post author don't send notification
        if (commenterId !== postCommentedOn.authorId.toString())
            Notification.create({
                userId: postCommentedOn.authorId,
                image: commenter.imageMini,

                links: [
                    { linkId: commentId, ref: "Comment" },
                    { linkId: postId, ref: "Post" },
                    { linkId: commenterId, ref: "User" },
                ],
                content: `${commenterName} commented on your post`,
            });
    },
    friendRequestAccepted: async (
        friendRequestReceiverId: String,
        friendRequestSenderId: String
    ) => {
        const frr = await User.findById(friendRequestReceiverId, {
            firstName: 1,
            lastName: 1,
            imageMini: 1,
        });
        const frrName = `${frr.firstName} ${frr.lastName}`;

        Notification.create({
            image: frr.imageMini,
            userId: friendRequestSenderId,
            links: [{ linkId: friendRequestReceiverId, ref: "User" }],
            content: `${frrName} accepted your friend request`,
        });
    },
};

export default notificationHandler;
