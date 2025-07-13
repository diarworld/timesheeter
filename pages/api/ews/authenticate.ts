import { NextApiRequest, NextApiResponse } from 'next';
import { ExchangeService, ExchangeVersion, CalendarFolder, Uri, WebCredentials, WellKnownFolderName, OAuthCredentials, AutodiscoverService } from 'ews-javascript-api';

export async function getEmailAccessToken(
  clientId: string,
   tenantId: string,
   emailUserName: string,
   emailUserPassword: string,
   cacheFilePath: string = `tokenCache.json`) {

   const msal = require('@azure/msal-node');
   const { promises: fs } = require('fs');

   //Cache Plugin configuration         
   const beforeCacheAccess = async (cacheContext: any) => {
       try {
           const cacheFile = await fs.readFile(cacheFilePath, 'utf-8');
           cacheContext.tokenCache.deserialize(cacheFile);
       } catch (error) {
           // if cache file doesn't exists, create it
           cacheContext.tokenCache.deserialize(await fs.writeFile(cacheFilePath, ''));
       }
   };

   const afterCacheAccess = async (cacheContext: any) => {
       if (cacheContext.cacheHasChanged) {
           try {
               await fs.writeFile(cacheFilePath, cacheContext.tokenCache.serialize());
           } catch (error) {
               console.log(error);
           }
       }
   };

   const cachePlugin = {
       beforeCacheAccess,
       afterCacheAccess
   };

   const msalConfig = {
       auth: {
           clientId: clientId, // YOUR clientId
           authority: `https://login.microsoftonline.com/${tenantId}` // YOUR tenantId
       },
       cache: {
           cachePlugin
       },
       system: {
           loggerOptions: {
               loggerCallback(loglevel: any, message: any, containsPii: any) {
                   console.log(message);
               },
               piiLoggingEnabled: false,
               logLevel: msal.LogLevel.Verbose
           }
       }
   };

   const pca = new msal.PublicClientApplication(msalConfig);

   const msalTokenCache = pca.getTokenCache();

   const accounts = await msalTokenCache.getAllAccounts();

   // Acquire Token Silently if an account is present
   let accessToken = null;

   if (accounts.length > 0) {
       const silentRequest = {
           account: accounts[0], // Index must match the account that is trying to acquire token silently
           scopes: ['https://graph.microsoft.com/EWS.AccessAsUser.All'],
       };

       const response = await pca.acquireTokenSilent(silentRequest);

       accessToken = response.accessToken;
   } else {
       // fall back to username password if there is no account
       const usernamePasswordRequest = {
           scopes: ['https://graph.microsoft.com/EWS.AccessAsUser.All'],
           username: emailUserName, // Add your username here      
           password: emailUserPassword, // Add your password here
       };

       const response = await pca.acquireTokenByUsernamePassword(usernamePasswordRequest);

       accessToken = response.accessToken;
   }

   return accessToken;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  

  try {
    const { username, token } = req.body;
    
    // var autod = new AutodiscoverService(username.split('@')[1], ExchangeVersion.Exchange2016);
    // autod.Credentials = new WebCredentials(username, token);
    //https://login.microsoftonline.com/a1cebcab-e2ce-4650-bb9d-a0302e8cea76/oauth2/v2.0/authorize?client_id=be87b37a-8f6c-4af9-8e41-67ab3240bbbe&response_type=code&redirect_uri=http://localhost:3000/api/ews/token&response_mode=query&scope=[User.Read, Calendars.Read, EWS.AccessAsUser.All]
    const service = new ExchangeService(ExchangeVersion.Exchange2016);
    // const usernameOnly = username.split('@')[0];
    // service.Credentials = new WebCredentials(`RU1000\\${usernameOnly}`, token);
    service.Url = new Uri("https://owa.lemanapro.ru/EWS/Exchange.asmx");
    
    const emailAccessToken = await getEmailAccessToken(
      'be87b37a-8f6c-4af9-8e41-67ab3240bbbe',
      'a1cebcab-e2ce-4650-bb9d-a0302e8cea76',
      username,
      token
    );

    res.status(200).json({
      success: true,
      emailAccessToken: emailAccessToken
    });
    

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