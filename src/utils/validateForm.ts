import { body } from "express-validator";

const validateFirstAndLastName = [
    body("firstName")
        .exists()
        .trim()
        .isAlpha()
        .withMessage("First name can only be alphabetic (english).")
        .isLength({ min: 1, max: 20 })
        .withMessage("First name cannot be empty or more than 20 characters.")
        .escape(),
    body("lastName")
        .exists()
        .trim()
        .isAlpha()
        .withMessage("Last name can only be alphabetic (english).")
        .isLength({ min: 1, max: 20 })
        .withMessage("Last name cannot be empty or more than 20 characters.")
        .escape(),
];

const POST_CHARACTERS_LIMIT = 5000;
const validatePostContent = body("content")
    .trim()
    .isLength({ max: POST_CHARACTERS_LIMIT })
    .withMessage(`post content can not be more than ${POST_CHARACTERS_LIMIT} characters`)
    .escape();

const COMMENT_CHARACTERS_LIMIT = 2500;
const validateCommentContent = body("content")
    .trim()
    .isLength({ min: 1, max: COMMENT_CHARACTERS_LIMIT })
    .withMessage(
        `comment content can not be empty or more than ${COMMENT_CHARACTERS_LIMIT} characters`
    )
    .escape();
export {
    validateFirstAndLastName,
    validatePostContent,
    validateCommentContent,
    POST_CHARACTERS_LIMIT,
    COMMENT_CHARACTERS_LIMIT,
};
