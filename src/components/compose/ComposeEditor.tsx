import { ComposeToolbar } from './ComposeToolbar'
import { ComposePreview } from './ComposePreview'
import { ComposeTimeline } from './ComposeTimeline'
import { ComposeInspector } from './ComposeInspector'
import { ComposeExportDrawer } from './ComposeExportDrawer'
import { ComposeClipContextMenu } from './ComposeClipContextMenu'
import { useComposeEditor } from '../../hooks/useComposeEditor'

interface Props {
  nodeId: string
  /** 工作台内嵌：占满父容器，不再使用画布底部 75% 浮层 */
  embedded?: boolean
}

export function ComposeEditor({ nodeId, embedded = false }: Props) {
  const editor = useComposeEditor(nodeId)

  if (!editor.composeNode) return null

  const useFullHeight = embedded || editor.focusMode

  return (
    <div
      ref={editor.containerRef}
      className={
        embedded
          ? 'relative flex flex-col h-full w-full min-h-0 bg-bg-primary'
          : `absolute left-0 right-0 z-50 flex flex-col bg-bg-primary border-t border-border shadow-[0_-12px_40px_rgba(0,0,0,0.45)] ${
              useFullHeight ? 'top-0 bottom-0' : 'bottom-0'
            }`
      }
      style={embedded || useFullHeight ? undefined : { height: '75%' }}
      tabIndex={-1}
    >
      <ComposeToolbar
        clips={editor.clips}
        isComposing={editor.isComposing}
        composeProgress={editor.composeProgress}
        focusMode={useFullHeight}
        embedded={embedded}
        onExport={() => void editor.handleExport()}
        onCancelCompose={editor.isComposing ? editor.handleCancelCompose : undefined}
        onImportSubtitle={() => void editor.handleImportSrt()}
        onToggleSettings={() => editor.setSettingsOpen((o) => !o)}
        onToggleFocus={() => editor.setFocusMode(!editor.focusMode)}
        onClose={editor.closeEditor}
        subtitleCount={editor.subtitleCues.length}
      />

      <ComposeExportDrawer
        open={editor.settingsOpen}
        reencode={editor.reencode}
        burnSubtitles={editor.burnSubtitles}
        hasSubtitles={editor.subtitleCues.length > 0}
        onReencodeChange={editor.setReencode}
        onBurnChange={(v) => {
          editor.setBurnSubtitles(v)
          editor.updateNodeData(nodeId, { burnSubtitles: v })
        }}
        onClose={() => editor.setSettingsOpen(false)}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <ComposePreview
            clips={editor.previewClips}
            timelineClipCount={editor.activeClipCount}
            playheadTime={editor.playheadTime}
            totalDuration={editor.totalDuration}
            subtitleCues={editor.subtitleCues}
            isPlaying={editor.isPlaying}
            previewHeight={editor.previewHeight}
            onPreviewHeightChange={(h) => {
              editor.setPreviewHeight(h)
              editor.persistLayout({ previewHeight: h })
            }}
            onTogglePlay={editor.toggle}
            onSeek={(t) => {
              editor.pause()
              editor.seek(t)
            }}
          />

          <ComposeTimeline
            clips={editor.clips}
            clipPaths={editor.clipPaths}
            subtitleCues={editor.subtitleCues}
            playheadTime={editor.playheadTime}
            totalDuration={editor.totalDuration}
            pixelsPerSecond={editor.pixelsPerSecond}
            hasAudio={!!editor.composeNode.data.audioAssetPath}
            selectedClipId={editor.selectedClipId}
            onClipsChange={editor.updateClips}
            onSelectClip={(id) => {
              editor.setSelectedClipId(id)
              editor.setAudioSelected(false)
              editor.setInspectorOpen(!!id)
              if (id) {
                const clip = editor.clips.find((c) => c.id === id)
                if (clip?.startTime != null) editor.setPlayheadTime(clip.startTime)
              }
            }}
            onSelectAudio={() => {
              editor.setAudioSelected(true)
              editor.setSelectedClipId(null)
              editor.setInspectorOpen(true)
            }}
            onPlayheadChange={(t) => {
              editor.pause()
              editor.seek(t)
            }}
            onClipContextMenu={editor.handleClipContextMenu}
            onPixelsPerSecondChange={(pps) => {
              editor.setPixelsPerSecond(pps)
              editor.persistLayout({ pixelsPerSecond: pps })
            }}
          />
        </div>

        {editor.showInspector && (
          <ComposeInspector
            clip={editor.selectedClip}
            audioSelected={editor.audioSelected}
            audioVolume={editor.audioVolume}
            audioFadeIn={editor.audioFadeIn}
            audioFadeOut={editor.audioFadeOut}
            onClipUpdate={(clipId, patch) => {
              editor.updateClips(
                editor.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
              )
            }}
            onAudioVolumeChange={(v) => editor.updateNodeData(nodeId, { audioVolume: v })}
            onAudioFadeInChange={(v) => editor.updateNodeData(nodeId, { audioFadeIn: v })}
            onAudioFadeOutChange={(v) => editor.updateNodeData(nodeId, { audioFadeOut: v })}
            onOpenSourceNode={editor.handleOpenSourceNode}
            onClose={() => {
              editor.setInspectorOpen(false)
              editor.setAudioSelected(false)
              editor.setSelectedClipId(null)
            }}
          />
        )}
      </div>

      {editor.contextMenu && (
        <ComposeClipContextMenu
          x={editor.contextMenu.x}
          y={editor.contextMenu.y}
          clipId={editor.contextMenu.clipId}
          isExcluded={!!editor.clips.find((c) => c.id === editor.contextMenu!.clipId)?.excluded}
          onInclude={() => editor.includeClip(editor.contextMenu!.clipId)}
          onExclude={() => editor.excludeClip(editor.contextMenu!.clipId)}
          onDisconnect={() => editor.disconnectClip(editor.contextMenu!.clipId)}
        />
      )}
    </div>
  )
}
