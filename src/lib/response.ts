import { NextResponse } from 'next/server'

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status })
}

export const R = {
  ok:      <T>(data: T, status = 200) => NextResponse.json({ ok: true, data }, { status }),
  created: <T>(data: T)               => NextResponse.json({ ok: true, data }, { status: 201 }),
  noData:  ()                         => NextResponse.json({ ok: true, data: null }),
}

export const Err = {
  unauthorized: ()            => fail('UNAUTHORIZED',   '未登录或登录已过期',   401),
  forbidden:    (msg: string) => fail('FORBIDDEN',      msg,                    403),
  notFound:     (msg: string) => fail('NOT_FOUND',      msg,                    404),
  conflict:     (msg: string) => fail('CONFLICT',       msg,                    409),
  invalid:      (msg: string) => fail('INVALID_INPUT',  msg,                    422),
  tooMany:      (msg: string) => fail('RATE_LIMITED',   msg,                    429),
  internal:     (msg: string) => fail('INTERNAL_ERROR', msg,                    500),
}
