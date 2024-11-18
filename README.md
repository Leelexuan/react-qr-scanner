# Custom QR Scanner

This library extends the original QR scanning functionality from `@yudiel/react-qr-scanner` by enhancing user interactions and improving feedback through visual and click-based capabilities.

## Features

- Scan QR and barcode formats using a smartphone camera or webcam.
- Visual bounding box states based on an external API response:
  - **Red**: Code not found.
  - **Green**: Code found.
  - **Yellow**: Loading state.
- Mouse-click interaction to detect bounding box clicks.
- Callback functions for:
  - `onBoundingBoxClick`: Detects clicks within the bounding box.
  - `onNewBarCodeDetected`: Triggers when a new barcode is scanned.
- Removed audio beep
- New overlay which shows bounding box with code
- Removed tracker and device options

### Demo

To see the original library in action, check out [Yudiel's Demo](https://yudielcurbelo.github.io/react-qr-scanner/).

### Install

```bash
npm install '@leelexuan/react-qr-scanner'
```

### Run

```bash
npm run storybook
```

### Supported Formats

| 1D Barcodes      | 2D Barcodes   |
| ---------------- | ------------- |
| Codabar          | Aztec         |
| Code 39          | Data Matrix   |
| Code 93          | Matrix Codes  |
| Code 128         | Maxi Code     |
| Databar          | Micro QR Code |
| Databar Expanded | PDF 417       |
| Dx Film Edge     | QR Code       |
| EAN 8            | rMQR Code     |
| EAN 13           |               |
| ITF              |               |
| Linear Codes     |               |
| UPC A            |               |
| UPC E            |               |

### Scanner Props

| Prop            | Type                                          | Required | Description                                                                      |
| --------------- | --------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| onBoundingBoxClick        | (rawValue: string) => void | Yes      | Callback function that is called when a bounding box is clicked.         |
| onNewBarcodeDetected       | (rawValue: string) => void | Yes      | Callback function that is called when a new barcode/qr code is detected.      |
| onError       | (error: unknown) => void                    | No       | Callback function that is called when an error occurs while mounting the camera. |
| constraints   | MediaTrackConstraints                       | No       | Optional media track constraints to apply to the video stream.                   |
| formats       | BarcodeFormat[]                             | No       | List of barcode formats to detect.                                               |
| paused        | boolean                                     | No       | If true, scanning is paused.                                                   |
| children      | ReactNode                                   | No       | Optional children to render inside the scanner component.                        |
| components    | IScannerComponents                          | No       | Custom components to use within the scanner.                                     |
| styles        | IScannerStyles                              | No       | Custom styles to apply to the scanner and its elements.                          |
| classNames    | IScannerClassNames                          | No       | Custom classNames to apply to the scanner and its elements.                      |
| allowMultiple | boolean                                     | No       | If true, ignore same barcode being scanned.                                    |
| scanDelay     | number                                      | No       | Delay in milliseconds between scans.                                             |