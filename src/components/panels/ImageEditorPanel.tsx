import { useImageEditorPanel } from '../../hooks/useImageEditorPanel'
import { CurrentImagePreview } from './CurrentImagePreview'
import { ResizablePreviewPane, PreviewWidthSplitter } from './ResizablePreviewPane'
import {
  PREVIEW_HEIGHT_MIN,
  PREVIEW_HEIGHT_MAX,
  PREVIEW_WIDTH_MIN,
} from '../../utils/imageEditorLayout'
import { ImageEditorFormControls } from './ImageEditorFormControls'
import { ImageEditorPromptSection } from './ImageEditorPromptSection'

interface ImageEditorPanelProps {
  nodeId: string
  hidePreview?: boolean
}

export function ImageEditorPanel({ nodeId, hidePreview = false }: ImageEditorPanelProps) {
  const panel = useImageEditorPanel(nodeId)

  return (
    <div className="flex flex-col min-h-0 gap-3">
      <div ref={panel.rowRef} className="flex min-h-0 items-start w-full">
        {!hidePreview && (
          <>
            <ResizablePreviewPane
              height={panel.previewHeight}
              onHeightChange={panel.commitPreviewHeight}
              minHeight={PREVIEW_HEIGHT_MIN}
              maxHeight={PREVIEW_HEIGHT_MAX}
              width={panel.displayPreviewWidth}
              className="min-w-0"
            >
              <CurrentImagePreview
                imageSrc={panel.data.imageSrc as string | undefined}
                imageAssetPath={panel.data.imageAssetPath as string | undefined}
                fileName={panel.displayTitle}
                isGenerating={panel.isGenerating || panel.data.isGenerating === true}
                progress={
                  panel.isGenerating ? panel.progress : (panel.data.progress as number | undefined)
                }
                recentOutputs={panel.recentOutputs}
                onSelectRecent={panel.handleSelectRecent}
                height={panel.previewHeight - 12}
              />
            </ResizablePreviewPane>

            <PreviewWidthSplitter
              currentWidth={panel.displayPreviewWidth}
              minWidth={PREVIEW_WIDTH_MIN}
              maxWidth={panel.containerMaxWidth}
              height={panel.previewHeight}
              onWidthPreview={panel.setLivePreviewWidth}
              onWidthChange={(w) => {
                panel.setLivePreviewWidth(null)
                panel.commitPreviewWidth(w)
              }}
            />
          </>
        )}

        <ImageEditorFormControls
          nodeId={panel.nodeId}
          previewHeight={panel.previewHeight}
          hidePreview={hidePreview}
          warningsRef={panel.warningsRef}
          styleChipsRef={panel.styleChipsRef}
          modelId={panel.modelId}
          setModelId={panel.setModelId}
          imageModels={panel.imageModels}
          ui={panel.ui}
          ratio={panel.ratio}
          setRatio={panel.setRatio}
          batchSize={panel.batchSize}
          setBatchSize={panel.setBatchSize}
          styleId={panel.styleId}
          prompt={panel.prompt}
          negativePrompt={panel.negativePrompt}
          onStyleChange={panel.handleStyleChange}
          recommendedModelId={panel.recommendedModelId}
          onApplyRecommendedModel={(id) => {
            panel.setModelId(id)
            panel.updateNodeData(panel.nodeId, { modelId: id })
          }}
          referenceEdges={panel.referenceEdges}
          currentProjectId={panel.currentProjectId}
          warnings={panel.warnings}
          updateNodeData={panel.updateNodeData}
        />
      </div>

      <ImageEditorPromptSection
        prompt={panel.prompt}
        setPrompt={panel.commitPrompt}
        negativePrompt={panel.negativePrompt}
        setNegativePrompt={panel.commitNegativePrompt}
        negativeOpen={panel.negativeOpen}
        onNegativeToggle={panel.handleNegativeToggle}
        isPromptSynced={panel.isPromptSynced}
        promptSourceNode={panel.promptSourceNode}
        promptEdge={panel.promptEdge}
        onUnlinkPrompt={() => panel.promptEdge && panel.removeEdge(panel.promptEdge.id)}
        isGenerating={panel.isGenerating}
        progress={panel.progress}
        generateDisabled={panel.generateDisabled}
        onGenerate={() => void panel.handleGenerate()}
        onCancel={() => void panel.cancel()}
      />
    </div>
  )
}
