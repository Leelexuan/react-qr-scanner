import cv, { RotatedRect } from "@techstark/opencv-js"; 
import { type DetectedBarcode, type Point2D } from "barcode-detector";

export function preprocessImage(imageData: ImageData): { srcMat: cv.Mat; dst: cv.Mat } {
    // Convert imageData to OpenCV Mat
    const srcMat = cv.matFromImageData(imageData);
    const dst = new cv.Mat();
    cv.cvtColor(srcMat, dst, cv.COLOR_RGBA2GRAY);
    cv.blur(dst, dst, new cv.Size(9, 9));
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(13,13));
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel);

    //erode and dilate
    cv.erode(dst, dst, new cv.Mat(), new cv.Point(-1, -1), 5);
    cv.dilate(dst, dst, new cv.Mat(), new cv.Point(-1, -1), 5);

    //edged
    cv.Canny(dst, dst, 50, 150);


    console.log("preprocessImage");

    return { srcMat, dst}; 
}

function euclideanDistance(p1: cv.Point, p2: cv.Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}


export function findBarcodeContour(edged: cv.Mat, padding: number, minDistance: number): {approxList: cv.RotatedRect[]} {
    const contours = new cv.MatVector;
    const hierarchy = new cv.Mat;
    cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE,);
    
    //find max area
    let contoursArray: cv.Mat[] = [];
    for (let i = 0; i < contours.size(); i++) {
        contoursArray.push(contours.get(i));
    }
    contoursArray.sort((a, b) => {
        const areaA = cv.contourArea(a);  
        const areaB = cv.contourArea(b);  
        return areaB - areaA;  
    });

    let approxList: cv.RotatedRect[] = [];
    let centers: cv.Point[] = [];
    
    for (let i = 0; i < Math.min(contoursArray.length, 20); i++) {
        let contour = contoursArray[i];
        let rect = cv.minAreaRect(contour);
        let cx = rect.center.x;
        let cy = rect.center.y;
        let w = rect.size.width;
        let h = rect.size.height;
        let angle = rect.angle;
        
        let wNew = w + w*padding;
        let hNew = h + h*padding;
        
        let rectPadded = new cv.RotatedRect(new cv.Point(cx, cy), new cv.Size(wNew, hNew), angle);
        
        if (!centers.some(prev => euclideanDistance(rect.center, prev) < minDistance)) {
            approxList.push(rectPadded);
            centers.push(rect.center);
        }
    }
    contours.delete();
    hierarchy.delete();
    console.log("findBarcodeContour");
    return {approxList};
}

// function saveMatAsJpeg(mat: cv.Mat, filename: string) {
//     // Convert Mat to a canvas
//     let canvas = document.createElement("canvas");
//     cv.imshow(canvas, mat); // Render the Mat on the canvas
//     let dataUrl = canvas.toDataURL(filename+".jpeg");

//     // Create a link and trigger the download
//     let link = document.createElement("a");
//     link.href = dataUrl;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     console.log("saveMatAsJpeg");
// }

function getRotatedRectVertices(rect: RotatedRect): {matCorners: cv.Mat, corners: [Point2D, Point2D, Point2D, Point2D], minX: number, minY: number} {
    const { center, size, angle } = rect;
    const angleRad = angle * (Math.PI / 180); // Convert to radians

    // Half dimensions
    const halfWidth = size.width / 2;
    const halfHeight = size.height / 2;

    // Relative corner positions before rotation
    //tl tr br bl
    const cornersOrig: [Point2D, Point2D, Point2D, Point2D] = [
        {x: -halfWidth, y: -halfHeight},
        {x: halfWidth, y: -halfHeight},  // Top-right
        {x: halfWidth, y: halfHeight},  
        {x: -halfWidth, y: halfHeight} 
    ];

    const corners = cornersOrig.map(pt => 
            ({
                x: Number(center.x + pt.x),
                y: Number(center.y + pt.y)
        })
        )  as [Point2D, Point2D, Point2D, Point2D];

    // Rotate each corner around the center
    let rotatedCorners = cornersOrig.map(pt => 
        new cv.Point(
            center.x + pt.x * Math.cos(angleRad) - pt.y * Math.sin(angleRad),
            center.y + pt.x * Math.sin(angleRad) + pt.y * Math.cos(angleRad)
        )
    );

    let minX = -halfWidth + center.x;
    let minY = -halfHeight + center.y;

    // Flatten into [x1, y1, x2, y2, x3, y3, x4, y4]
    let flatArray = rotatedCorners.flatMap(pt => [pt.x, pt.y]);
    let matCorners = cv.matFromArray(4, 1, cv.CV_32FC2, flatArray)
    console.log("getRotatedVertices");

    // Convert to cv.Mat (4 rows, 1 column, CV_32FC2)
    return {matCorners, corners, minX, minY};
}

function matToImageData(mat: cv.Mat): ImageData {
    let rgbaMat = new cv.Mat();
    cv.cvtColor(mat, rgbaMat, cv.COLOR_GRAY2RGBA); // Convert grayscale to RGBA

    const imgData = new ImageData(
        new Uint8ClampedArray(rgbaMat.data),
        rgbaMat.cols,
        rgbaMat.rows
    );

    rgbaMat.delete(); // Free memory
    return imgData;
}



function process_image(image: cv.Mat): cv.Mat {

    let blurred = new cv.Mat();
    let enhanced = new cv.Mat();
    let ksize = new cv.Size(5,5);

    //unsharp masking
    cv.GaussianBlur(image, blurred, ksize, 9, 9, cv.BORDER_DEFAULT);
    cv.subtract(image, blurred, enhanced);
    cv.add(image, enhanced, enhanced);

    //enhance contrast
    let gray = new cv.Mat();
    cv.cvtColor(image, gray, cv.COLOR_BGR2GRAY);
    let equalized = new cv.Mat();
    cv.equalizeHist(gray, equalized);
    let thresh = new cv.Mat();
    cv.threshold(equalized, thresh, 130.0, 255.0, cv.THRESH_TRUNC);
    console.log("process_image");

    //garbage collection
    blurred.delete();
    enhanced.delete();
    gray.delete();
    equalized.delete();
    return thresh
}

export async function process(image: ImageData, barcodeDetector: BarcodeDetector): Promise<DetectedBarcode[]> {
    const barcodeDict: DetectedBarcode[] = [];

    try{
        const {srcMat, dst} = preprocessImage(image);
        const {approxList} = findBarcodeContour(dst, 0.1, 10);
        

        for (let rect of approxList) {
            let height = rect.size.height;
            let width = rect.size.width;

            let aspectRatio = height/width;
            let longSide, shortSide;
            
            if (aspectRatio >= 1){
                [longSide, shortSide] = [200*aspectRatio, 200];
            } else {
                [longSide, shortSide] = [200/aspectRatio, 200];
            }
            //check if rect is closer to square or vertical
            if (rect.angle > 80) {
                [longSide, shortSide] = [shortSide, longSide];
            }

            //get points for perspective transform
            let {matCorners, corners, minX, minY} = getRotatedRectVertices(rect);
            console.log("rect of approxlist")
            let imageNew = srcMat.clone();
            let croppedRect = new cv.Mat();
            //tl, tr, br, bl
            let newRectPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, longSide, 0, longSide, shortSide, 0, shortSide]);
            let M = cv.getPerspectiveTransform(matCorners, newRectPoints);
            cv.warpPerspective(imageNew, croppedRect, M, new cv.Size(longSide, shortSide));

            let processedImage = process_image(croppedRect);
            // saveMatAsJpeg(processedImage, "processedImage");

            //convert to imageData
            const imgData = matToImageData(processedImage);
            const detectedCodes = await barcodeDetector.detect(imgData);
            console.log("detectedCodesImage: ", detectedCodes);

            //if detectedCodes, append it in format
            
            if (detectedCodes.length > 0){
                for (let barcode of detectedCodes){
                    barcodeDict.push({
                        rawValue: barcode.rawValue,
                        format: barcode.format,
                        boundingBox: new DOMRectReadOnly(minX, minY, rect.size.width, rect.size.height),
                        cornerPoints: corners,
                    })
                }
            }

            imageNew.delete();
            croppedRect.delete();
            processedImage.delete();
            };
            

        
        console.log("barcodeDict: ", barcodeDict);

        srcMat.delete();
        dst.delete();
        return barcodeDict;

        } catch (error) {
            console.log(error);
            return  barcodeDict;
        }
    }


export function mergeDictionaries(
  arrayA: DetectedBarcode[],
  arrayB: DetectedBarcode[]): DetectedBarcode[] {

  // Find items in arrayB that are not in arrayA based on the key
  const itemsToAddToA: DetectedBarcode[] = arrayB
    .filter((itemB) => !arrayA.some((itemA) => itemA.rawValue === itemB.rawValue || euclideanDistance(new cv.Point(itemA.boundingBox.x, itemA.boundingBox.y), new cv.Point(itemB.boundingBox.x, itemB.boundingBox.y)) < 10))
    .map((itemB) => ({
      rawValue: itemB.rawValue,
      format: itemB.format,
      boundingBox: itemB.boundingBox,
      cornerPoints: itemB.cornerPoints
    }));


  // Update the arrays with new items
  const updatedArrayA = [...arrayA, ...itemsToAddToA];
  

  return updatedArrayA;
}


