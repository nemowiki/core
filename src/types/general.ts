export type Branded<T, K> = T & { _brand: K };
export type WikiResponse = {
    ok: boolean;
    reason: string;
};
export type WikiResponseWithData<T> = WikiResponse & { data: T };
