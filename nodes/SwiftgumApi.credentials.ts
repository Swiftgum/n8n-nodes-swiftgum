import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SwiftgumApi implements ICredentialType {
  name = 'swiftgumApi';
  displayName = 'Swiftgum API';
  // icon = 'file:swiftgum.png';
  documentationUrl = 'https://docs.swiftgum.com';

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
}
