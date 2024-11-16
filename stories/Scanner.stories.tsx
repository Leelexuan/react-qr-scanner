import React, { useState } from 'react';

import { Scanner as ScannerComp, IScannerProps, boundingBox} from '../src';

const styles = {
    container: {
        width: 400,
        margin: 'auto'
    },
    controls: {
        marginBottom: 8
    }
};

function Template(args: IScannerProps) {
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
    const [tracker, setTracker] = useState<string | undefined>('centerText');

    const [pause, setPause] = useState(false);


    return (
        <div style={styles.container}>
            {/* <button style={{ marginBottom: 5 }} onClick={() => setPause((val) => !val)}>
                {pause ? 'Pause Off' : 'Pause On'}
            </button> */}
            <ScannerComp
                {...args}
                formats={[
                    'qr_code',
                    'micro_qr_code',
                    'rm_qr_code',
                    'maxi_code',
                    'pdf417',
                    'aztec',
                    'data_matrix',
                    'matrix_codes',
                    'dx_film_edge',
                    'databar',
                    'databar_expanded',
                    'codabar',
                    'code_39',
                    'code_93',
                    'code_128',
                    'ean_8',
                    'ean_13',
                    'itf',
                    'linear_codes',
                    'upc_a',
                    'upc_e'
                ]}
                constraints={{
                    deviceId: deviceId
                }}
                onScan={(detectedCodes) => {
                    console.log(`onError: ${detectedCodes}'`);
                }}
                onError={(error) => {
                    console.log(`onError: ${error}'`);
                }}
                components={{
                    onOff: true,
                    torch: true,
                    zoom: true,
                    finder: true,
                    tracker: boundingBox
                }}
                allowMultiple={true}
                scanDelay={500}
                paused={pause}
            />
        </div>
    );
}

export const Scanner = Template.bind({});

// @ts-ignore
Scanner.args = {};

export default {
    title: 'Scanner'
};
