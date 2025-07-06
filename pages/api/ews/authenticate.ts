import { NextApiRequest, NextApiResponse } from 'next';
import { ExchangeService, ExchangeVersion, CalendarFolder, Uri, WebCredentials, WellKnownFolderName } from 'ews-javascript-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, token } = req.body;
    
    // var autod = new AutodiscoverService(username.split('@')[1], ExchangeVersion.Exchange2016);
    // autod.Credentials = new WebCredentials(username, token);
    
    const service = new ExchangeService(ExchangeVersion.Exchange2016);
    const usernameOnly = username.split('@')[0];
    service.Credentials = new WebCredentials(`RU1000\\${usernameOnly}`, token);
    service.Url = new Uri("https://owa.lemanapro.ru/EWS/Exchange.asmx");
    
    // console.log('Service URL set to:', service.Url.toString());
    
    // Test connection by accessing inbox
    const inbox = await CalendarFolder.Bind(service, WellKnownFolderName.Calendar);

    res.status(200).json({
      success: true,
      userInfo: {
        displayName: inbox.DisplayName,
        email: username
      }
    });
  } catch (error) {
    console.error('EWS Authentication error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}