import { useMemo } from "react";
import { calculatePlotPrice } from "../utils/plotPrice";

export function usePriceCalculator(params) {
  const {
    width,
    height,
    unit = "cm",
    substrate = "Bond",
    mode = "color",
    saturation = "0-10",
    quantity = 1,
    coveragePct = null,
  } = params || {};

  return useMemo(
    () =>
      calculatePlotPrice({
        width,
        height,
        unit,
        substrate,
        mode,
        saturation,
        quantity,
        coveragePct,
      }),
    [width, height, unit, substrate, mode, saturation, quantity, coveragePct]
  );
}

export { calculatePlotPrice };
