"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [narrativeFrame, setNarrativeFrame] = useState("");
  const [rootCategory, setRootCategory] = useState("");
  const [hashroot, setHashroot] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [parentIdError, setParentIdError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const charCount = content.length;
  const hasLengthWarning = charCount > 10000;
  const isTitleEmpty = title.trim() === "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTitleError("");
    setParentIdError("");
    if (isPublishing) {
      return;
    }
  
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedTitle) {
      setTitleError("Title is required.");
      return;
    }
    
    if (!trimmedContent) {
      setError("Please write something before publishing.");
      return;
    }

    // Validate parent ID before making request
    let validParent: number | null = null;
    if (parentId.trim()) {
      const parentIdNum = parseInt(parentId.trim(), 10);
      if (Number.isNaN(parentIdNum) || parentIdNum < 1) {
        setParentIdError("Parent Seed ID must be a positive integer.");
        return;
      }
      validParent = parentIdNum;
    }
  
    try {
      setIsPublishing(true);

      const payload: any = {
        title: trimmedTitle,
        content_body: trimmedContent,
      };
      
      if (description.trim()) payload.description = description.trim();
      if (narrativeFrame.trim()) payload.narrative_frame = narrativeFrame.trim();
      if (rootCategory.trim()) payload.root_category = rootCategory.trim();
      if (hashroot.trim()) payload.hashroot = hashroot.trim();
      if (validParent !== null) payload.parent_seed_id = validParent;

      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(
          json?.error ??
            "Publishing failed. Please review your Seed and try again."
        );
        return;
      }

      // Clear form state before navigation
      setTitle("");
      setContent("");
      setDescription("");
      setNarrativeFrame("");
      setRootCategory("");
      setHashroot("");
      setParentId("");
      router.push(`/seed/${json.seed_id}`);
    } catch (err) {
      setError(
        "We couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
                GUAVA NEXUS v0
              </h1>
              <p className="mt-2 text-base text-zinc-500 dark:text-zinc-500">
                Create versioned Seeds with preserved history
              </p>
            </div>
            <Link
              href="/seeds"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Browse seeds →
            </Link>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Title <span className="text-amber-600 dark:text-amber-500">*</span>
            </label>
            <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
              Title cannot be changed after publish.
            </p>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError("");
              }}
              placeholder="Enter a title for your Seed…"
              className={`w-full rounded border bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-500 ${
                titleError
                  ? "border-amber-600 focus:border-amber-500 dark:border-amber-500"
                  : "border-zinc-200 focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              }`}
              aria-label="Seed title"
            />
            {titleError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                {titleError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="content" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Content
            </label>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                {charCount.toLocaleString()} characters
              </span>
              {hasLengthWarning && (
                <span className="text-xs text-amber-600 dark:text-amber-500">
                  Warning: content is very long ({charCount.toLocaleString()} chars)
                </span>
              )}
            </div>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your Seed here. This will be published as an authored work."
              className="min-h-[280px] w-full resize-y rounded border border-zinc-200 bg-transparent px-4 py-3 text-lg leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Seed content"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this version…"
              className="min-h-[80px] w-full resize-y rounded border border-zinc-200 bg-transparent px-4 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Version description"
            />
          </div>

          <div>
            <label htmlFor="narrativeFrame" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Narrative Frame (optional)
            </label>
            <input
              id="narrativeFrame"
              type="text"
              value={narrativeFrame}
              onChange={(e) => setNarrativeFrame(e.target.value)}
              placeholder="e.g., theory, story, proposal…"
              className="w-full rounded border border-zinc-200 bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Narrative frame"
            />
          </div>

          <div>
            <label htmlFor="rootCategory" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Root Category (optional)
            </label>
            <input
              id="rootCategory"
              type="text"
              value={rootCategory}
              onChange={(e) => setRootCategory(e.target.value)}
              placeholder="e.g., technology, philosophy, science…"
              className="w-full rounded border border-zinc-200 bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Root category"
            />
          </div>

          <div>
            <label htmlFor="hashroot" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Hashroot (optional)
            </label>
            <input
              id="hashroot"
              type="text"
              value={hashroot}
              onChange={(e) => setHashroot(e.target.value)}
              placeholder="Content hash or reference…"
              className="w-full rounded border border-zinc-200 bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Hashroot"
            />
          </div>

          <div>
            <label htmlFor="parentId" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Derived from (optional)
            </label>
            <input
              id="parentId"
              type="text"
              value={parentId}
              onChange={(e) => {
                setParentId(e.target.value);
                setParentIdError("");
              }}
              placeholder="Parent Seed ID…"
              className={`w-full rounded border bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-500 ${
                parentIdError
                  ? "border-amber-600 focus:border-amber-500 dark:border-amber-500"
                  : "border-zinc-200 focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              }`}
              aria-label="Parent Seed ID"
            />
            {parentIdError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                {parentIdError}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isPublishing || isTitleEmpty}
              className="w-full rounded border border-zinc-800 bg-zinc-800 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPublishing ? "Publishing…" : "Publish Seed"}
            </button>
            {isTitleEmpty && !isPublishing && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-500">
                Title is required to publish
              </p>
            )}
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
              Publishing creates a versioned Seed with preserved history.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
