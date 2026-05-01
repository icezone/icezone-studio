import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.hoisted 确保 mock 变量在 vi.mock 工厂函数执行前就已初始化
const {
  mockSelect, mockEq, mockGte, mockOrder, mockLimit, mockRange,
  mockFrom, mockSupabase,
} = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockGte = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()
  const mockRange = vi.fn()

  const chainMock = {
    select: mockSelect,
    eq: mockEq,
    gte: mockGte,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
  }

  mockSelect.mockReturnValue(chainMock)
  mockEq.mockReturnValue(chainMock)
  mockGte.mockReturnValue(chainMock)
  mockOrder.mockReturnValue(chainMock)
  mockLimit.mockReturnValue(chainMock)
  mockRange.mockReturnValue(chainMock)

  const mockFrom = vi.fn(() => chainMock)
  const mockSupabase = { from: mockFrom }

  return { mockSelect, mockEq, mockGte, mockOrder, mockLimit, mockRange, mockFrom, mockSupabase }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
  getAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

import { GET } from './route'

function makeRequest(search = '') {
  return new NextRequest(`http://localhost/api/settings/call-history${search}`)
}

const sampleRows = [
  { logical_model_id: 'nano-banana-2', status: 'success', latency_ms: 300, cost_estimate_cents: 2 },
  { logical_model_id: 'nano-banana-2', status: 'failed',  latency_ms: 100, cost_estimate_cents: 0 },
  { logical_model_id: 'grok-image',    status: 'success', latency_ms: 500, cost_estimate_cents: 5 },
]

// 每个测试前重置链式返回值
beforeEach(() => {
  vi.clearAllMocks()
  const chainMock = {
    select: mockSelect,
    eq: mockEq,
    gte: mockGte,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
  }
  mockFrom.mockReturnValue(chainMock)
  mockSelect.mockReturnValue(chainMock)
  mockEq.mockReturnValue(chainMock)
  mockGte.mockReturnValue(chainMock)
  mockOrder.mockReturnValue(chainMock)
  mockLimit.mockReturnValue(chainMock)
  mockRange.mockReturnValue(chainMock)
})

describe('GET /api/settings/call-history', () => {
  describe('聚合模式（无 page 参数）', () => {
    it('返回正确的汇总统计', async () => {
      mockLimit.mockResolvedValueOnce({ data: sampleRows, error: null })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.total).toBe(3)
      expect(body.successCount).toBe(2)
      // avgLatencyMs = round((300+100+500)/3) = 300
      expect(body.avgLatencyMs).toBe(300)
      // totalCostCents = 2+0+5 = 7
      expect(body.totalCostCents).toBe(7)
    })

    it('byModel 按模型正确分组', async () => {
      mockLimit.mockResolvedValueOnce({ data: sampleRows, error: null })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.byModel['nano-banana-2'].total).toBe(2)
      expect(body.byModel['nano-banana-2'].success).toBe(1)
      expect(body.byModel['grok-image'].total).toBe(1)
    })

    it('空数据时返回零值', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.total).toBe(0)
      expect(body.avgLatencyMs).toBe(0)
      expect(body.byModel).toEqual({})
    })
  })

  describe('分页模式（有 page 参数）', () => {
    const pagedRows = [
      { id: '1', logical_model_id: 'nano-banana-2', status: 'success', latency_ms: 300, cost_estimate_cents: 2, created_at: '2026-04-01T00:00:00Z' },
    ]

    it('返回 records + 分页元数据', async () => {
      mockRange.mockResolvedValueOnce({ data: pagedRows, error: null, count: 42 })

      const res = await GET(makeRequest('?page=1&pageSize=20'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.records).toHaveLength(1)
      expect(body.page).toBe(1)
      expect(body.pageSize).toBe(20)
      expect(body.total).toBe(42)
    })

    it('page=2 时 range 从第 pageSize 行开始', async () => {
      mockRange.mockResolvedValueOnce({ data: [], error: null, count: 100 })

      await GET(makeRequest('?page=2&pageSize=20'))

      // range(20, 39)
      expect(mockRange).toHaveBeenCalledWith(20, 39)
    })

    it('pageSize 不超过 100', async () => {
      mockRange.mockResolvedValueOnce({ data: [], error: null, count: 0 })

      await GET(makeRequest('?page=1&pageSize=999'))

      expect(mockRange).toHaveBeenCalledWith(0, 99)
    })
  })

  it('未认证时返回 401', async () => {
    const { getAuthUser } = await import('@/lib/supabase/server')
    vi.mocked(getAuthUser).mockResolvedValueOnce(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })
})
