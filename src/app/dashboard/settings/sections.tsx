"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { SaveButton, FieldRow, TextInput, MaskInput, RangeInput } from "./form"
import { useProfileForm, useEmailChange, useApiForm, useRagConfig, useDangerZone } from "./hooks"

export function ProfileSection() {
  const { nickname, setNickname, email, oldPwd, setOldPwd, newPwd, setNewPwd, handleSave } = useProfileForm()
  const [showEmailChange, setShowEmailChange] = useState(false)
  const { newEmail, setNewEmail, code, setCode, step, sending, saving, error: emailError, countdown, sendCode, confirmChange } = useEmailChange()

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-[#0f0f10]">账户信息</h2>
        <p className="text-[12px] text-[#aaabb2] mt-0.5">管理你的个人资料和登录凭据</p>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-3">基本信息</p>
        <div className="bg-white border border-[#ebebed] rounded-[10px] px-5">
          <FieldRow label="昵称" hint="显示在对话界面右下角">
            <TextInput value={nickname} onChange={setNickname} placeholder="你的名字" />
          </FieldRow>
          <FieldRow label="邮箱" hint={showEmailChange ? undefined : "用于登录和通知"}>
            <div className="flex items-center gap-2 w-full">
              <TextInput value={email} onChange={() => {}} type="email" placeholder="you@example.com" />
              {!showEmailChange && (
                <button
                  type="button"
                  onClick={() => setShowEmailChange(true)}
                  className="flex-shrink-0 text-[11.5px] font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors"
                >
                  修改
                </button>
              )}
            </div>
          </FieldRow>
          {showEmailChange && (
            <div className="py-4 border-t border-[#f0f0f3] space-y-3">
              <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider">修改邮箱</p>
              {emailError && (
                <p className="text-[12px] text-red-500">{emailError}</p>
              )}
              {step === "done" ? (
                <p className="text-[12.5px] text-green-600">邮箱已更新，页面即将刷新…</p>
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
                      className="flex-shrink-0 h-9 px-3.5 rounded-[8px] border border-[#e2e2e8] text-[12px] font-medium text-[#35353d] bg-white hover:bg-[#f7f7f8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                        className="flex-shrink-0 h-9 px-3.5 rounded-[8px] bg-zinc-900 text-white text-[12px] font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving ? "确认中…" : "确认修改"}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEmailChange(false)}
                    className="text-[11.5px] text-[#aaabb2] hover:text-[#62636b] transition-colors"
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
        <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-3">修改密码</p>
        <div className="bg-white border border-[#ebebed] rounded-[10px] px-5">
          <FieldRow label="当前密码">
            <MaskInput value={oldPwd} onChange={setOldPwd} placeholder="输入当前密码" />
          </FieldRow>
          <FieldRow label="新密码" hint="至少 8 位">
            <MaskInput value={newPwd} onChange={setNewPwd} placeholder="输入新密码" />
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
  const { glmKey, setGlmKey, baseUrl, setBaseUrl, handleSave } = useApiForm()
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-[#0f0f10]">API 配置</h2>
        <p className="text-[12px] text-[#aaabb2] mt-0.5">配置大模型和向量化接口密钥</p>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-3">智谱 AI</p>
        <div className="bg-white border border-[#ebebed] rounded-[10px] px-5">
          <FieldRow label="API Key" hint="GLM-4-Flash 对话与 Embedding-3 向量化共用同一密钥">
            <MaskInput value={glmKey} onChange={setGlmKey} placeholder="sk-••••••••••••••••" />
          </FieldRow>
          <FieldRow label="API Base URL" hint="可使用自定义代理地址">
            <TextInput value={baseUrl} onChange={setBaseUrl} />
          </FieldRow>
        </div>
      </div>
      <div className="bg-[#fafafa] border border-[#ebebed] rounded-[10px] p-4 flex items-start gap-3 mb-6">
        <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-zinc-500">i</span>
        </div>
        <p className="text-[12px] text-[#62636b] leading-relaxed">
          API Key 加密保存在服务器，仅用于调用智谱 AI 接口。前往
          <a href="https://open.bigmodel.cn" target="_blank" rel="noreferrer"
            className="text-zinc-700 font-semibold underline underline-offset-2 hover:text-zinc-900 mx-1">
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
        <h2 className="text-[14px] font-semibold text-[#0f0f10]">检索参数</h2>
        <p className="text-[12px] text-[#aaabb2] mt-0.5">调整文档分块与向量检索的默认参数</p>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-3">文档分块</p>
        <div className="bg-white border border-[#ebebed] rounded-[10px] px-5">
          <FieldRow label="Chunk 大小" hint="每块包含的最大 token 数">
            <RangeInput value={chunkSize} onChange={setChunkSize} min={100} max={2000} step={50} unit="tokens" />
          </FieldRow>
          <FieldRow label="重叠长度" hint="相邻 chunk 之间共享的 token 数，避免截断上下文">
            <RangeInput value={overlap} onChange={setOverlap} min={0} max={200} step={10} unit="tokens" />
          </FieldRow>
        </div>
      </div>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-3">向量检索</p>
        <div className="bg-white border border-[#ebebed] rounded-[10px] px-5">
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
        <h2 className="text-[14px] font-semibold text-[#0f0f10]">危险操作</h2>
        <p className="text-[12px] text-[#aaabb2] mt-0.5">以下操作不可撤销，请谨慎执行</p>
      </div>
      <div className="space-y-3">
        <div className="bg-white border border-[#ebebed] rounded-[10px] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-[#35353d]">清空所有知识库</p>
            <p className="text-[12px] text-[#aaabb2] mt-0.5">删除所有文档和向量索引，对话记录保留</p>
          </div>
          <button
            type="button"
            onClick={handleClearKbs}
            disabled={clearing}
            className="h-8 px-3.5 rounded-[8px] border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-semibold hover:bg-amber-100 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearing ? "清空中…" : "清空知识库"}
          </button>
        </div>
        <div className="bg-white border border-red-100 rounded-[10px] p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[13px] font-semibold text-red-600">注销账户</p>
              <p className="text-[12px] text-[#aaabb2] mt-0.5">永久删除账户及所有数据，无法恢复</p>
            </div>
            <ChevronRight size={15} strokeWidth={2} className="text-[#d0d0d8] flex-shrink-0" />
          </div>
          <div className="space-y-2">
            <p className="text-[11.5px] text-[#aaabb2]">
              请输入 <span className="font-bold text-[#62636b] font-mono">DELETE</span> 以确认
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                className="flex-1 h-9 bg-white border-[1.5px] border-[#e2e2e8] rounded-[8px] px-3 text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] outline-none focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)] transition-all font-mono"
              />
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={confirm !== "DELETE" || deleting}
                className="h-9 px-4 rounded-[8px] text-[12.5px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "#ef4444", color: "#fff" }}
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
