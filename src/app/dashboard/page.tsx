"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Loader2, Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/dashboard-shell";
import { PageContent } from "@/components/layout/page-content";
import {
  CreateKbDialog,
  DeleteKbDialog,
  EditKbDialog,
  KbCard,
} from "./components";
import { useKbList } from "./hooks";

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    kbs,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    open,
    setOpen,
    name,
    setName,
    handleCreate,
    handleDelete,
    deleteKb,
    setDeleteKb,
    confirmDelete,
    editKb,
    editName,
    setEditName,
    handleEdit,
    confirmEdit,
    cancelEdit,
    loadMore,
    creating,
    deleting,
    updating,
  } = useKbList();

  useEffect(() => {
    const target = bottomRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-white">
      <DashboardPageHeader
        size="compact"
        breadcrumbs={[{ label: "控制台" }]}
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebed] bg-white px-3.5 text-[12.5px] font-medium text-[#62636b] shadow-sm transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            <Plus size={12} strokeWidth={2.5} />
            新建知识库
          </button>
        }
      />

      <PageContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#0f0f10]">
              我的知识库
            </h1>
            {loadingMore ? (
              <span className="text-[11px] text-[#aaabb2]">正在加载中</span>
            ) : null}
          </div>
          <p className="mt-1 text-[12.5px] text-[#8a8b93]">
            共 {total} 个知识库
          </p>
          {error ? (
            <p className="mt-2 text-[12px] text-red-500">{error}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[10px] border border-[#ebebed] bg-white p-5"
              >
                <div className="mb-4 h-9 w-9 rounded-[8px] bg-[#f0f0f3]" />
                <div className="mb-2 h-4 w-3/4 rounded bg-[#f0f0f3]" />
                <div className="h-3 w-1/2 rounded bg-[#f0f0f3]" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && total === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <BookOpen size={28} strokeWidth={1.3} className="text-[#d0d0d8]" />
            <p className="text-[13px] text-[#aaabb2]">
              还没有知识库，点击“新建知识库”开始。
            </p>
          </div>
        ) : null}

        {!loading && total > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
              {kbs.map((kb) => (
                <KbCard
                  key={kb.id}
                  kb={kb}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#d8d8de] bg-white text-[#c0c0c8] transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-500"
              >
                <Plus size={20} strokeWidth={1.5} />
                <span className="text-[12.5px] font-medium">新建知识库</span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pb-4">
              <div ref={bottomRef} className="h-1 w-full" />

              {loadingMore ? (
                <div className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#ebebed] bg-white px-4 text-[12px] text-[#8a8b93]">
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  正在加载更多知识库
                </div>
              ) : hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="h-9 rounded-[10px] border border-[#ebebed] px-4 text-[12px] font-medium text-[#62636b] transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  加载更多
                </button>
              ) : (
                <p className="text-[12px] text-[#aaabb2]">已经到底了</p>
              )}
            </div>
          </>
        ) : null}
      </PageContent>

      <DeleteKbDialog
        kb={deleteKb}
        onClose={() => setDeleteKb(null)}
        onConfirm={() => void confirmDelete()}
        deleting={deleting}
      />

      <EditKbDialog
        kb={editKb}
        editName={editName}
        onChangeName={setEditName}
        onConfirm={confirmEdit}
        onCancel={cancelEdit}
        updating={updating}
      />

      <CreateKbDialog
        open={open}
        onOpenChange={setOpen}
        name={name}
        onChangeName={setName}
        onCreate={handleCreate}
        creating={creating}
      />
    </div>
  );
}

