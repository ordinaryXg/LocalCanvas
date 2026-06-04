import { readConfig, writeConfig } from './config'
import { getUtilityClient } from './utility-client'

/** 将 FFmpeg 路径写入 config.yaml 并通知 Utility Process 重载 */
export async function persistFfmpegPath(ffmpegPath: string): Promise<void> {
  const config = await readConfig()
  config.settings.ffmpeg_path = ffmpegPath
  await writeConfig(config)
  await getUtilityClient().reloadConfig()
}
