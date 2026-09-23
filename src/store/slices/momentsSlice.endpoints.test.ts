/**
 * Task 0 (moments parity phase 1): asserts the REAL request shape
 * (URL/method/body/FormData) each new momentsSlice endpoint produces, and
 * that `getMoments` without `feed` still serializes to the exact same
 * URL/cache key the prerender prefetch (src/seo/prerender/prefetch.ts)
 * depends on. Mirrors momentsActionsEndpoints.test.ts, but dispatches
 * against the real app store (src/store) as instructed.
 */
import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";
import { makeStore } from "../../store";
import { momentsApiSlice } from "./momentsSlice";
import { MOMENTS_URL, COMMENTS_URL } from "../../constants";

type Captured = { url: string; method: string; body: string | undefined; contentType: string | null };

function mockFetch(): Captured[] {
  const calls: Captured[] = [];
  (global as any).fetch = jest.fn(async (req: any) => {
    let body: string | undefined = req.body;
    if (body === undefined && req.clone) {
      try {
        body = await req.clone().text();
      } catch {
        // whatwg-fetch's polyfilled Request can't re-serialize a FormData
        // body as text — expected for uploadCommentImage. URL/method/the
        // multipart content-type are asserted instead.
        body = undefined;
      }
    }
    calls.push({
      url: req.url,
      method: req.method,
      body,
      contentType: req.headers?.get ? req.headers.get("content-type") : null,
    });
    return new Response(
      JSON.stringify({ success: true, data: {} }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  });
  return calls;
}

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("momentsSlice Task 0 endpoints hit the REAL backend routes", () => {
  it("translateComment -> POST /api/v1/comments/:commentId/translate with {targetLanguage}", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).translateComment.initiate({
        commentId: "comment-1",
        targetLanguage: "ko",
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${COMMENTS_URL}/comment-1/translate`);
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body as string)).toEqual({ targetLanguage: "ko" });
  });

  it("likeComment -> POST /api/v1/comments/:commentId/like (no body)", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).likeComment.initiate("comment-1")
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${COMMENTS_URL}/comment-1/like`);
    expect(calls[0].method).toBe("POST");
  });

  it("reactToComment -> POST /api/v1/comments/:commentId/react with {emoji}", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).reactToComment.initiate({
        commentId: "comment-1",
        emoji: "😂",
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${COMMENTS_URL}/comment-1/react`);
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body as string)).toEqual({ emoji: "😂" });
  });

  it("unreactToComment -> DELETE /api/v1/comments/:commentId/react (no body)", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).unreactToComment.initiate({
        commentId: "comment-1",
        emoji: "😂",
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${COMMENTS_URL}/comment-1/react`);
    expect(calls[0].method).toBe("DELETE");
  });

  it("getCommentReplies -> GET /api/v1/comments/:commentId/replies?page=&limit=", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).getCommentReplies.initiate({
        commentId: "comment-1",
        page: 2,
        limit: 15,
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${COMMENTS_URL}/comment-1/replies`);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("15");
    expect(calls[0].method).toBe("GET");
  });

  it("getCommentReplies -> defaults to page=1&limit=20", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).getCommentReplies.initiate({
        commentId: "comment-1",
      })
    );
    const url = new URL(calls[0].url);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("uploadCommentImage -> PUT /api/v1/comments/:commentId/image with a FormData body (field: image)", async () => {
    // jsdom/whatwg-fetch's Request can't re-serialize or re-read a FormData
    // body (no content-type header gets set, .formData()/.text() both throw
    // -- confirmed by hand against this exact environment), so the network
    // layer can't prove the body shape here. Spying on FormData.append proves
    // the query function itself builds `new FormData()` with the right field
    // name instead, which is what "or FormData presence" comes down to.
    const calls = mockFetch();
    const store = makeStore();
    const file = new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
    const appendSpy = jest.spyOn(FormData.prototype, "append");
    await store.dispatch(
      (momentsApiSlice.endpoints as any).uploadCommentImage.initiate({
        commentId: "comment-1",
        file,
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${COMMENTS_URL}/comment-1/image`);
    expect(calls[0].method).toBe("PUT");
    expect(appendSpy).toHaveBeenCalledWith("image", file);
    appendSpy.mockRestore();
  });

  it("recordMomentViews -> POST /api/v1/moments/views with a views[] batch carrying real per-moment watchedMs/completed", async () => {
    const calls = mockFetch();
    const store = makeStore();
    await store.dispatch(
      (momentsApiSlice.endpoints as any).recordMomentViews.initiate({
        views: [
          { momentId: "moment-1", watchedMs: 1500, completed: false },
          { momentId: "moment-2", watchedMs: 6000, completed: true },
        ],
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`${MOMENTS_URL}/views`);
    expect(calls[0].method).toBe("POST");
    const parsed = JSON.parse(calls[0].body as string);
    expect(parsed.views).toEqual([
      { momentId: "moment-1", watchedMs: 1500, completed: false },
      { momentId: "moment-2", watchedMs: 6000, completed: true },
    ]);
  });

  describe("getMoments feed parameter", () => {
    it("produces the exact same URL for {page:1,limit:10} with or without an explicit feed key omitted", async () => {
      const calls = mockFetch();
      const store = makeStore();
      await store.dispatch(
        (momentsApiSlice.endpoints as any).getMoments.initiate({ page: 1, limit: 10 })
      );
      expect(calls).toHaveLength(1);
      expect(new URL(calls[0].url).pathname + new URL(calls[0].url).search).toBe(
        `${MOMENTS_URL}?page=1&limit=10`
      );
    });

    it("appends &feed=following only when feed is given", async () => {
      const calls = mockFetch();
      const store = makeStore();
      await store.dispatch(
        (momentsApiSlice.endpoints as any).getMoments.initiate({
          page: 1,
          limit: 10,
          feed: "following",
        })
      );
      expect(calls).toHaveLength(1);
      expect(new URL(calls[0].url).pathname + new URL(calls[0].url).search).toBe(
        `${MOMENTS_URL}?page=1&limit=10&feed=following`
      );
    });

    it("gives {page:1,limit:10} and {page:1,limit:10,feed:undefined} the same RTK Query cache key", () => {
      // Default serializeQueryArgs is (roughly) JSON.stringify({endpointName,
      // queryArgs}) -- JSON.stringify drops undefined-valued keys, so a
      // `feed` key that's merely undefined never changes the key. This is
      // what actually guarantees the prerender prefetch's cache entry
      // ({page:1,limit:10}, no feed key at all) is still found by a mount
      // that calls useGetMomentsQuery({page:1,limit:10,feed:undefined}).
      const keyA = defaultSerializeQueryArgs({
        endpointName: "getMoments",
        queryArgs: { page: 1, limit: 10 },
        endpointDefinition: undefined as any,
      });
      const keyB = defaultSerializeQueryArgs({
        endpointName: "getMoments",
        queryArgs: { page: 1, limit: 10, feed: undefined },
        endpointDefinition: undefined as any,
      });
      expect(keyA).toBe(keyB);
    });
  });
  describe("addMomentComment sends the field names models/Comment.js stores", () => {
    it("posts { text } for a plain comment", async () => {
      const calls = mockFetch();
      const store = makeStore();
      await store.dispatch(
        (momentsApiSlice.endpoints as any).addMomentComment.initiate({
          momentId: "moment-1",
          text: "Nice one",
        })
      );
      expect(calls).toHaveLength(1);
      expect(new URL(calls[0].url).pathname).toBe(`${MOMENTS_URL}/moment-1/comments`);
      expect(calls[0].method).toBe("POST");
      expect(JSON.parse(calls[0].body as string)).toEqual({ text: "Nice one" });
    });

    it("posts { text, parentComment } for a reply", async () => {
      const calls = mockFetch();
      const store = makeStore();
      await store.dispatch(
        (momentsApiSlice.endpoints as any).addMomentComment.initiate({
          momentId: "moment-1",
          text: "Agreed",
          parentComment: "comment-1",
        })
      );
      expect(JSON.parse(calls[0].body as string)).toEqual({
        text: "Agreed",
        parentComment: "comment-1",
      });
    });

    it("posts { text: '', correction } for a correction with no note -- the server labels it itself", async () => {
      const calls = mockFetch();
      const store = makeStore();
      await store.dispatch(
        (momentsApiSlice.endpoints as any).addMomentComment.initiate({
          momentId: "moment-1",
          correction: {
            originalText: "I go to school yesterday",
            correctedText: "I went to school yesterday",
            explanation: "Past tense.",
          },
        })
      );
      expect(JSON.parse(calls[0].body as string)).toEqual({
        text: "",
        correction: {
          originalText: "I go to school yesterday",
          correctedText: "I went to school yesterday",
          explanation: "Past tense.",
        },
      });
    });
  });
});
