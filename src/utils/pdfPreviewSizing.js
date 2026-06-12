export function getPdfFitScale({
  pageWidth,
  pageHeight,
  containerWidth,
  containerHeight,
  insetX = 0,
  insetY = 0,
  maxScale = 4,
}) {
  const width = Number(pageWidth);
  const height = Number(pageHeight);
  const rawContainerWidth = Number(containerWidth);
  const rawContainerHeight = Number(containerHeight);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(rawContainerWidth) ||
    !Number.isFinite(rawContainerHeight) ||
    width <= 0 ||
    height <= 0 ||
    rawContainerWidth <= 0 ||
    rawContainerHeight <= 0
  ) {
    return 1;
  }

  const availableWidth = Math.max(1, rawContainerWidth - insetX);
  const availableHeight = Math.max(1, rawContainerHeight - insetY);
  const fitted = Math.min(availableWidth / width, availableHeight / height);
  return Math.min(maxScale, fitted);
}
