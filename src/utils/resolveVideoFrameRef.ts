import { resolveImageRefForApi } from '../utils/resolveImageRefForApi'

export async function resolveVideoFrameRefForApi(
  data: Record<string, unknown>,
  kind: 'first' | 'last',
  projectId: string | null | undefined,
): Promise<string | undefined> {
  const prefix = kind === 'first' ? 'firstFrame' : 'lastFrame'
  const src = data[`${prefix}Src`] as string | undefined
  const assetPath = data[`${prefix}AssetPath`] as string | undefined
  if (!src && !assetPath) return undefined
  return resolveImageRefForApi({ imageSrc: src, imageAssetPath: assetPath }, projectId)
}
