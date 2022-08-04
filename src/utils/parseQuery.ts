import { PipelineStage } from "mongoose";

export default function parseQuery(
    limit: string,
    defaultLimit: number,
    skip: string,
    sort?: string
) {
    const limitInt = parseInt(limit + "");
    const skipInt = parseInt(skip + "");
    const limitValue = isNaN(limitInt) ? defaultLimit : limitInt;
    const skipValue = isNaN(skipInt) ? 0 : skipInt;
    const sortByStage: PipelineStage =
        sort === "date"
            ? { $sort: { createdAt: -1 } }
            : { $sort: { likesCount: -1, createdAt: -1 } };
    return { limitValue, skipValue, sortByStage };
}
