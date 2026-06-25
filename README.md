# Create Protoface App (Vapi)

This starter is an example of how to create a composable Protoface interaction that runs in a Next.js app.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-vapi).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-vapi).

To see quickstarts for other platforms, visit the [quickstart repo](https://github.com/protoface-ai/protoface-quickstart).

## Usage

1. Rename `.env.example` to `.env` and paste your keys: [Protoface API key](https://docs.protoface.com), [Vapi API key](https://dashboard.vapi.ai/org/api-keys), and your LiveKit project credentials.

If you want to try Protoface but do not have API access to these third parties, reach out to the Protoface team and we can help you get set up.

```js
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
LIVEKIT_URL="wss://YOUR-LIVEKIT-PROJECT.livekit.cloud"
LIVEKIT_API_KEY="LIVEKIT-API-KEY"
LIVEKIT_API_SECRET="LIVEKIT-API-SECRET"

NEXT_PUBLIC_VAPI_API_KEY="VAPI-API-KEY"
NEXT_PUBLIC_VAPI_ASSISTANT_ID="VAPI-ASSISTANT-ID"
NEXT_PUBLIC_PROTOFACE_AVATAR_ID="av_stock_001"
```

2. Install packages

```bash
npm install
```

3. Run

```bash
npm run dev
```

4. Create your Vapi agent, then set the agent ID in `.env`. `NEXT_PUBLIC_PROTOFACE_AVATAR_ID` is optional and defaults to `av_stock_001`.

```js
NEXT_PUBLIC_VAPI_ASSISTANT_ID="VAPI-ASSISTANT-ID"
NEXT_PUBLIC_PROTOFACE_AVATAR_ID="av_stock_001"
```

## Characters

You can swap out the character by finding one that you like in the [Protoface avatar docs](https://docs.protoface.com/guides/avatars), or create your own.

`av_stock_001` `av_stock_002` `av_stock_003` `custom_avatar_id`

## Deploy on Vercel

An easy way to deploy your avatar interaction is to use the [Vercel Platform](https://vercel.com/new?filter=next.js).
