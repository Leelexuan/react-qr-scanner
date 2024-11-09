import { IBoundingBox, IDetectedBarcode } from './index';

export type TrackFunction = (detectedCodes: IDetectedBarcode[], ctx: CanvasRenderingContext2D) => IBoundingBox[];
