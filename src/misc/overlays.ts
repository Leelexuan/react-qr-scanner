import { IAdjustedBarcode } from '../types';

export function boundingBox(detectedCodes: IAdjustedBarcode[], ctx: CanvasRenderingContext2D) {
    const boundingBoxes = [];

    for (const detectedCode of detectedCodes) {
        const {
            boundingBox: { x, y, width, height }
        } = detectedCode;

        const rawValue = detectedCode.rawValue;

        // Add border to give it a button-like appearance
        ctx.lineWidth = 2;
        ctx.strokeStyle = detectedCode.colour;
        ctx.strokeRect(x, y, width, height);
        boundingBoxes.push({ x, y, width, height, rawValue});
        console.log("bounding box stored")

         // Create a background rectangle below the bounding box to fill with text
        const textHeight = 20;   // Height of the filled area for text
        const textY = y + height; // Position of the filled rectangle directly below the bounding box

        // Draw the rawValue text centered horizontally within the rectangle
        const textWidth = ctx.measureText(rawValue).width;
        const textX = x + width / 2 - textWidth / 2; // Center the text horizontally


        // Set the style for the filled background
        ctx.fillStyle = detectedCode.colour; // Dark background with some transparency
        ctx.fillRect(x, textY, width, textHeight); // Draw the filled rectangle for the text

        // Set text styling max 12, min 10
        const fontSize =  Math.max(10, Math.min(12, (50 * width) / ctx.canvas.width));
        ctx.font = `${fontSize}px sans-serif`; 
        ctx.fillStyle = 'white';  // White text color

        ctx.fillText(rawValue, textX, textY + textHeight / 2 + 5);  // +5 is to adjust vertical positioning a bit
    }
    
    console.log("BoundingBoxes Overlay ", boundingBoxes);

    return boundingBoxes;
};
