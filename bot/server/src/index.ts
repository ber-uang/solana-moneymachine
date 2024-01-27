import './pre-start'; // Must be the first import

import { configure as configureLog4js, getLogger } from 'log4js';
import * as log4jsSettings from './.log4jsrc.json';
import server from './server';
import EnvVars from '@src/constants/EnvVars';
import { DexScreener } from '@src/service/screener';

configureLog4js(log4jsSettings);
const logger = getLogger('APP');

// **** Run **** //
const SERVER_START_MSG = 'Express server started on port: ' + EnvVars.Port.toString();

server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));

(async () => {
  const screener = new DexScreener({
    baseUrl: 'https://dexscreener.com',
    filters: {
      rankBy: 'trendingScoreH6',
      order: 'desc',
      chainIds: 'solana',
      minLiq: 1000,
    },
  });

  logger.info('screener created');

  await screener.start();

  logger.info('screener started');
})().catch((err) => {
  logger.error('error while starting up services: %s', err);
});
