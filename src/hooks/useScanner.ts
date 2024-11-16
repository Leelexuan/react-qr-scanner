import { useRef, useCallback, useEffect, RefObject } from 'react';

import { type DetectedBarcode, type BarcodeFormat, BarcodeDetector } from 'barcode-detector';

import { IUseScannerState } from '../types';

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
    const { videoElementRef, onScan, onFound, retryDelay = 100, scanDelay = 0, formats = [], allowMultiple = false } = props;

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
                    const detectedCodes = await barcodeDetectorRef.current.detect(videoElementRef.current);

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
