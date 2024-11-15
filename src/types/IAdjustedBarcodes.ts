import { IBoundingBox, IPoint } from './index';

export interface IAdjustedBarcode {
    boundingBox: IBoundingBox;
    cornerPoints: IPoint[];
    format: string;
    rawValue: string;
    colour: string;
}
