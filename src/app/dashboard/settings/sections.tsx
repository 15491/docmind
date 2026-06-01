"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { SaveButton, FieldRow, TextInput, MaskInput, RangeInput } from "./form"
import { useProfileForm, useEmailChange, useApiForm, useRagConfig, useDangerZone } from "./hooks"

export function ProfileSection() {
  const {
    nickname,
    setNickname,
    email,
    hasPassword,
    hasGithubAccount,
    isLinkingGithub,
    isUnlinkingGithub,
    unlinkConfirm,
    setUnlinkConfirm,
    oldPwd,
    setOldPwd,
    newPwd,
    setNewPwd,
    handleSave,
    handleGithubLink,
    handleGithubUnlink,
  } = useProfileForm()
  const [showEmailChange, setShowEmailChange] = useState(false)
  const { newEmail, setNewEmail, code, setCode, step, sending, saving, error: emailError, countdown, sendCode, confirmChange } = useEmailChange()
  const passwordSectionTitle = hasPassword === false ? "设置登录密码" : "修改密码"
  const passwordSectionHint = hasPassword === false
    ? "设置后可直接使用邮箱和密码登录"
    : "更新后需要重新登录"
  const passwordStatusLabel = hasPassword === null ? "读取中" : hasPassword ? "已启用" : "未设置"

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-foreground">账户信息</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">管理你的个人资料和登录凭据</p>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">基本信息</p>
        <div className="bg-card border border-border rounded-[10px] px-5">
          <FieldRow label="昵称" hint="显示在对话界面右下角">
            <TextInput value={nickname} onChange={setNickname} placeholder="你的名字" />
          </FieldRow>
          <FieldRow label="邮箱" hint={showEmailChange ? undefined : "用于登录和通知"}>
            <div className="flex items-center gap-2 w-full">
              <div className="flex h-9 w-full items-center rounded-[8px] border-[1.5px] border-input bg-muted px-3 text-[13px] text-muted-foreground">
                {email || "you@example.com"}
              </div>
              {!showEmailChange && (
                <button
                  type="button"
                  onClick={() => setShowEmailChange(true)}
                  className="flex-shrink-0 text-[11.5px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  修改
                </button>
              )}
            </div>
          </FieldRow>
          <FieldRow label="登录方式" hint="可同时启用邮箱密码和 GitHub 登录">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium ${
                    hasPassword
                      ? "border-border bg-background text-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {hasPassword ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  ) : null}
                  邮箱密码 {passwordStatusLabel}
                </span>
                <span
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium ${
                    hasGithubAccount
                      ? "border-border bg-background text-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {hasGithubAccount ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  ) : null}
                  GitHub {hasGithubAccount ? "已绑定" : "未绑定"}
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {hasGithubAccount
                  ? hasPassword
                    ? "当前账号已绑定 GitHub。设置邮箱密码后，你可以自由选择 GitHub 或邮箱密码登录。"
                    : "GitHub 是你当前唯一的登录方式，设置邮箱密码后才能解绑。"
                  : "当前账号还没有绑定 GitHub。绑定后可直接使用 GitHub 登录，也能与邮箱密码并存。"}
              </p>
              {!hasGithubAccount && (
                <button
                  type="button"
                  onClick={handleGithubLink}
                  disabled={isLinkingGithub}
                  className="h-9 rounded-[8px] border border-input bg-card px-3.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLinkingGithub ? "跳转中…" : "绑定 GitHub"}
                </button>
              )}
              {hasGithubAccount && hasPassword && (
                unlinkConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-muted-foreground">确认解绑 GitHub？</span>
                    <button
                      type="button"
                      onClick={handleGithubUnlink}
                      disabled={isUnlinkingGithub}
                      className="h-8 rounded-[8px] border border-destructive/40 px-3 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isUnlinkingGithub ? "解绑中…" : "确认解绑"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnlinkConfirm(false)}
                      disabled={isUnlinkingGithub}
                      className="h-8 rounded-[8px] border border-input px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUnlinkConfirm(true)}
                    className="h-9 rounded-[8px] border border-input bg-card px-3.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    解绑 GitHub
                  </button>
                )
              )}
            </div>
          </FieldRow>
          {showEmailChange && (
            <div className="py-4 border-t border-border space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">修改邮箱</p>
              {emailError && (
                <p className="text-[12px] text-destructive">{emailError}</p>
              )}
              {step === "done" ? (
                <p className="text-[12.5px] text-foreground">邮箱已更新，正在跳转到登录页…</p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <TextInput
                      value={newEmail}
                      onChange={setNewEmail}
                      type="email"
                      placeholder="输入新邮箱地址"
                    />
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={sending || countdown > 0 || !newEmail}
                      className="flex-shrink-0 h-9 px-3.5 rounded-[8px] border border-input text-[12px] font-medium text-foreground bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sending ? "发送中…" : countdown > 0 ? `${countdown}s` : "发送验证码"}
                    </button>
                  </div>
                  {step === "codeSent" && (
                    <div className="flex gap-2">
                      <TextInput
                        value={code}
                        onChange={setCode}
                        placeholder="输入 6 位验证码"
                      />
                      <button
                        type="button"
                        onClick={confirmChange}
                        disabled={saving || !code}
                        className="flex-shrink-0 h-9 px-3.5 rounded-[8px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving ? "确认中…" : "确认修改"}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEmailChange(false)}
                    className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    取消
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{passwordSectionTitle}</p>
        <div className="bg-card border border-border rounded-[10px] px-5">
          {hasPassword !== false && (
            <FieldRow label="当前密码">
              <MaskInput value={oldPwd} onChange={setOldPwd} placeholder="输入当前密码" />
            </FieldRow>
          )}
          <FieldRow label={hasPassword === false ? "登录密码" : "新密码"} hint={passwordSectionHint}>
            <MaskInput value={newPwd} onChange={setNewPwd} placeholder={hasPassword === false ? "输入要设置的密码" : "输入新密码"} />
          </FieldRow>
        </div>
      </div>
      <div className="flex justify-end">
        <SaveButton onSave={handleSave} />
      </div>
    </div>
  )
}

export function ApiSection() {
  const { glmKey, setGlmKey, handleSave } = useApiForm()
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-foreground">API 配置</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">配置大模型调用密钥，地址由服务端统一管理</p>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">智谱 AI</p>
        <div className="bg-card border border-border rounded-[10px] px-5">
          <FieldRow label="API Key" hint="GLM-4-Flash 对话与 Embedding-3 向量化共用同一密钥">
            <MaskInput value={glmKey} onChange={setGlmKey} placeholder="sk-••••••••••••••••" />
          </FieldRow>
        </div>
      </div>
      <div className="bg-muted border border-border rounded-[10px] p-4 flex items-start gap-3 mb-6">
        <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-muted-foreground">i</span>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          API Key 加密保存在服务器，仅用于调用智谱 AI 接口。若需自定义代理地址，请在服务端配置
          <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-[11px] text-foreground">ZHIPU_BASE_URL</code>
          。前往
          <a href="https://open.bigmodel.cn" target="_blank" rel="noreferrer"
            className="text-foreground font-semibold underline underline-offset-2 hover:text-foreground mx-1">
            智谱开放平台
          </a>
          申请密钥。留空则使用服务器默认密钥。
        </p>
      </div>
      <div className="flex justify-end">
        <SaveButton onSave={handleSave} />
      </div>
    </div>
  )
}

export function RagSection() {
  const { chunkSize, setChunkSize, overlap, setOverlap, topK, setTopK, temperature, setTemperature, handleSave } = useRagConfig()
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-foreground">检索参数</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">调整文档分块与向量检索的默认参数</p>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">文档分块</p>
        <div className="bg-card border border-border rounded-[10px] px-5">
          <FieldRow label="Chunk 大小" hint="每块包含的最大 token 数">
            <RangeInput value={chunkSize} onChange={setChunkSize} min={100} max={2000} step={50} unit="tokens" />
          </FieldRow>
          <FieldRow label="重叠长度" hint="相邻 chunk 之间共享的 token 数，避免截断上下文">
            <RangeInput value={overlap} onChange={setOverlap} min={0} max={200} step={10} unit="tokens" />
          </FieldRow>
        </div>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">向量检索</p>
        <div className="bg-card border border-border rounded-[10px] px-5">
          <FieldRow label="Top-K" hint="检索时返回最相关的前 K 个片段">
            <RangeInput value={topK} onChange={setTopK} min={1} max={20} step={1} unit="条" />
          </FieldRow>
          <FieldRow label="Temperature" hint="值越低回答越保守，越高越发散">
            <RangeInput value={temperature} onChange={setTemperature} min={0} max={1} step={0.1} unit="" />
          </FieldRow>
        </div>
      </div>
      <div className="flex justify-end">
        <SaveButton onSave={handleSave} />
      </div>
    </div>
  )
}

export function DangerSection() {
  const { confirm, setConfirm, clearing, deleting, handleClearKbs, handleDeleteAccount } = useDangerZone()
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-foreground">危险操作</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">以下操作不可撤销，请谨慎执行</p>
      </div>
      <div className="space-y-3">
        <div className="bg-card border border-border rounded-[10px] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-foreground">清空所有知识库</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">删除所有文档、向量索引和关联对话记录，操作不可恢复</p>
          </div>
          <button
            type="button"
            onClick={handleClearKbs}
            disabled={clearing}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8 flex-shrink-0 rounded-[8px] border px-3.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? "清空中…" : "清空知识库"}
          </button>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[13px] font-semibold text-destructive">注销账户</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">永久删除账户及所有数据，无法恢复</p>
            </div>
            <ChevronRight size={15} strokeWidth={2} className="text-muted-foreground flex-shrink-0" />
          </div>
          <div className="space-y-2">
            <p className="text-[11.5px] text-muted-foreground">
              请输入 <span className="font-bold text-foreground font-mono">DELETE</span> 以确认
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                className="flex-1 h-9 bg-background border-[1.5px] border-input rounded-[8px] px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 transition-all font-mono"
              />
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={confirm !== "DELETE" || deleting}
                className="bg-destructive hover:bg-destructive/90 h-9 rounded-[8px] px-4 text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              >
                {deleting ? "注销中…" : "注销账户"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
