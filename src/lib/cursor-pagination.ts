// Cursor 分页必须使用稳定排序，避免相同 createdAt 的记录在翻页时重复或漏掉。
export function getCreatedAtDescCursorOrderBy() {
  return [
    { createdAt: "desc" as const },
    { id: "desc" as const },
  ]
}
