import type { Map as MapboxMap } from "mapbox-gl";

/** BCP-47-Sprachcode für Kartenbeschriftungen (Städte, Straßen, POIs). */
export const MAP_LABEL_LANGUAGE = "de";

export function applyMapLabelLanguage(map: MapboxMap | null | undefined): void {
  map?.setLanguage(MAP_LABEL_LANGUAGE);
}
