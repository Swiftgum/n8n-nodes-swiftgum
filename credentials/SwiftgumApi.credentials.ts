import { ICredentialType, INodeProperties, IHttpRequestMethods, ICredentialTestRequest } from 'n8n-workflow';
import { BASE_URL } from '../nodes/SwiftgumTrigger/SwiftgumTrigger.node';

export class SwiftgumApi implements ICredentialType {
  name = 'swiftgumApi';
  displayName = 'Swiftgum API';
  documentationUrl = 'https://app.swiftgum.com/api/v1/docs';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Swiftgum API key. Go to https://app.swiftgum.com Developer > Api key to get your key.',
    },
  ];

  // Add the test configuration to validate the credentials in n8n UI
  test: ICredentialTestRequest = {
    request: {
      method: 'GET' as IHttpRequestMethods,
      url: BASE_URL + '/auth/check',
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
      },
    },
  };
  
}
