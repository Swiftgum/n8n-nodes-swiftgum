import { ICredentialType, INodeProperties, IHttpRequestMethods, ICredentialTestRequest } from 'n8n-workflow';

export class SwiftgumApi implements ICredentialType {
  name = 'swiftgumApi';
  displayName = 'Swiftgum API';
  // icon = 'file:swiftgum.png';
  documentationUrl = 'https://app.swiftgum.com';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Swiftgum API key (will be sent as a Bearer token)',
    },
  ];

  // Add the test configuration to validate the credentials in n8n UI
  test: ICredentialTestRequest = {
    request: {
      method: 'GET' as IHttpRequestMethods,
      url: 'https://app.swiftgum.com/api/v1/auth/check',
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
      },
    },
  };
  
}
