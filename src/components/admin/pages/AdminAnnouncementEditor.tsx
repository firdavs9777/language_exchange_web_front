import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useGetAnnouncementQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useUploadAnnouncementImageMutation,
  useDeleteAnnouncementMutation,
  AdminAnnouncement,
} from "../../../store/slices/adminSlice";
import { Badge } from "../../../design";
import AnnouncementPreview from "../parts/AnnouncementPreview";
import AnnouncementPublishBar from "../parts/AnnouncementPublishBar";
import AnnouncementDeliveryStatus from "../parts/AnnouncementDeliveryStatus";
import ConfirmDialog from "../parts/ConfirmDialog";
import {
  ANNOUNCEMENT_LOCALES,
  ANNOUNCEMENT_LIMITS,
  LOCALE_LABELS,
  AnnouncementForm,
  FormErrors,
  TranslationDraft,
  blankTranslation,
  emptyForm,
  fromAnnouncement,
  fromLocalInput,
  toInput,
  validateForm,
} from "../parts/announcementForm";

/**
 * Create or edit one announcement (spec 2026-10-12 §5.3).
 *
 * `/admin/announcements/new` creates a draft; after the first save the URL
 * moves to the real id (replace, so Back returns to the list). What may be
 * edited follows the backend: draft/scheduled everything, live only text,
 * end time and priority, ended nothing. Only a draft can be deleted (the
 * backend refuses the rest: end it instead).
 */

const errorMessage = (err: any, fallback: string): string =>
  (err && err.data && err.data.message) || (err && err.message) || fallback;

const inputClass =
  "w-full rounded-card border border-line bg-white px-3 py-2 text-sm text-ink-900 disabled:opacity-60 dark:border-line-dark dark:bg-ink-900 dark:text-ink-50";
const labelClass = "block text-sm font-medium text-ink-700 dark:text-ink-200";

const FieldError: React.FC<{ errors: FormErrors; name: string }> = ({ errors, name }) =>
  errors[name] ? (
    <p data-testid={`error-${name}`} className="mt-1 text-xs text-red-600">
      {errors[name]}
    </p>
  ) : null;

const snapshot = (form: AnnouncementForm): string => JSON.stringify(form);

const AnnouncementEditorBody: React.FC<{ id: string | null; onCreated: (id: string) => void }> = ({ id, onCreated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const existing = useGetAnnouncementQuery(id, { skip: !id });
  const [createAnnouncement, createState] = useCreateAnnouncementMutation();
  const [updateAnnouncement, updateState] = useUpdateAnnouncementMutation();
  const [uploadImage, uploadState] = useUploadAnnouncementImageMutation();
  const [deleteAnnouncement, deleteState] = useDeleteAnnouncementMutation();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");

  // The row this editor just saved. It stands in for the fetched row so that the
  // editor (and the publish bar's open dialog) never flashes to "Loading…" in the
  // gap between creating a draft and the first fetch of it.
  const [saved, setSaved] = React.useState<AdminAnnouncement | null>(null);
  const fetched: AdminAnnouncement | null = id && existing.data ? existing.data : null;
  const doc: AdminAnnouncement | null = fetched || (id && saved && saved.id === id ? saved : null);
  const status = doc ? doc.status : "draft";
  const liveOnly = status === "live";
  const readOnly = status === "ended";
  const lockTargeting = liveOnly || readOnly;

  const [form, setForm] = React.useState<AnnouncementForm>(emptyForm());
  const [tab, setTab] = React.useState("en");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [actionError, setActionError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  // Re-seed the form from the server when a different document or a newer
  // version arrives -- but never over unsaved edits: a background refetch (focus,
  // an invalidation) must not throw away what the admin is typing. `baseline` is
  // the form as last seeded or saved; the form is "dirty" when it differs.
  const baseline = React.useRef(snapshot(emptyForm()));
  const seededId = React.useRef<string | null>(null);
  const inFlight = React.useRef(false);
  const docVersion = doc ? `${doc.id}:${doc.updatedAt}` : "";
  React.useEffect(() => {
    if (!doc) return;
    const firstOfThisDoc = seededId.current !== doc.id;
    if (firstOfThisDoc || snapshot(form) === baseline.current) {
      const seeded = fromAnnouncement(doc);
      setForm(seeded);
      baseline.current = snapshot(seeded);
      if (firstOfThisDoc) setTab(doc.defaultLocale || "en");
    }
    seededId.current = doc.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docVersion]);

  const text: TranslationDraft = form.translations[tab] || blankTranslation();

  const setField = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setText = (field: keyof TranslationDraft, value: string) =>
    setForm((f) => ({
      ...f,
      translations: { ...f.translations, [tab]: { ...(f.translations[tab] || blankTranslation()), [field]: value } },
    }));

  const toggle = (list: string[], value: string): string[] =>
    list.indexOf(value) >= 0 ? list.filter((v) => v !== value) : list.concat(value);

  /**
   * Validate, then create or update. Resolves to the saved row, or null. The
   * publish bar saves through it first. `inFlight` is a ref, not state, so a
   * double click can't start a second create before the first returns.
   */
  const save = async (opts: { schedule?: boolean; publish?: boolean } = {}): Promise<AdminAnnouncement | null> => {
    if (inFlight.current || uploadState.isLoading) return null;
    const found = validateForm(form, { schedule: opts.schedule, publish: opts.publish });
    setErrors(found);
    setActionError("");
    setNotice("");
    if (Object.keys(found).length) return null;
    inFlight.current = true;
    try {
      const body = toInput(form, liveOnly);
      const result: AdminAnnouncement = id
        ? await updateAnnouncement({ id, ...body }).unwrap()
        : await createAnnouncement(body).unwrap();
      baseline.current = snapshot(form);
      setSaved(result);
      if (!id) {
        seededId.current = result.id;
        onCreated(result.id);
        navigate(`/admin/announcements/${result.id}`, { replace: true });
      }
      return result;
    } catch (err) {
      setActionError(errorMessage(err, t("admin.common.actionError") || "Something went wrong."));
      return null;
    } finally {
      inFlight.current = false;
    }
  };

  const onSave = async () => {
    if (await save()) setNotice(t("admin.announcements.saved") || "Saved.");
  };

  const onImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setActionError("");
    try {
      const result: { url: string } = await uploadImage(file).unwrap();
      setField("imageUrl", result.url);
    } catch (err) {
      setActionError(errorMessage(err, t("admin.announcements.uploadError") || "Couldn't upload the image."));
    }
  };

  const onDelete = async () => {
    if (!id || inFlight.current) return;
    inFlight.current = true;
    setDeleteError("");
    try {
      await deleteAnnouncement(id).unwrap();
      setConfirmDelete(false);
      navigate("/admin/announcements", { replace: true });
    } catch (err) {
      setDeleteError(errorMessage(err, t("admin.common.actionError") || "Something went wrong."));
    } finally {
      inFlight.current = false;
    }
  };

  if (id && existing.isError) {
    return (
      <p role="alert" className="rounded-card border border-line p-4 text-sm text-red-600 dark:border-line-dark">
        {t("admin.announcements.loadOneError") || "Couldn't load this announcement."}
      </p>
    );
  }
  if (id && !doc) {
    return <p className="text-sm text-ink-500">{t("admin.common.loading") || "Loading…"}</p>;
  }

  const busy = createState.isLoading || updateState.isLoading || uploadState.isLoading || deleteState.isLoading;
  const filled = (locale: string) => {
    const tr = form.translations[locale];
    return !!tr && (tr.title.trim() !== "" || tr.body.trim() !== "");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/announcements" className="text-sm text-brand-deep hover:underline dark:text-brand-light">
            {t("admin.announcements.back") || "← Announcements"}
          </Link>
          <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
            {id ? t("admin.announcements.edit") || "Edit announcement" : t("admin.announcements.new") || "New announcement"}
          </h1>
          <Badge tone={status === "live" || status === "scheduled" ? "brand" : "banana"}>{status}</Badge>
        </div>
      </header>

      {liveOnly ? (
        <p className="text-sm text-ink-600 dark:text-ink-300">
          {t("admin.announcements.liveHint") || "Live: only the text, end time and priority can change."}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
          <div role="tablist" aria-label={t("admin.announcements.languages") || "Languages"} className="flex flex-wrap gap-1">
            {ANNOUNCEMENT_LOCALES.map((locale) => (
              <button
                key={locale}
                type="button"
                role="tab"
                aria-selected={tab === locale}
                aria-label={LOCALE_LABELS[locale]}
                onClick={() => setTab(locale)}
                className={[
                  "rounded-chip px-2.5 py-1 text-xs font-medium",
                  tab === locale ? "bg-brand-deep text-white" : "border border-line text-ink-700 dark:border-line-dark dark:text-ink-200",
                ].join(" ")}
              >
                {locale}
                {filled(locale) ? " •" : ""}
                {locale === form.defaultLocale ? " ★" : ""}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="ann-title" className={labelClass}>{t("admin.announcements.titleField") || "Title"}</label>
            <input id="ann-title" className={inputClass} value={text.title} disabled={readOnly}
              maxLength={ANNOUNCEMENT_LIMITS.title} onChange={(e) => setText("title", e.target.value)} />
            <FieldError errors={errors} name={`translations.${tab}.title`} />
          </div>
          <div>
            <label htmlFor="ann-body" className={labelClass}>{t("admin.announcements.bodyField") || "Body"}</label>
            <textarea id="ann-body" rows={5} className={inputClass} value={text.body} disabled={readOnly}
              maxLength={ANNOUNCEMENT_LIMITS.body} onChange={(e) => setText("body", e.target.value)} />
            <div className="text-right text-xs text-ink-400">{text.body.length}/{ANNOUNCEMENT_LIMITS.body}</div>
            <FieldError errors={errors} name={`translations.${tab}.body`} />
          </div>
          <div>
            <label htmlFor="ann-button-label" className={labelClass}>{t("admin.announcements.buttonLabel") || "Button label"}</label>
            <input id="ann-button-label" className={inputClass} value={text.buttonLabel} disabled={readOnly}
              maxLength={ANNOUNCEMENT_LIMITS.buttonLabel} onChange={(e) => setText("buttonLabel", e.target.value)} />
            <FieldError errors={errors} name={`translations.${tab}.buttonLabel`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ann-default" className={labelClass}>{t("admin.announcements.defaultLanguage") || "Default language"}</label>
              <select id="ann-default" className={inputClass} value={form.defaultLocale} disabled={lockTargeting}
                onChange={(e) => setField("defaultLocale", e.target.value)}>
                {ANNOUNCEMENT_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ann-emoji" className={labelClass}>{t("admin.announcements.emoji") || "Emoji"}</label>
              <input id="ann-emoji" className={inputClass} value={form.emoji} disabled={lockTargeting}
                onChange={(e) => setField("emoji", e.target.value)} />
              <FieldError errors={errors} name="emoji" />
            </div>
            <div>
              <label htmlFor="ann-image" className={labelClass}>{t("admin.announcements.image") || "Image"}</label>
              <input id="ann-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={lockTargeting || uploadState.isLoading} onChange={onImage} className="text-sm" />
              {form.imageUrl && !lockTargeting ? (
                <button type="button" className="ml-2 text-xs text-red-600" onClick={() => setField("imageUrl", "")}>
                  {t("admin.announcements.removeImage") || "Remove image"}
                </button>
              ) : null}
            </div>
            <div>
              <label htmlFor="ann-url" className={labelClass}>{t("admin.announcements.buttonUrl") || "Button link"}</label>
              <input id="ann-url" className={inputClass} value={form.buttonUrl} disabled={lockTargeting}
                placeholder="https://… · bananatalk://…" onChange={(e) => setField("buttonUrl", e.target.value)} />
              <FieldError errors={errors} name="buttonUrl" />
            </div>
          </div>

          <fieldset>
            <legend className={labelClass}>{t("admin.announcements.platforms") || "Platforms"}</legend>
            <div className="mt-1 flex gap-4">
              {(["all", "ios", "android"] as Array<"all" | "ios" | "android">).map((p) => (
                <label key={p} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.platforms.indexOf(p) >= 0} disabled={lockTargeting}
                    onChange={() => setField("platforms", toggle(form.platforms, p) as Array<"all" | "ios" | "android">)} />
                  {p === "all" ? "All platforms" : p === "ios" ? "iOS" : "Android"}
                </label>
              ))}
            </div>
            <FieldError errors={errors} name="platforms" />
          </fieldset>

          <fieldset>
            <legend className={labelClass}>{t("admin.announcements.appLanguages") || "App languages (none = all)"}</legend>
            <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
              {ANNOUNCEMENT_LOCALES.map((l) => (
                <label key={l} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" aria-label={`Target ${LOCALE_LABELS[l]}`} checked={form.languages.indexOf(l) >= 0}
                    disabled={lockTargeting} onChange={() => setField("languages", toggle(form.languages, l))} />
                  {LOCALE_LABELS[l]}
                </label>
              ))}
            </div>
            <p data-testid="language-hint" className="mt-1 text-xs text-ink-500">
              {t("admin.announcements.languageHint") ||
                "Language targeting only reaches the new app. People on app 2.6.1 (most users today) only get announcements sent to all languages, so pick no language to reach everyone."}
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="ann-start" className={labelClass}>{t("admin.announcements.starts") || "Starts"}</label>
              <input id="ann-start" type="datetime-local" className={inputClass} value={form.startsAt}
                disabled={lockTargeting} onChange={(e) => setField("startsAt", e.target.value)} />
              <FieldError errors={errors} name="startsAt" />
            </div>
            <div>
              <label htmlFor="ann-end" className={labelClass}>{t("admin.announcements.ends") || "Ends"}</label>
              <input id="ann-end" type="datetime-local" className={inputClass} value={form.endsAt}
                disabled={readOnly} onChange={(e) => setField("endsAt", e.target.value)} />
              <FieldError errors={errors} name="endsAt" />
            </div>
            <div>
              <label htmlFor="ann-priority" className={labelClass}>{t("admin.announcements.priority") || "Priority"}</label>
              <input id="ann-priority" type="number" step={1} className={inputClass} value={form.priority}
                disabled={readOnly} onChange={(e) => setField("priority", e.target.value)} />
              <FieldError errors={errors} name="priority" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" role="switch" checked={form.showInApp} disabled={lockTargeting}
                onChange={(e) => setField("showInApp", e.target.checked)} />
              {t("admin.announcements.showInApp") || "Show in app"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" role="switch" checked={form.notify} disabled={lockTargeting}
                onChange={(e) => setField("notify", e.target.checked)} />
              {t("admin.announcements.notify") || "Send notification"}
            </label>
          </div>
          <FieldError errors={errors} name="channels" />

          {actionError ? (
            <p role="alert" className="text-sm text-red-600">{actionError}</p>
          ) : null}
          {notice ? <p className="text-sm text-ink-600 dark:text-ink-300">{notice}</p> : null}

          <div className="flex flex-wrap items-center gap-2" data-testid="editor-actions">
            {!readOnly ? (
              <button type="button" disabled={busy} onClick={onSave}
                className="rounded-chip border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-60 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800">
                {status === "draft" ? t("admin.announcements.saveDraft") || "Save draft" : t("admin.announcements.save") || "Save"}
              </button>
            ) : null}
            <AnnouncementPublishBar
              announcementId={id}
              status={status}
              notify={form.notify}
              startsAtIso={fromLocalInput(form.startsAt)}
              disabled={busy}
              prepare={async (mode) => {
                const result = await save({ schedule: mode === "schedule", publish: mode === "publish" });
                return result ? result.id : null;
              }}
              onDone={(message) => setNotice(message)}
            />
            {id && status === "draft" ? (
              <button type="button" disabled={busy} onClick={() => { setDeleteError(""); setConfirmDelete(true); }}
                className="ml-auto rounded-chip border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                {t("admin.announcements.deleteDraft") || "Delete draft"}
              </button>
            ) : null}
          </div>

          {doc && (doc.notify || (doc.delivery && doc.delivery.state !== "none")) ? (
            <AnnouncementDeliveryStatus row={doc} />
          ) : null}

          <ConfirmDialog
            open={confirmDelete}
            title={t("admin.announcements.deleteTitle") || "Delete this draft?"}
            body={t("admin.announcements.deleteBody") || "The draft and its text are removed for good. Nobody has seen it."}
            confirmLabel={t("admin.announcements.deleteDraft") || "Delete draft"}
            cancelLabel={t("admin.common.cancel") || "Cancel"}
            danger
            busy={deleteState.isLoading}
            error={deleteError || undefined}
            onConfirm={() => { onDelete(); }}
            onCancel={() => setConfirmDelete(false)}
          />
        </form>

        <aside>
          <div className="mb-2 text-eyebrow uppercase text-ink-400">{t("admin.announcements.preview") || "Preview"}</div>
          <AnnouncementPreview
            emoji={form.emoji}
            imageUrl={form.imageUrl}
            title={text.title}
            body={text.body}
            buttonLabel={text.buttonLabel}
          />
        </aside>
      </div>
    </div>
  );
};

/**
 * Keyed by the announcement id, so Back/Forward between /new and an existing
 * row (or between two rows) always starts from that row's own state -- reusing
 * the old form would let a second "Save" create a duplicate. The one exception
 * is this editor's own first save, which moves /new to the new id: that is the
 * same editing session, so it keeps its key and the publish bar's open dialog.
 */
const AdminAnnouncementEditor: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params.id && params.id !== "new" ? params.id : null;
  const [session, setSession] = React.useState<{ id: string | null; key: number }>({ id, key: 0 });
  const adopted = React.useRef<string | null>(null);
  if (session.id !== id) {
    // State derived from the previous render: a new key unless this is the
    // editor's own first save moving /new to the id it just created.
    const ownCreate = session.id === null && id !== null && id === adopted.current;
    adopted.current = null;
    setSession({ id, key: ownCreate ? session.key : session.key + 1 });
  }
  return <AnnouncementEditorBody key={session.key} id={id} onCreated={(created) => { adopted.current = created; }} />;
};

export default AdminAnnouncementEditor;
