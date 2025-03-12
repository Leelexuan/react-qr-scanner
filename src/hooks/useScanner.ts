import { useRef, useCallback, useEffect, RefObject } from 'react';
import { type DetectedBarcode, type BarcodeFormat, BarcodeDetector } from 'barcode-detector';
import { IUseScannerState } from '../types';
import { process, mergeDictionaries } from '../utilities/opencvUtils';


interface IUseScannerProps {
    videoElementRef: RefObject<HTMLVideoElement>;
    onScan: (result: DetectedBarcode[]) => void;
    onFound: (result: DetectedBarcode[]) => void;
    formats?: BarcodeFormat[];
    audio?: boolean;
    allowMultiple?: boolean;
    retryDelay?: number;
    scanDelay?: number;
}


export default function useScanner(props: IUseScannerProps) {
    const { videoElementRef, onScan, onFound, retryDelay = props.retryDelay ?? 500, scanDelay = props.scanDelay ?? 0, formats = [], allowMultiple = false } = props;

    const barcodeDetectorRef = useRef(new BarcodeDetector({ formats }));
    const animationFrameIdRef = useRef<number | null>(null);

    useEffect(() => {
        barcodeDetectorRef.current = new BarcodeDetector({ formats });
    }, [formats]);


    const processFrame = useCallback(
        (state: IUseScannerState) => async (timeNow: number) => {
            if (videoElementRef.current !== null && videoElementRef.current.readyState > 1) {
                const { lastScan, contentBefore, lastScanHadContent } = state;

                if (timeNow - lastScan < retryDelay) {
                    animationFrameIdRef.current = window.requestAnimationFrame(processFrame(state));
                } else {
                    
                    const video = videoElementRef.current;
                    //cv starts
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) return;

                    
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                    const barcodeDetector = barcodeDetectorRef.current;

                    const detectedBarcodes = await process(imageData, barcodeDetector);
                    
                    const oldDetectedCodes = await barcodeDetector.detect(videoElementRef.current);

                    const detectedCodes = mergeDictionaries(oldDetectedCodes, detectedBarcodes);

                    console.log("detectedCodesReal ", oldDetectedCodes);
                    console.log("newDetectedCodes ", detectedCodes);

                    const anyNewCodesDetected = detectedCodes.some((code: DetectedBarcode) => {
                        return !contentBefore.includes(code.rawValue);
                    });

                    const currentScanHasContent = detectedCodes.length > 0;

                    let lastOnScan = state.lastOnScan;

                    const scanDelayPassed = timeNow - lastOnScan >= scanDelay;

                    if (anyNewCodesDetected || (allowMultiple && currentScanHasContent && scanDelayPassed)) {

                        lastOnScan = timeNow;

                        onScan(detectedCodes);
                    }

                    if (currentScanHasContent) {
                        onFound(detectedCodes);
                    }

                    if (!currentScanHasContent && lastScanHadContent) {
                        onFound(detectedCodes);
                    }

                    const newState = {
                        lastScan: timeNow,
                        lastOnScan: lastOnScan,
                        lastScanHadContent: currentScanHasContent,
                        contentBefore: anyNewCodesDetected ? detectedCodes.map((code: DetectedBarcode) => code.rawValue) : contentBefore
                    };

                    animationFrameIdRef.current = window.requestAnimationFrame(processFrame(newState));
                }
            }
        },
        [videoElementRef.current, onScan, onFound, retryDelay]
    );

    const startScanning = useCallback(() => {
        const current = performance.now();

        const initialState = {
            lastScan: current,
            lastOnScan: current,
            contentBefore: [],
            lastScanHadContent: false
        };

        animationFrameIdRef.current = window.requestAnimationFrame(processFrame(initialState));
    }, [processFrame]);

    const stopScanning = useCallback(() => {
        if (animationFrameIdRef.current !== null) {
            window.cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
    }, []);

    return {
        startScanning,
        stopScanning
    };
}
