import { useCallback, useEffect, useRef, useState } from 'react'
import { assetPathToBlobUrl } from '../utils/assetStorage'

function isInlineMediaSrc(src: string | undefined): src is string {
  return !!src && (src.startsWith('blob:') || src.startsWith('data:'))
}

/**
 * 按需加载项目资产为 Blob URL，避免打开项目时一次性解码全部视频。
 */
export function useLazyAssetBlob(
  projectId: string | null,
  relativePath: string | undefined,
  existingSrc?: string,
): {
  src: string | null
  loading: boolean
  error: boolean
  load: () => Promise<string | null>
  revoke: () => void
} {
  const ownedUrlRef = useRef<string | null>(null)
  const [src, setSrc] = useState<string | null>(() =>
    isInlineMediaSrc(existingSrc) ? existingSrc : null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const revoke = useCallback(() => {
    if (ownedUrlRef.current) {
      URL.revokeObjectURL(ownedUrlRef.current)
      ownedUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    revoke()
    if (isInlineMediaSrc(existingSrc)) {
      setSrc(existingSrc)
      setError(false)
      return
    }
    setSrc(null)
    setError(false)
  }, [existingSrc, relativePath, projectId, revoke])

  useEffect(() => () => revoke(), [revoke])

  const load = useCallback(async (): Promise<string | null> => {
    if (src) return src
    if (isInlineMediaSrc(existingSrc)) {
      setSrc(existingSrc)
      return existingSrc
    }
    if (!projectId || !relativePath) return null

    setLoading(true)
    setError(false)
    try {
      const url = await assetPathToBlobUrl(projectId, relativePath)
      ownedUrlRef.current = url
      setSrc(url)
      return url
    } catch {
      setError(true)
      return null
    } finally {
      setLoading(false)
    }
  }, [src, existingSrc, projectId, relativePath])

  return { src, loading, error, load, revoke }
}
