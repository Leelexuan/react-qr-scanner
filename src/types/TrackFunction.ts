import { IBoundingBox, IAdjustedBarcode } from './index';

export type TrackFunction = (detectedCodes: IAdjustedBarcode[], ctx: CanvasRenderingContext2D) => IBoundingBox[];
