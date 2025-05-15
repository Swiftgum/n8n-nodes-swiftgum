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
const crypto = require('crypto');

// const BASE_URL = 'https://app.swiftgum.com/api/v1';
// const BASE_URL = 'http://host.docker.internal:3000/api/v1';
export const BASE_URL = 'http://host.docker.internal:3000/api/v1';

export class SwiftgumTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Swiftgum Trigger',
		name: 'swiftgumTrigger',
		group: ['trigger'],
		version: 1,
    	description: 'Listen for Swiftgum PDF extraction webhooks, filtered by schema. To test, upload a PDF in your Swiftgum workspace — this node will emit the extracted data once processed.',
		icon: 'file:logo.svg',
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

		async checkExists(this: IHookFunctions) {
			const uiId     = this.getNodeParameter('subscriptionId', '') as string;
			const data     = this.getWorkflowStaticData('node');
			data.subscriptionId = data.subscriptionId || uiId;   // prefer stored, else UI
			return !!data.subscriptionId;
		  },
		  
		  async update(this: IHookFunctions) {
			const { apiKey }    = await this.getCredentials('swiftgumApi') as { apiKey: string };
			const data          = this.getWorkflowStaticData('node');
			const webhookUrl    = this.getNodeWebhookUrl('default');
			const schemaIds     = this.getNodeParameter('schemaId') as string[];
		  
			const body: IDataObject = { targetUrl: webhookUrl };
			if (schemaIds.length) body.schemaIds = schemaIds;
		  
			await this.helpers.request({
			  method : 'PATCH',                                 // or 'PUT'
			  uri    : `${BASE_URL}/webhooks/${data.subscriptionId}`,
			  headers: { 'X-API-Key': apiKey },
			  body,
			  json   : true,
			});
		  
			return true;
		  },
		  
		  async create(this: IHookFunctions): Promise<boolean> {
			const { apiKey } = await this.getCredentials('swiftgumApi') as { apiKey: string };
			const webhookUrl = this.getNodeWebhookUrl('default');
			const schemaIds = this.getNodeParameter('schemaId') as string[];
		
			const body: IDataObject = { targetUrl: webhookUrl };
			if (schemaIds.length) {
				body.schemaIds = schemaIds;
			}
		
			console.log('[Webhook Create] Sending body:', JSON.stringify(body, null, 2));
		
			try {
				const response = await this.helpers.request({
					method: 'POST',
					uri: `${BASE_URL}/webhooks/subscribe`,
					headers: { 'X-API-Key': apiKey },
					body,
					json: true,
				});
		
				const data = this.getWorkflowStaticData('node');
				data.subscriptionId = response.id;
				data.signingSecret = response.secret;
		
				console.log('[Webhook Create] Subscription created successfully.');
				return true;
			} catch (error) {
				console.error('[Webhook Create] Failed to create subscription:', error.message);
				throw new Error(`Failed to create subscription: ${error.message}`);
			}
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

	  async manualWebhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Properly tell n8n to wait for incoming HTTP request
		return {
			noWebhookResponse: true,
		};
	}		

    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	const schemaFilter = this.getNodeParameter('schemaId') as string[];
	const body = this.getBodyData() as IDataObject;
	const { signingSecret } = this.getWorkflowStaticData('node');

	if (signingSecret) {
		const sigHeader = this.getHeaderData()['x-swiftgum-signature'] as string;

		if (!sigHeader) {
			console.warn('[Swiftgum Webhook] Missing signature header.');
			return { noWebhookResponse: true };
		}

		const rawBody = JSON.stringify(body ?? {});
		const expectedSignature = crypto
			.createHmac('sha256', signingSecret as string)
			.update(rawBody)
			.digest('hex');

		if (sigHeader !== expectedSignature) {
			console.warn(`[Swiftgum Webhook] Invalid signature. Expected: ${expectedSignature}, Received: ${sigHeader}`);
			return { noWebhookResponse: true };
		}
	}

	if (schemaFilter.length && !schemaFilter.includes(body.schemaId as string)) {
		console.info(`[Swiftgum Webhook] Event filtered out. Schema ID: ${body.schemaId}`);
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
