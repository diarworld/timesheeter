import { NextApiRequest, NextApiResponse } from 'next';
import {
  ExchangeService,
  ExchangeVersion,
  CalendarFolder,
  Uri,
  WebCredentials,
  WellKnownFolderName,
} from 'ews-javascript-api';
import { decrypt, isEncrypted } from 'shared/lib/encrypt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let { username, token } = req.body;

    if (isEncrypted(token)) {
      token = await decrypt(token);
    }

    // var autod = new AutodiscoverService(username.split('@')[1], ExchangeVersion.Exchange2016);
    // autod.Credentials = new WebCredentials(username, token);

    const service = new ExchangeService(ExchangeVersion.Exchange2016);
    const usernameOnly = username.split('@')[0];
    const ewsDomain = process.env.EWS_DOMAIN;
    if (!ewsDomain) {
      throw new Error('EWS_DOMAIN is not defined in environment variables');
    }
    service.Credentials = new WebCredentials(`${ewsDomain}\\${usernameOnly}`, token);
    const ewsServiceUrl = process.env.EWS_SERVICE_URL;
    if (!ewsServiceUrl) {
      throw new Error('EWS_SERVICE_URL is not defined in environment variables');
    }
    service.Url = new Uri(ewsServiceUrl);

    // console.log('Service URL set to:', service.Url.toString());

    // Test connection by accessing inbox
    const inbox = await CalendarFolder.Bind(service, WellKnownFolderName.Calendar);

    res.status(200).json({
      success: true,
      userInfo: {
        displayName: inbox.DisplayName,
        email: username,
      },
    });
  } catch (error) {
    console.error('EWS Authentication error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
