import { TrackFunction } from './index';

export interface IScannerComponents {
    tracker?: TrackFunction;
    onOff?: boolean;
    finder?: boolean;
    torch?: boolean;
    zoom?: boolean;
}
