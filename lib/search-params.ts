import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const searchParamsParsers = {
	tag: parseAsString,
};

export const searchParamsCache = createSearchParamsCache(searchParamsParsers);
