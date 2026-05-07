import KbLayoutClient from "./layout-client"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function KbDetailLayout({ children, params }: Props) {
  const { id } = await params

  return <KbLayoutClient kbId={id}>{children}</KbLayoutClient>
}
