import Link from "next/link";
import { BookOpen, MessageSquare, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Kb } from "./types";

type KbCardProps = {
  kb: Kb;
  onEdit: (kb: Kb) => void;
  onDelete: (kb: Kb) => void;
};

export function KbCard({ kb, onEdit, onDelete }: KbCardProps) {
  return (
    <div className="group relative cursor-pointer rounded-[10px] border border-[#ebebed] bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#f4f4f5]">
        <BookOpen size={16} strokeWidth={1.8} className="text-zinc-500" />
      </div>
      <h3 className="mb-1 truncate pr-14 text-[13.5px] font-semibold leading-snug text-[#0f0f10]">
        {kb.name}
      </h3>
      <p className="text-[11.5px] text-[#aaabb2]">
        {kb.documentCount} 篇文档 ·{" "}
        {new Date(kb.createdAt).toLocaleDateString()}
      </p>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          href={`/dashboard/kb/${kb.id}/chat`}
          onClick={(event) => event.stopPropagation()}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          title="开始问答"
        >
          <MessageSquare size={13} strokeWidth={1.8} />
        </Link>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onEdit(kb);
          }}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          title="编辑名称"
        >
          <Pencil size={13} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onDelete(kb);
          }}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-red-50 hover:text-red-500"
          title="删除"
        >
          <Trash2 size={13} strokeWidth={1.8} />
        </button>
      </div>

      <Link
        href={`/dashboard/kb/${kb.id}`}
        className="absolute inset-0 rounded-[10px]"
      />
    </div>
  );
}

type DeleteKbDialogProps = {
  kb: Kb | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
};

export function DeleteKbDialog({
  kb,
  onClose,
  onConfirm,
  deleting,
}: DeleteKbDialogProps) {
  return (
    <Dialog open={!!kb} onOpenChange={(visible) => !visible && onClose()}>
      <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Delete the selected knowledge base and all related documents.
          </DialogDescription>
          <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">
            删除知识库
          </DialogTitle>
        </DialogHeader>
        <div className="py-1">
          <p className="text-[13px] leading-relaxed text-[#62636b]">
            确定要删除{" "}
            <span className="font-semibold text-[#0f0f10]">{kb?.name}</span>{" "}
            吗？ 该知识库下所有文档和向量索引都会同步清除，此操作不可撤销。
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 rounded-[8px] bg-red-500 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "删除中..." : "确认删除"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditKbDialogProps = {
  kb: Kb | null;
  editName: string;
  onChangeName: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  updating: boolean;
};

export function EditKbDialog({
  kb,
  editName,
  onChangeName,
  onConfirm,
  onCancel,
  updating,
}: EditKbDialogProps) {
  return (
    <Dialog open={!!kb} onOpenChange={(visible) => !visible && onCancel()}>
      <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Rename the selected knowledge base.
          </DialogDescription>
          <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">
            编辑知识库名称
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="输入新的知识库名称（至少 2 个字符）"
            value={editName}
            onChange={(event) => onChangeName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onConfirm()}
            className="h-9 border-[#e2e2e8] text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] focus-visible:border-zinc-700 focus-visible:ring-zinc-900/20"
            autoFocus
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={editName.trim().length < 2 || updating}
            className="h-8 rounded-[8px] bg-zinc-900 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {updating ? "保存中..." : "保存"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CreateKbDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onChangeName: (name: string) => void;
  onCreate: () => void;
  creating: boolean;
};

export function CreateKbDialog({
  open,
  onOpenChange,
  name,
  onChangeName,
  onCreate,
  creating,
}: CreateKbDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Create a new knowledge base.
          </DialogDescription>
          <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">
            新建知识库
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="输入知识库名称（至少 2 个字符）"
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onCreate()}
            className="h-9 border-[#e2e2e8] text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] focus-visible:border-zinc-700 focus-visible:ring-zinc-900/20"
            autoFocus
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={name.trim().length < 2 || creating}
            className="h-8 rounded-[8px] bg-zinc-900 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "创建中..." : "创建"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

