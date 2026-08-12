import type Konva from "konva";
import { EDITOR_COLORS } from "./editor-theme";

/** Figma-style selection chrome: blue border + white square anchors. */
export function applyEditorTransformerStyle(tr: Konva.Transformer) {
  tr.anchorFill(EDITOR_COLORS.white);
  tr.anchorStroke(EDITOR_COLORS.selectionBlue);
  tr.anchorStrokeWidth(1.5);
  tr.anchorSize(10);
  tr.anchorCornerRadius(1);
  tr.borderStroke(EDITOR_COLORS.selectionBlue);
  tr.borderStrokeWidth(1);
  tr.borderDash([]);
  tr.rotateAnchorOffset(28);
  tr.padding(4);
  tr.keepRatio(false);
  tr.rotateEnabled(true);
  tr.borderEnabled(true);
  tr.anchorDragBoundFunc((_oldPos, newPos) => newPos);
  tr.enabledAnchors([
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]);
}
