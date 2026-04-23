"use client"

import { useState } from "react"

export function useProfileForm() {
  const [nickname, setNickname] = useState("白")
  const [email, setEmail] = useState("user@example.com")
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  return { nickname, setNickname, email, setEmail, oldPwd, setOldPwd, newPwd, setNewPwd }
}

export function useApiForm() {
  const [glmKey, setGlmKey] = useState("")
  const [embKey, setEmbKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://open.bigmodel.cn/api/paas/v4")
  return { glmKey, setGlmKey, embKey, setEmbKey, baseUrl, setBaseUrl }
}

export function useRagConfig() {
  const [chunkSize, setChunkSize] = useState(500)
  const [overlap, setOverlap] = useState(50)
  const [topK, setTopK] = useState(5)
  const [temperature, setTemperature] = useState(0.3)
  return { chunkSize, setChunkSize, overlap, setOverlap, topK, setTopK, temperature, setTemperature }
}

export function useDangerZone() {
  const [confirm, setConfirm] = useState("")
  return { confirm, setConfirm }
}
