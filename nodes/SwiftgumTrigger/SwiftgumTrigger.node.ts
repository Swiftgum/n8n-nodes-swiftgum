import {
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	IDataObject,
	INodePropertyOptions,
	INodeOutputConfiguration,
  IHookFunctions,
} from 'n8n-workflow';
import * as crypto from 'crypto';

const BASE_URL = 'https://api.swiftgum.com/api/v1';

export class SwiftgumTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Swiftgum Trigger',
		name: 'swiftgumTrigger',
		group: ['trigger'],
		version: 1,
    description: 'Listen for Swiftgum PDF extraction webhooks, filtered by schema. To test, upload a PDF in your Swiftgum workspace — this node will emit the extracted data once processed.',
		defaults: {
			name: 'Swiftgum Trigger',
		},
		inputs: [],
		outputs: [{ type: 'main' }] as INodeOutputConfiguration[],
		credentials: [
			{
				name: 'swiftgumApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Schema (Optional) Names or IDs',
				name: 'schemaId',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getSchemas' },
				default: [],
				description: 'Only emit events matching these schemas; leave empty to receive all. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getSchemas(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { apiKey } = (await this.getCredentials('swiftgumApi')) as { apiKey: string };

				if (!apiKey) {
					return [];
				}

				const response = await this.helpers.request({
					method: 'GET',
					uri: `${BASE_URL}/schemas`,
					headers: {
						'X-API-Key': apiKey,
					},
					json: true,
				});

				return (response as Array<{ id: string; name: string }>).map((s) => ({
					name: s.name,
					value: s.id,
				}));
			},
		},
	};

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');
        const exists = !!webhookData.subscriptionId;
        return exists;
      },
  
      async create(this: IHookFunctions): Promise<boolean> {
        const { apiKey } = (await this.getCredentials('swiftgumApi')) as { apiKey: string };
        const webhookUrl = this.getNodeWebhookUrl('default');
        const schemaIds = this.getNodeParameter('schemaId') as string[];
      
        const body: IDataObject = { targetUrl: webhookUrl };
        if (schemaIds.length) {
          body.schemaIds = schemaIds;
        }
      
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${BASE_URL}/webhooks/subscribe`,
          headers: {
            'X-API-Key': apiKey,
          },
          body,
          json: true,
        });
      
        // Fetch schema names if any were selected
        if (schemaIds.length) {
          await this.helpers.request({
            method: 'GET',
            uri: `${BASE_URL}/schemas`,
            headers: {
              'X-API-Key': apiKey,
            },
            json: true,
          });
        } 
      
        const webhookData = this.getWorkflowStaticData('node');
        webhookData.subscriptionId = response.id;
        webhookData.signingSecret = response.secret;
      
        return true;
      },
      
      async delete(this: IHookFunctions): Promise<boolean> {
        const { apiKey } = (await this.getCredentials('swiftgumApi')) as { apiKey: string };
        const webhookData = this.getWorkflowStaticData('node');
  
        if (!webhookData.subscriptionId) {
          return true;
        }
  
        try {
          await this.helpers.request({
            method: 'DELETE',
            uri: `${BASE_URL}/webhooks/${webhookData.subscriptionId}`,
            headers: {
              'X-API-Key': apiKey,
            },
            json: true,
          });
        } catch (error) {
        }
  
        delete webhookData.subscriptionId;
        delete webhookData.signingSecret;
  
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	const schemaFilter = this.getNodeParameter('schemaId') as string[];
	const body = this.getBodyData() as IDataObject;
  
	const { signingSecret } = this.getWorkflowStaticData('node');
  
	if (signingSecret) {
	  const sigHeader = this.getHeaderData()['x-swiftgum-signature'] as string;
	  if (!sigHeader) return { noWebhookResponse: true };
  
	  const raw = JSON.stringify(body ?? {});
	  const expected = crypto
		.createHmac('sha256', signingSecret as string)
		.update(raw)
		.digest('hex');
	  

	  if (sigHeader !== expected) return { noWebhookResponse: true };
	}
  
	if (schemaFilter.length && !schemaFilter.includes(body.schemaId as string)) {
	  return { noWebhookResponse: true };
	}
  
	const fields = (body.fields ?? body.data ?? []) as unknown;
	const meta = {
	  jobId: body.jobId,
	  schemaId: body.schemaId,
	  status: body.status,
	};
  
	let items: IDataObject[] = [];
  
	if (Array.isArray(fields)) {
	  items = fields.map((field) => ({ ...field, ...meta }));
	} else if (typeof fields === 'object' && fields !== null) {
	  items = [{ ...(fields as IDataObject), ...meta }];
	} else {
	  items = [{ value: fields as any, ...meta }];
	}
  
	return {
	  workflowData: [this.helpers.returnJsonArray(items)],
	};
  }
  
}
