'use client'

// KeyManager 容器：组合 AddKeyForm + KeyRow 列表 + useKeyManager hook
import { AddKeyForm } from './AddKeyForm'
import { KeyRow } from './KeyRow'
import { useKeyManager } from './useKeyManager'

export function KeyManager() {
  const { keys, loading, error, addKey, deleteKey, probe } = useKeyManager()

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-gray-500">
          添加内置 provider key 或自定义 OpenAI-compat 端点。保存后点&ldquo;重新探测&rdquo;发现可用模型。
        </p>
      </div>

      {/* 添加 key 表单 */}
      <AddKeyForm onSubmit={addKey} />

      {/* 错误提示 */}
      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">加载失败:{error}</div>}

      {/* key 列表 */}
      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-gray-500">还没有 key，先添加一个。</div>
      ) : (
        <div className="flex flex-col gap-2">
          {keys.map((k) => (
            <KeyRow key={k.id} row={k} onProbe={probe} onDelete={deleteKey} />
          ))}
        </div>
      )}
    </section>
  )
}
