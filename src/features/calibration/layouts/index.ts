import { layoutTemplateSchema } from "../domain/calibration-layout";
import referenceLayout from "./reference-v1.json";

export const bundledLayout = layoutTemplateSchema.parse(referenceLayout);
