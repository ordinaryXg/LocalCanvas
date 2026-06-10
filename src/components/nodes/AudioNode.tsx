import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useOpenGeneratorDrawer } from '../inspector/useOpenGeneratorDrawer'
import { useNodeMediaUpload } from '../../hooks/useNodeMedia'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import {
  AUDIO_CHIP_EMPTY_WIDTH,
  AUDIO_CHIP_HEIGHT,
  AUDIO_CHIP_MIN_WIDTH,
  computeAudioChipWidth,
  formatAudioDuration,
  getAudioWaveformBars,
} from '../../utils/audioNodeDisplay'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'

function AudioNodeComponent({ id, data, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const uploadMedia = useNodeMediaUpload(id, 'audio')
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { openDrawer } = useOpenGeneratorDrawer(id)
  const variant = useMemo(() => getNodeVisualVariant(id), [id])
  const waveformBars = useMemo(() => getAudioWaveformBars(id), [id])

  const [playing, setPlaying] = useState(false)
  const [durationSec, setDurationSec] = useState<number | null>(
    typeof data.durationSec === 'number' ? data.durationSec : null,
  )

  const audioAssetPath =
    typeof data.audioAssetPath === 'string' ? data.audioAssetPath : undefined
  const inlineAudioSrc = typeof data.audioSrc === 'string' ? data.audioSrc : undefined
  const hasAudio = !!(inlineAudioSrc || audioAssetPath)
  const isGenerating = data.isGenerating === true
  const errorMessage = typeof data.error === 'string' ? data.error : undefined

  const { src: mediaSrc, loading: mediaLoading } = useLazyAssetBlob(
    projectId,
    audioAssetPath,
    inlineAudioSrc,
  )

  const audioSrc = mediaSrc ?? inlineAudioSrc
  const chipWidth = computeAudioChipWidth(durationSec, hasAudio && !!audioSrc)

  const loadFile = useCallback(
    (file: File) => {
      void uploadMedia(file)
    },
    [uploadMedia],
  )

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files[0]
      if (file?.type.startsWith('audio/')) loadFile(file)
    },
    [loadFile],
  )

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!selected || !audioRef.current || !audioSrc) return
      if (playing) {
        audioRef.current.pause()
        setPlaying(false)
        return
      }
      void audioRef.current.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
    },
    [audioSrc, playing, selected],
  )

  useEffect(() => {
    if (!selected && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [playing, selected])

  useEffect(() => {
    setPlaying(false)
    if (!audioSrc) {
      setDurationSec(null)
    }
  }, [audioSrc])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.max(AUDIO_CHIP_MIN_WIDTH, Math.ceil(shell.offsetWidth))
        const measuredHeight = Math.max(AUDIO_CHIP_HEIGHT, Math.ceil(shell.offsetHeight))
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredWidth - lastW) < 2 && Math.abs(measuredHeight - lastH) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(id, measuredWidth, measuredHeight)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [audioSrc, chipWidth, hasAudio, id, updateNodeSize])

  const handleMetadata = useCallback(() => {
    const el = audioRef.current
    if (!el || !Number.isFinite(el.duration)) return
    const sec = el.duration
    setDurationSec(sec)
    if (typeof data.durationSec !== 'number' || Math.abs(data.durationSec - sec) > 0.5) {
      useCanvasStore.getState().updateNodeData(id, { durationSec: sec })
    }
  }, [data.durationSec, id])

  const openEditor = () => {
    openDrawer()
  }

  return (
    <>
      <div ref={shellRef} className="audio-node-shell">
        <div
          className={`audio-node-chip ${selected ? 'audio-node-chip--selected' : ''} ${
            !hasAudio || !audioSrc ? 'audio-node-chip--empty' : ''
          } ${errorMessage ? 'audio-node-chip--error' : ''} ${
            isGenerating || mediaLoading ? 'audio-node-chip--busy' : ''
          }`}
          style={{
            borderRadius: variant.borderRadius,
            width: hasAudio && audioSrc ? chipWidth : AUDIO_CHIP_EMPTY_WIDTH,
            height: AUDIO_CHIP_HEIGHT,
          }}
          onDoubleClick={openEditor}
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            if (hasAudio && audioSrc) return
            if (!selected) return
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          title={
            errorMessage ??
            (hasAudio
              ? selected
                ? '点击 ▶ 播放，双击在编辑台编辑'
                : '选中后可播放，双击在编辑台编辑'
              : selected
                ? '点击上传本地音频，或拖入音频'
                : '选中后点击上传，或拖入音频')
          }
        >
          {(!hasAudio || !audioSrc) && (
            <span className="media-node__empty-icon" aria-hidden>
              🎵
            </span>
          )}

          {hasAudio && audioSrc && (
            <>
              <button
                type="button"
                className="audio-node-chip__play nodrag"
                onClick={togglePlay}
                disabled={!selected || mediaLoading}
                aria-label={playing ? '暂停' : '播放'}
              >
                {playing ? '⏸' : '▶'}
              </button>
              <div className="audio-node-chip__wave" aria-hidden>
                {waveformBars.map((h, i) => (
                  <span
                    key={i}
                    className="audio-node-chip__bar"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <span className="audio-node-chip__duration">
                {formatAudioDuration(durationSec)}
              </span>
            </>
          )}

          {hasAudio && audioSrc && (
            <audio
              ref={audioRef}
              src={audioSrc}
              preload="metadata"
              className="audio-node-chip__audio"
              onLoadedMetadata={handleMetadata}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
            />
          )}

          <Handle
            type="source"
            position={Position.Right}
            id="audio"
            className="audio-node-chip__handle"
            style={{ top: '50%' }}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}

export const AudioNode = memo(AudioNodeComponent)
