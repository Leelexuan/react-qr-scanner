import React, {useEffect, useRef, useMemo, ReactNode } from 'react';
import useState from 'react-usestateref';

import type { BarcodeFormat } from 'barcode-detector';

import Finder from './Finder';
import useCamera from '../hooks/useCamera';
import useScanner from '../hooks/useScanner';

import deepEqual from '../utilities/deepEqual';
import { defaultComponents, defaultConstraints, defaultStyles } from '../misc';
import { IDetectedBarcode, IPoint, IScannerClassNames, IScannerComponents, IScannerStyles, IBoundingBoxRawValue, TrackFunction } from '../types';


export interface IScannerProps {
    onScan: (detectedCodes: IDetectedBarcode[]) => void;
    onError?: (error: unknown) => void;
    onBoundingBoxClick: (rawValue: string) => void;
    onNewBarcodeDetected: (rawValue: string) => Promise<boolean>;
    constraints?: MediaTrackConstraints;
    formats?: BarcodeFormat[];
    paused?: boolean;
    children?: ReactNode;
    components?: IScannerComponents;
    styles?: IScannerStyles;
    classNames?: IScannerClassNames;
    allowMultiple?: boolean;
    scanDelay?: number;
}



function clearCanvas(canvas: HTMLCanvasElement | null) {
    if (canvas === null) {
        throw new Error('Canvas should always be defined when component is mounted.');
    }

    const ctx = canvas.getContext('2d');

    if (ctx === null) {
        throw new Error('Canvas 2D context should be non-null');
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


export function Scanner(props: IScannerProps) {
    const { onScan, constraints, formats = ['qr_code'], paused = false, components, children, styles, classNames, allowMultiple, scanDelay, onError, onBoundingBoxClick, onNewBarcodeDetected } = props;

    const videoRef = useRef<HTMLVideoElement>(null);
    const pauseFrameRef = useRef<HTMLCanvasElement>(null);
    const trackingLayerRef = useRef<HTMLCanvasElement>(null);

    const mergedConstraints = useMemo(() => ({ ...defaultConstraints, ...constraints }), [constraints]);
    const mergedComponents = useMemo(() => ({ ...defaultComponents, ...components }), [components]);

    const [isMounted, setIsMounted] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(true);

    const [constraintsCached, setConstraintsCached] = useState(mergedConstraints);

    const [boundingBoxes, setBoundingBoxes] = useState<IBoundingBoxRawValue[]>([]);

    const [data, setData, dataRef] = useState<string[]>([]);

    const [loading, setLoading, loadingRef] = useState<string[]>([]);

    const [errorCodes, setErrorCodes, errorCodesRef] = useState<string[]>([]);

    const camera = useCamera();

    //onFound get new detectedCodes 
    //check against list in data
    //if data found, set green 
    //if api call loading, set yellow
    //when api returns, remove from loading
    //if not found, set red
    function retrieveData(detectedCodes: IDetectedBarcode[]) {
        console.log("retrieveData detectedCodes: " + JSON.stringify(detectedCodes));
        console.log("retrieveData dataRef: " + dataRef.current);
        console.log("retrieveData loadingRef: " + loadingRef.current);

        //code can be summarized, for bug tracking purposes now
        detectedCodes.map((detectedCode) => {
            if (dataRef.current.includes(detectedCode.rawValue)){
                console.log("i am in data: " + detectedCode.rawValue);
                return;
            }
            else if (loadingRef.current.includes(detectedCode.rawValue)){
                console.log("i am in loading: " + detectedCode.rawValue);
                return;
            }
            else if (errorCodesRef.current.includes(detectedCode.rawValue)){
                console.log("i am in errorCodes: " + detectedCode.rawValue);
                return;
            };

            //if not in either, put in loading first, then do API call
            setLoading((prevLoading) => [...prevLoading, detectedCode.rawValue]);
            
            //async function for api call
            const fetchCodeData = async (detectedCode: IDetectedBarcode): Promise<any> => {
                    const rawValue = detectedCode.rawValue;
                try{
                    //for duplicate barcodes, if alr in data, skip api call
                    if (dataRef.current.includes(rawValue)){
                        console.log("fetchCodeData: i am in data: " + rawValue);
                        return;
                    };

                    const response = await onNewBarcodeDetected(rawValue);
                    console.log(response);
                    console.log("fetchCodeData detectedCode: " + rawValue);
                    if (response == true){
                     //add into data
                    setData((prevData) => [...prevData, rawValue]);
                    //if in data, remove from loading
                    setLoading((prevLoading) => prevLoading.filter(item => item !== rawValue));
                    }
                    else{
                    //add into error
                    setErrorCodes((prevErrorCodes) => [...prevErrorCodes, rawValue]);
                    //if error, remove from loading
                    setLoading((prevLoading) => prevLoading.filter(item => item !== rawValue));
                    }
                }
                catch (error) {
                    console.log(error);
                    //add into error
                    setErrorCodes((prevErrorCodes) => [...prevErrorCodes, rawValue]);
                    //if error, remove from loading
                    setLoading((prevLoading) => prevLoading.filter(item => item !== rawValue));
                }
            };

            //then call fetchCodeData after setLoading
            fetchCodeData(detectedCode);
        });
    };

    function mouseBoundingBox(boundingBoxes: IBoundingBoxRawValue[], mouseX: number, mouseY: number) {
        console.log("mouseBoundingBox BoundingBoxes:", boundingBoxes)
        for (const box of boundingBoxes) {
            console.log(box)
            const { x, y, width, height } = box;
            // Check if the mouse coordinates are within the bounding box
            if (
                mouseX >= x &&
                mouseX <= x + width &&
                mouseY >= y &&
                mouseY <= y + height
            ) {
                console.log("In bounding box: " + box); 
                onBoundingBoxClick(box.rawValue);
                return;
            }
            else{
                continue
            }
            
        return;
        
    };
}

    //handles drawing of bounding boxes 
    function onFound(detectedCodes: IDetectedBarcode[], videoEl?: HTMLVideoElement | null, trackingEl?:     HTMLCanvasElement | null, tracker?: TrackFunction) {
        const canvas = trackingEl;

        if (canvas === undefined || canvas === null) {
            throw new Error('onFound handler should only be called when component is mounted. Thus tracking canvas is always defined.');
        }

        const video = videoEl;

        if (video === undefined || video === null) {
            throw new Error('onFound handler should only be called when component is mounted. Thus video element is always defined.');
        }

        if (detectedCodes.length === 0 || tracker === undefined) {
            clearCanvas(canvas);

            //no codes found, set bounding boxes to be empty
            setBoundingBoxes([]);
            console.log("no detected codes onFound ", boundingBoxes);

        } else {
            const displayWidth = video.offsetWidth;
            const displayHeight = video.offsetHeight;

            const resolutionWidth = video.videoWidth;
            const resolutionHeight = video.videoHeight;

            const largerRatio = Math.max(displayWidth / resolutionWidth, displayHeight / resolutionHeight);
            const uncutWidth = resolutionWidth * largerRatio;
            const uncutHeight = resolutionHeight * largerRatio;

            const xScalar = uncutWidth / resolutionWidth;
            const yScalar = uncutHeight / resolutionHeight;
            const xOffset = (displayWidth - uncutWidth) / 2;
            const yOffset = (displayHeight - uncutHeight) / 2;

            const scale = ({ x, y }: IPoint) => {
                return {
                    x: Math.floor(x * xScalar),
                    y: Math.floor(y * yScalar)
                };
            };

            const translate = ({ x, y }: IPoint) => {
                return {
                    x: Math.floor(x + xOffset),
                    y: Math.floor(y + yOffset)
                };
            };

            retrieveData(detectedCodes);

            const adjustedCodes = detectedCodes.map((detectedCode) => {
                console.log("adjustedCodes detectedCode: " + JSON.stringify(detectedCode));
                console.log("adjustedCodes dataRef: " + dataRef.current);
                console.log("adjustedCodes loadingRef: " + loadingRef.current);
                console.log("adjustedCodes errorCodesRef: " + errorCodesRef.current);

                let colour: string = 'yellow';
                if (dataRef.current.includes(detectedCode.rawValue)){
                    colour = 'green';
                }
                else if (loadingRef.current.includes(detectedCode.rawValue)){
                    colour = 'yellow';
                }
                else if (errorCodesRef.current.includes(detectedCode.rawValue)){
                    colour = 'red';
                };

                //rest of code same as original
                const { boundingBox, cornerPoints } = detectedCode;

                const { x, y } = translate(
                    scale({
                        x: boundingBox.x,
                        y: boundingBox.y
                    })
                );

                const { x: width, y: height } = scale({
                    x: boundingBox.width,
                    y: boundingBox.height
                });

                return {
                    ...detectedCode,
                    //added colour as output param
                    colour,
                    cornerPoints: cornerPoints.map((point) => translate(scale(point))),
                    boundingBox: DOMRectReadOnly.fromRect({ x, y, width, height })
                };
            });

            canvas.width = video.offsetWidth;
            canvas.height = video.offsetHeight;

            const ctx = canvas.getContext('2d');

            if (ctx === null) {
                throw new Error('onFound handler should only be called when component is mounted. Thus tracking canvas 2D context is always defined.');
            }

            //add boundingboxes to state
            const updatedBoundingBoxes = tracker(adjustedCodes, ctx);
            setBoundingBoxes(updatedBoundingBoxes);
        };
        return;
    };
    

    const { startScanning, stopScanning } = useScanner({
        videoElementRef: videoRef,
        onScan: onScan,
        onFound: (detectedCodes) => onFound(detectedCodes, videoRef.current, trackingLayerRef.current, mergedComponents.tracker),
        formats: formats,
        allowMultiple: allowMultiple,
        retryDelay: mergedComponents.tracker === undefined ? 2000 : 500,
        scanDelay: scanDelay
    });

    useEffect(() => {
        setIsMounted(true);

        return () => {
            setIsMounted(false);
        };
    }, []);
    
    useEffect(() => {
        if (isMounted) {
            stopScanning();
            startScanning();
        }
    }, [components?.tracker]);

    useEffect(() => {
        if (!deepEqual(mergedConstraints, constraintsCached)) {
            const newConstraints = mergedConstraints;

            if (constraints?.deviceId) {
                delete newConstraints.facingMode;
            }

            setConstraintsCached(newConstraints);
        }
    }, [constraints]);

    const cameraSettings = useMemo(() => {
        return {
            constraints: constraintsCached,
            shouldStream: isMounted && !paused
        };
    }, [constraintsCached, isMounted, paused]);

    const onCameraChange = async () => {
        const videoEl = videoRef.current;

        if (videoEl === undefined || videoEl === null) {
            throw new Error('Video should be defined when component is mounted.');
        }

        const canvasEl = pauseFrameRef.current;

        if (canvasEl === undefined || canvasEl === null) {
            throw new Error('Canvas should be defined when component is mounted.');
        }

        const ctx = canvasEl.getContext('2d');

        if (ctx === undefined || ctx === null) {
            throw new Error('Canvas should be defined when component is mounted.');
        }

        if (cameraSettings.shouldStream) {
            await camera.stopCamera();

            setIsCameraActive(false);

            try {
                await camera.startCamera(videoEl, cameraSettings);

                if (videoEl) {
                    setIsCameraActive(true);
                } else {
                    await camera.stopCamera();
                }
            } catch (error) {
                onError?.(error);
                console.error('error', error);
            }
        } else {
            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;

            ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);

            await camera.stopCamera();

            setIsCameraActive(false);
        }
    };

    useEffect(() => {
        (async () => {
            await onCameraChange();
        })();
    }, [cameraSettings]);

    const shouldScan = useMemo(() => {
        return cameraSettings.shouldStream && isCameraActive;
    }, [cameraSettings.shouldStream, isCameraActive]);

    useEffect(() => {
        if (shouldScan) {
            if (pauseFrameRef.current === undefined) {
                throw new Error('shouldScan effect should only be triggered when component is mounted. Thus pause frame canvas is defined');
            }

            clearCanvas(pauseFrameRef.current);

            if (trackingLayerRef.current === undefined) {
                throw new Error('shouldScan effect should only be triggered when component is mounted. Thus tracking canvas is defined');
            }

            clearCanvas(trackingLayerRef.current);

            const videoEl = videoRef.current;

            if (videoEl === undefined || videoEl === null) {
                throw new Error('shouldScan effect should only be triggered when component is mounted. Thus video element is defined');
            }

            startScanning();
        }
    }, [shouldScan]);

    useEffect(() => {
        if (trackingLayerRef.current) {
            const canvas = trackingLayerRef.current;
            // Define the event listener function
            const handleCanvasClick = (event: MouseEvent) => {
                // Example: Log the click position relative to the canvas
                const rect = canvas.getBoundingClientRect();
                const mouse_x = event.clientX - rect.left;
                const mouse_y = event.clientY - rect.top;
                console.log(`Canvas clicked at: (${mouse_x}, ${mouse_y})`);
                mouseBoundingBox(boundingBoxes, mouse_x, mouse_y);
            };

            // Attach the event listener
            canvas.addEventListener('click', handleCanvasClick, false);

            // Clean up the event listener on unmount or when dependencies change
            return () => {
                canvas.removeEventListener('click', handleCanvasClick);
            };
        };
        return undefined;
    }, [boundingBoxes]);
  

    return (
        <div style={{ ...defaultStyles.container, ...styles?.container }} className={classNames?.container}>
            <video ref={videoRef} style={{ ...defaultStyles.video, ...styles?.video, visibility: paused ? 'hidden' : 'visible' }} className={classNames?.video} autoPlay muted playsInline />
            <canvas
                ref={pauseFrameRef}
                style={{
                    display: paused ? 'block' : 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%'
                }}
            />

            <canvas ref={trackingLayerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex:10 }} />

            <div
                style={{
                    top: 0,
                    left: 0,
                    position: 'absolute',
                    width: '100%',
                    height: '100%'
                }}
            >
                {mergedComponents.finder && (
                    <Finder
                        scanning={isCameraActive}
                        capabilities={camera.capabilities}
                        loading={false}
                        onOff={mergedComponents.onOff}
                        zoom={
                            mergedComponents.zoom && camera.settings.zoom
                                ? {
                                      value: camera.settings.zoom,
                                      onChange: async (value) => {
                                          const newConstraints = {
                                              ...constraintsCached,
                                              advanced: [{ zoom: value }]
                                          };

                                          await camera.updateConstraints(newConstraints);
                                      }
                                  }
                                : undefined
                        }
                        torch={
                            mergedComponents.torch
                                ? {
                                      status: camera.settings.torch ?? false,
                                      toggle: async (value) => {
                                          const newConstraints = {
                                              ...constraintsCached,
                                              advanced: [{ torch: value }]
                                          };

                                          await camera.updateConstraints(newConstraints);
                                      }
                                  }
                                : undefined
                        }
                        startScanning={async () => await onCameraChange()}
                        stopScanning={async () => {
                            await camera.stopCamera();
                            clearCanvas(trackingLayerRef.current);
                            setIsCameraActive(false);
                        }}
                        border={styles?.finderBorder}
                    />
                )}
                {children}
            </div>
        </div>
    );
}
