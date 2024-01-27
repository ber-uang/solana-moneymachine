import { execFileSync } from 'child_process';
import axios from 'axios';
import { wait } from '..';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require('chromium');

/**
 * Start chromium browser
 */
export const startbrowser = async (port: number, url?: string) => {
  try {
    if (url == null) {
      url = 'https://google.com';
    }

    execFileSync(chromium.path, [`--remote-debugging-port=${port}`, url]);

    // wait until spins up
    await wait(4000);

    const res = await axios.get(`http://127.0.0.1:${port}/json/version`);
    const useragent = await res.data['User-Agent'];
    const websocket = await res.data['webSocketDebuggerUrl'];

    return { useragent, websocket };
  } catch (error) {
    console.log(error);

    return error;
  }
};
