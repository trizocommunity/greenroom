export const TEMPLATE_BACKGROUND_ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml";

/** Opens a file picker; calls onSelected with an object URL for the chosen image. */
export function openTemplateBackgroundPicker(
  onSelected: (objectUrl: string) => void,
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = TEMPLATE_BACKGROUND_ACCEPT;
  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];
      if (file) onSelected(URL.createObjectURL(file));
    },
    { once: true },
  );
  input.click();
}
