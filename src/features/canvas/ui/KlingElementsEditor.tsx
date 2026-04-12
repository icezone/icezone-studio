import { memo, useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UiButton, UiModal } from '@/components/ui';

interface KlingElement {
  name: string;
  description?: string;
  element_input_urls: string[];
}

interface IncomingImageItem {
  imageUrl: string;
  displayUrl: string;
  label: string;
}

interface KlingElementsEditorProps {
  elements: KlingElement[];
  incomingImages: IncomingImageItem[];
  onChange: (elements: KlingElement[]) => void;
}

export const KlingElementsEditor = memo(({ elements, incomingImages, onChange }: KlingElementsEditorProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElements, setEditingElements] = useState<KlingElement[]>([]);

  const handleOpenModal = () => {
    setEditingElements(JSON.parse(JSON.stringify(elements)));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    onChange(editingElements);
    setIsModalOpen(false);
  };

  const handleAddElement = () => {
    setEditingElements([
      ...editingElements,
      {
        name: '',
        description: '',
        element_input_urls: [],
      },
    ]);
  };

  const handleRemoveElement = (index: number) => {
    setEditingElements(editingElements.filter((_, i) => i !== index));
  };

  const handleUpdateElement = (index: number, field: keyof KlingElement, value: string) => {
    const updated = [...editingElements];
    if (field === 'element_input_urls') {
      return;
    }
    updated[index] = { ...updated[index], [field]: value };
    setEditingElements(updated);
  };

  const handleToggleImage = (elementIndex: number, imageUrl: string) => {
    const updated = [...editingElements];
    const urls = updated[elementIndex].element_input_urls;
    const urlIndex = urls.indexOf(imageUrl);

    if (urlIndex >= 0) {
      // Remove image
      updated[elementIndex].element_input_urls = urls.filter((_, i) => i !== urlIndex);
    } else {
      // Add image (check max limit)
      if (urls.length < 50) {
        updated[elementIndex].element_input_urls = [...urls, imageUrl];
      }
    }

    setEditingElements(updated);
  };

  const isImageSelected = (elementIndex: number, imageUrl: string): boolean => {
    return editingElements[elementIndex]?.element_input_urls.includes(imageUrl) ?? false;
  };

  return (
    <>
      <UiButton
        onClick={(e) => {
          e.stopPropagation();
          handleOpenModal();
        }}
        variant={elements.length > 0 ? "muted" : "primary"}
        size="sm"
        className="w-full text-xs"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {elements.length > 0
          ? `${elements.length} Element${elements.length > 1 ? 's' : ''} Selected`
          : 'Add Elements'}
      </UiButton>

      {typeof document !== 'undefined' && (
        <UiModal
          isOpen={isModalOpen}
          title={t('node.videoGen.klingElements')}
          onClose={() => setIsModalOpen(false)}
          widthClassName="w-[600px]"
          containerClassName="z-[120]"
          footer={(
            <>
              <UiButton variant="muted" size="sm" onClick={() => setIsModalOpen(false)}>
                {t('common.cancel')}
              </UiButton>
              <UiButton variant="primary" size="sm" onClick={handleSave}>
                {t('common.save')}
              </UiButton>
            </>
          )}
        >
          <div className="ui-scrollbar max-h-[500px] overflow-y-auto space-y-4">
            {incomingImages.length === 0 ? (
              <div className="text-center py-8 text-[var(--canvas-node-fg-muted)]">
                <p className="text-sm">No images available</p>
                <p className="text-xs mt-1">Connect image nodes to this video node to select images</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[var(--canvas-node-fg-muted)] mb-3">
                  Define elements that can be referenced in prompts using @element_name. Select 2-50
                  images from connected nodes for each element.
                </p>

                {editingElements.map((element, elementIndex) => (
                  <div
                    key={elementIndex}
                    className="p-3 rounded-lg border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="block text-xs text-[var(--canvas-node-fg-muted)] mb-1">
                            Element Name *
                          </label>
                          <input
                            type="text"
                            value={element.name}
                            onChange={(e) =>
                              handleUpdateElement(elementIndex, 'name', e.target.value)
                            }
                            placeholder="element_dog"
                            className="w-full rounded border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] px-2 py-1.5 text-xs text-[var(--canvas-node-fg)] placeholder:text-[var(--canvas-node-fg-muted)] focus:border-accent focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-[var(--canvas-node-fg-muted)] mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={element.description || ''}
                            onChange={(e) =>
                              handleUpdateElement(elementIndex, 'description', e.target.value)
                            }
                            placeholder="A cute dog"
                            className="w-full rounded border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] px-2 py-1.5 text-xs text-[var(--canvas-node-fg)] placeholder:text-[var(--canvas-node-fg-muted)] focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveElement(elementIndex)}
                        className="p-1.5 text-[var(--canvas-node-fg-muted)] hover:text-red-400 transition-colors"
                        title="Remove element"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-[var(--canvas-node-fg-muted)]">
                          Select Images ({element.element_input_urls.length} / 2-50 required)
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {incomingImages.map((item, imageIndex) => {
                          const selected = isImageSelected(elementIndex, item.imageUrl);
                          return (
                            <button
                              key={imageIndex}
                              onClick={() => handleToggleImage(elementIndex, item.imageUrl)}
                              className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                                selected
                                  ? 'border-accent ring-2 ring-accent/30'
                                  : 'border-[var(--canvas-node-border)] hover:border-[var(--canvas-node-hover-border)]'
                              }`}
                            >
                              <img
                                src={item.displayUrl}
                                alt={item.label}
                                className="h-full w-full object-cover"
                              />
                              {selected && (
                                <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">✓</span>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {incomingImages.length > 0 && (
                  <button
                    onClick={handleAddElement}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-[var(--canvas-drop-zone-border)] text-[var(--canvas-node-fg-muted)] hover:border-accent hover:text-[var(--canvas-node-fg)] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Element
                  </button>
                )}
              </>
            )}
          </div>
        </UiModal>
      )}
    </>
  );
});

KlingElementsEditor.displayName = 'KlingElementsEditor';
