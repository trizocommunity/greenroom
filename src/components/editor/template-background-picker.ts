export const TEMPLATE_BACKGROUND_ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml";

export interface SelectedBackgroundImage {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  file: File;
}

/** Opens a file picker; calls onSelected with an object URL and natural dimensions for the chosen image. */
export function openTemplateBackgroundPicker(
  onSelected: (info: SelectedBackgroundImage) => void,
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = TEMPLATE_BACKGROUND_ACCEPT;
  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        onSelected({
          url,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          file,
        });
      };
      img.onerror = () => {
        onSelected({
          url,
          naturalWidth: 0,
          naturalHeight: 0,
          file,
        });
      };
      img.src = url;
    },
    { once: true },
  );
  input.click();
}
