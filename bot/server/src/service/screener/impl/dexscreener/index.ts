import axios from 'axios';
import { JSDOM } from 'jsdom';
import { getLogger } from 'log4js';
import puppeteer from 'puppeteer';
import { Screener, ScreenerOptions } from '@src/service/screener/screener-base';
import { startbrowser } from '@src/util/antibotbrowser';

const logger = getLogger('DexScreener');

export interface DexScreenerOptions extends ScreenerOptions {
  userAgent?: string;
}

export class DexScreener extends Screener {
  screenerUrl: string;
  userAgent: string;
  cookies?: string;

  constructor(options: DexScreenerOptions) {
    super(options);

    // prep screenerUrl
    const queryParams: string[] = [];

    if (options.filters != null) {
      Object.keys(options.filters).forEach((key) => {
        queryParams.push(`${key}=${options.filters![key]}`);
      });
    }

    this.screenerUrl = `${options.baseUrl}?${queryParams.join('&')}`;
    logger.trace('screenerUrl = %s', this.screenerUrl);

    // userAgent
    this.userAgent =
      options.userAgent ??
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    logger.trace('userAgent = %s', this.userAgent);
  }

  private async prepare(): Promise<void> {
    logger.trace('prepare()');
    // use puppeteer to acquire cloudflare cookie

    // const antibotBrowser = await startbrowser(3222);
    // const browser = await puppeteer.connect({ browserWSEndpoint: antibotBrowser.websocket });
    const browser = await puppeteer.launch({
      headless: 'new',
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': this.userAgent,
      'upgrade-insecure-requests': '1',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9,en;q=0.8',
    });
    await page.goto(this.screenerUrl, { waitUntil: 'networkidle2' });

    const pageCookies = await page.cookies();
    this.cookies = pageCookies.map((c) => `${c.name}=${c.value}`).join('; ');
    logger.trace('cookies = %s', this.cookies);
  }

  async start(): Promise<void> {
    logger.trace('start()');
    // await this.prepare();

    this.cookies =
      '__cuid=a717ad62e9774a709109950ca2ec4d6f; amp_fef1e8=9b5d5883-980e-41ad-b73a-5a8fc011ea55R...1hl1ukag0.1hl1ukag3.d.8.l; __cf_bm=APRhEvPfsAAObLrPvTBUT3Hm8uvPAKQP9jWpwbeZM2g-1706346999-1-Aemx4Dkkg3NUENcOomOESLPcIkIBdFTPrfWNdA+FKHdYoZVhEgpChHT3+pLNigK69nw468cwHmR/rZY5BTo0Md/3Mhe0XW/7VHkPseBMPtPT; cf_clearance=PW8ToNvadOZlMboyQHddf6hdu9ekZD3TqbELJflIPyA-1706347005-1-AaqxKvjDLHQcWAtdDKZNh2Da8WSYwPbd617KLTaMBvck1baL/xaTFUqVSRuGCMmN1uuzEKI0J2H9hfyeEVZ8xRo=';

    logger.debug('sending GET to %s', this.screenerUrl);
    const dexScreenerResponse = await axios.get(this.screenerUrl, {
      headers: {
        'User-Agent': this.userAgent,
        Cookie: this.cookies,
        // Accept:
        //   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
      },
    });

    const dom = new JSDOM(dexScreenerResponse.data);

    const scripts = Array.from(dom.window.document.querySelectorAll('script'));
    const targetScript = scripts.find((script) => script.textContent?.includes('SERVER_DATA'));

    if (targetScript) {
      // adjust script content
      let serverData: any;
      const scriptContent = targetScript.textContent!.replace('window.__SERVER_DATA', 'serverData');
      eval(scriptContent);

      logger.info(`ServerData parsed successfully. PairsCnt: ${serverData.route.data.dexScreenerData.pairs.length}`);

      // return serverData;
    } else {
      logger.warn(`something wrong while fetching ${this.screenerUrl}`);
      // return content;
    }
  }
}
