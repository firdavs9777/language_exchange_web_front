import { apiSlice } from "./apiSlice";
import { MESSAGES_URL, CONVERSATIONS_URL } from "../../constants";

// Interfaces
export interface MessageData {
  sender: string;
  receiver: string;
  message: string;
  type?: 'text' | 'image' | 'voice' | 'video' | 'file';
  replyTo?: string;
}

/**
 * The parties of a send, so the thread's FIRST page can be refreshed after it.
 *
 * A text send names both; a media/voice/video send is FormData that carries
 * only `receiver` (the server takes the sender from the token). For those the
 * sender is read back off the thread the reader already has open — the cache
 * key of `getConversation` is `getConversation-<senderId>-<receiverId>`, and
 * its `originalArgs` hold both ids.
 */
function partiesOfSend(arg: any, state: any): { senderId: string; receiverId: string; limit: number } | null {
  let receiverId = "";
  let senderId = "";
  if (arg && typeof arg.get === "function") {
    receiverId = String(arg.get("receiver") || "");
  } else if (arg) {
    receiverId = String(arg.receiver || "");
    senderId = String(arg.sender || "");
  }
  if (!receiverId) return null;

  let limit = 50;
  const queries = (state && state[apiSlice.reducerPath] && state[apiSlice.reducerPath].queries) || {};
  Object.keys(queries).forEach((key: string) => {
    const entry: any = queries[key];
    const args = entry && entry.originalArgs;
    if (!args || entry.endpointName !== "getConversation") return;
    if (args.receiverId !== receiverId) return;
    if (!senderId) senderId = String(args.senderId || "");
    if (args.senderId === senderId && args.limit) limit = args.limit;
  });

  return senderId ? { senderId, receiverId, limit } : null;
}

/**
 * Refetch page 1 of the thread after a send.
 *
 * Invalidating the `Conversation` tag refetched whatever page the reader was
 * LOOKING at — page 3, say, deep in the history — so a message just sent (it
 * is on page 1) never entered the cache and the screen and the cache
 * disagreed until the conversation was reopened. `serializeQueryArgs` drops
 * the page, so this lands in the same entry and `merge` upserts it by id.
 */
function refetchFirstPage(arg: any, api: any): void {
  const parties = partiesOfSend(arg, api.getState());
  if (!parties) return;
  api.dispatch(
    (chatApiSlice.endpoints as any).getConversation.initiate(
      {
        senderId: parties.senderId,
        receiverId: parties.receiverId,
        page: 1,
        limit: parties.limit,
      },
      { forceRefetch: true, subscribe: false }
    )
  );
}

async function refetchFirstPageOnSuccess(arg: any, api: any): Promise<void> {
  try {
    await api.queryFulfilled;
  } catch (error) {
    return;
  }
  refetchFirstPage(arg, api);
}

export const chatApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    // Conversations
    getConversations: builder.query({
      query: ({ page = 1, limit = 50 } = {}) => ({
        url: `${CONVERSATIONS_URL}?page=${page}&limit=${limit}`,
      }),
      providesTags: ["Conversations"],
    }),
    createChatRoom: builder.mutation({
      query: (userId: string) => ({
        url: `${MESSAGES_URL}/conversations`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: ["Conversations"],
    }),
    // Conversation actions all live at /api/v1/conversations/:id/... — NOT
    // /api/v1/messages/conversations/... The earlier URL was a typo that
    // 404'd silently against the prod backend.
    deleteConversation: builder.mutation({
      query: (conversationId: string) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Conversations"],
    }),
    markConversationRead: builder.mutation({
      query: (conversationId: string) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Conversations"],
    }),
    muteConversation: builder.mutation({
      query: ({ conversationId, duration }: { conversationId: string; duration?: number }) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/mute`,
        method: "POST",
        body: { duration },
      }),
      invalidatesTags: ["Conversations"],
    }),
    unmuteConversation: builder.mutation({
      query: (conversationId: string) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/unmute`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),
    pinConversation: builder.mutation({
      query: (conversationId: string) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/pin`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),
    unpinConversation: builder.mutation({
      query: (conversationId: string) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/unpin`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),

    // Wallpaper / theme — SHARED by both participants, which is the whole
    // point: the app writes it with PUT and the server pushes `themeChanged`
    // to the other person's socket room. `:id` is the conversation id (the
    // controller also accepts the other user's id, but the socket payload is
    // keyed by the conversation, so the cache has to be too).
    getConversationTheme: builder.query({
      query: (conversationId: string) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/theme`,
      }),
      providesTags: ["ChatTheme"],
    }),
    setConversationTheme: builder.mutation({
      query: ({ conversationId, theme }: { conversationId: string; theme: any }) => ({
        url: `${CONVERSATIONS_URL}/${conversationId}/theme`,
        method: "PUT",
        body: { theme },
      }),
      invalidatesTags: ["ChatTheme"],
    }),

    // Messages
    getMessages: builder.query({
      query: () => ({
        url: `${MESSAGES_URL}`,
      }),
      providesTags: ["Messages"],
    }),
    getUserMessages: builder.query({
      query: (userId: string) => ({
        url: `${MESSAGES_URL}/user/${userId}`,
      }),
      providesTags: ["UserMessages"],
    }),
    // One cache entry per conversation, however many pages deep it goes —
    // RTK Query's "infinite" pattern. `serializeQueryArgs` drops `page` from
    // the key so every page lands in the same entry, `forceRefetch` asks the
    // network when only the page changed (otherwise the merged entry would
    // count as a cache hit and nothing would load), and `merge` puts older
    // pages in FRONT: the backend returns page 1 = newest, each page oldest
    // first, so page N+1 is always older than everything already held.
    getConversation: builder.query({
      query: ({
        senderId,
        receiverId,
        page = 1,
        limit = 50,
      }: {
        senderId: string;
        receiverId: string;
        page?: number;
        limit?: number;
      }) => ({
        url: `${MESSAGES_URL}/conversation/${senderId}/${receiverId}?page=${page}&limit=${limit}`,
      }),
      serializeQueryArgs: ({ queryArgs, endpointName }: any) => {
        const args = queryArgs || {};
        return `${endpointName}-${args.senderId}-${args.receiverId}`;
      },
      merge: (currentCache: any, newItems: any, otherArgs: any) => {
        const page = (otherArgs && otherArgs.arg && otherArgs.arg.page) || 1;
        const incoming: any[] = (newItems && newItems.data) || [];
        if (!currentCache.data) currentCache.data = [];

        // Where each id already sits, so a message that comes back again is
        // UPDATED in place (a read receipt, a new reaction, an edit) instead
        // of appended a second time.
        const indexById: { [id: string]: number } = {};
        currentCache.data.forEach((m: any, i: number) => {
          if (m && m._id) indexById[m._id] = i;
        });

        const fresh: any[] = [];
        incoming.forEach((m: any) => {
          if (!m || !m._id) return;
          const at = indexById[m._id];
          if (at === undefined) fresh.push(m);
          else currentCache.data[at] = m;
        });

        if (page > 1) currentCache.data.unshift.apply(currentCache.data, fresh);
        else currentCache.data.push.apply(currentCache.data, fresh);

        currentCache.count = currentCache.data.length;
        if (newItems && newItems.total !== undefined) currentCache.total = newItems.total;
        if (newItems && newItems.pagination) currentCache.pagination = newItems.pagination;
      },
      forceRefetch: ({ currentArg, previousArg }: any) =>
        (currentArg && currentArg.page) !== (previousArg && previousArg.page),
      providesTags: ["Conversation"],
    }),
    createMessage: builder.mutation({
      query: (newMessage: MessageData) => ({
        url: `${MESSAGES_URL}`,
        method: "POST",
        body: newMessage,
      }),
      // No "Conversation" tag: see refetchFirstPage above.
      invalidatesTags: ["Messages", "Conversations"],
      onQueryStarted: refetchFirstPageOnSuccess,
    }),
    editMessage: builder.mutation({
      query: ({ messageId, content }: { messageId: string; content: string }) => ({
        url: `${MESSAGES_URL}/${messageId}`,
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: ["Conversation"],
    }),
    deleteMessage: builder.mutation({
      query: ({ messageId, forEveryone = false }: { messageId: string; forEveryone?: boolean }) => ({
        url: `${MESSAGES_URL}/${messageId}?forEveryone=${forEveryone}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Conversation"],
    }),

    // Message Reactions
    addReaction: builder.mutation({
      query: ({ messageId, emoji }: { messageId: string; emoji: string }) => ({
        url: `${MESSAGES_URL}/${messageId}/reactions`,
        method: "POST",
        body: { emoji },
      }),
      invalidatesTags: ["Conversation"],
    }),
    removeReaction: builder.mutation({
      query: ({ messageId, emoji }: { messageId: string; emoji: string }) => ({
        url: `${MESSAGES_URL}/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Conversation"],
    }),

    // Voice Messages - POST /api/v1/messages/voice with FormData (field: voice)
    sendVoiceMessage: builder.mutation({
      query: (formData: FormData) => ({
        url: `${MESSAGES_URL}/voice`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Conversations"],
      onQueryStarted: refetchFirstPageOnSuccess,
    }),

    // Media Messages - POST /api/v1/messages with FormData (field: attachment)
    sendMediaMessage: builder.mutation({
      query: (formData: FormData) => ({
        url: `${MESSAGES_URL}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Conversations"],
      onQueryStarted: refetchFirstPageOnSuccess,
    }),

    // Video Messages - POST /api/v1/messages/video with FormData (field: video)
    sendVideoMessage: builder.mutation({
      query: (formData: FormData) => ({
        url: `${MESSAGES_URL}/video`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Conversations"],
      onQueryStarted: refetchFirstPageOnSuccess,
    }),

    // Pin (toggle) — POST /api/v1/messages/:id/pin, no body. Server does NOT
    // emit this over socket, so invalidate the conversation/list tags so the
    // UI refetches the pinned state.
    pinMessage: builder.mutation({
      query: (messageId: string) => ({
        url: `${MESSAGES_URL}/${messageId}/pin`,
        method: "POST",
      }),
      invalidatesTags: ["Conversation", "Conversations"],
    }),

    // Bookmarks
    bookmarkMessage: builder.mutation({
      query: (messageId: string) => ({
        url: `${MESSAGES_URL}/${messageId}/bookmark`,
        method: "POST",
      }),
      invalidatesTags: ["Conversation"],
    }),
    unbookmarkMessage: builder.mutation({
      query: (messageId: string) => ({
        url: `${MESSAGES_URL}/${messageId}/bookmark`,
        method: "DELETE",
      }),
      invalidatesTags: ["Conversation"],
    }),
    getBookmarks: builder.query({
      query: () => ({
        url: `${MESSAGES_URL}/bookmarks`,
      }),
      providesTags: ["Conversation"],
    }),

    // Forward — POST /api/v1/messages/:id/forward, body {receivers: string[]}
    // (array of target user IDs — confirmed against
    // controllers/messageManagement.js forwardMessage).
    forwardMessage: builder.mutation({
      query: ({ messageId, receivers }: { messageId: string; receivers: string[] }) => ({
        url: `${MESSAGES_URL}/${messageId}/forward`,
        method: "POST",
        body: { receivers },
      }),
      invalidatesTags: ["Conversations"],
    }),

    // Reply — POST /api/v1/messages/:id/reply, body {message, receiver}
    // (confirmed against controllers/messageManagement.js replyToMessage).
    replyToMessage: builder.mutation({
      query: ({
        messageId,
        message,
        receiver,
      }: {
        messageId: string;
        message: string;
        receiver: string;
      }) => ({
        url: `${MESSAGES_URL}/${messageId}/reply`,
        method: "POST",
        body: { message, receiver },
      }),
      invalidatesTags: ["Conversations"],
      onQueryStarted: refetchFirstPageOnSuccess,
    }),

    // TTS — POST /api/v1/messages/:id/tts. Response (confirmed against
    // controllers/advancedMessages.js getMessageTTS):
    // { success, data: { audioUrl, duration, cached } } — an audio URL to
    // play, NOT base64/binary.
    ttsMessage: builder.mutation({
      query: ({
        messageId,
        language,
        speed,
      }: {
        messageId: string;
        language?: string;
        speed?: number;
      }) => ({
        url: `${MESSAGES_URL}/${messageId}/tts`,
        method: "POST",
        body: { language, speed },
      }),
    }),

    // Search
    searchMessages: builder.query({
      query: ({ query, conversationId, page = 1, limit = 20 }: {
        query: string;
        conversationId?: string;
        page?: number;
        limit?: number;
      }) => ({
        url: `${MESSAGES_URL}/search?q=${encodeURIComponent(query)}${conversationId ? `&conversationId=${conversationId}` : ''}&page=${page}&limit=${limit}`,
      }),
    }),

    // Translation
    translateMessage: builder.mutation({
      query: ({ messageId, targetLanguage }: { messageId: string; targetLanguage: string }) => ({
        url: `${MESSAGES_URL}/${messageId}/translate`,
        method: "POST",
        body: { targetLanguage },
      }),
    }),

    // Save a translated phrase/word from a chat message to vocabulary (SRS queue)
    saveMessageVocabulary: builder.mutation({
      query: ({
        messageId,
        word,
        translation,
        language,
        pronunciation,
        partOfSpeech,
      }: {
        messageId: string;
        word: string;
        translation: string;
        language: string;
        pronunciation?: string;
        partOfSpeech?: string;
      }) => ({
        url: `${MESSAGES_URL}/${messageId}/vocabulary`,
        method: "POST",
        body: { word, translation, language, pronunciation, partOfSpeech },
      }),
    }),
  }),
});

export const {
  // Conversations
  useGetConversationsQuery,
  useCreateChatRoomMutation,
  useDeleteConversationMutation,
  useMarkConversationReadMutation,
  useMuteConversationMutation,
  useUnmuteConversationMutation,
  usePinConversationMutation,
  useUnpinConversationMutation,
  // Wallpaper
  useGetConversationThemeQuery,
  useSetConversationThemeMutation,
  // Messages
  useGetMessagesQuery,
  useGetUserMessagesQuery,
  useGetConversationQuery,
  useCreateMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  // Reactions
  useAddReactionMutation,
  useRemoveReactionMutation,
  // Voice
  useSendVoiceMessageMutation,
  // Media
  useSendMediaMessageMutation,
  // Video
  useSendVideoMessageMutation,
  // Pin
  usePinMessageMutation,
  // Bookmarks
  useBookmarkMessageMutation,
  useUnbookmarkMessageMutation,
  useGetBookmarksQuery,
  // Forward / Reply / TTS
  useForwardMessageMutation,
  useReplyToMessageMutation,
  useTtsMessageMutation,
  // Search
  useSearchMessagesQuery,
  // Translation
  useTranslateMessageMutation,
  useSaveMessageVocabularyMutation,
} = chatApiSlice;

export default chatApiSlice.reducer;
