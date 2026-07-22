# Protoface Quickstart for Vapi

This quickstart is the easiest way to serve a Protoface Avatar connected to Vapi's AI Voice Agents. Simply follow the steps listed below.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-vapi).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-vapi).

To see quickstarts for other platforms, visit the [quickstart repo](https://github.com/protoface-ai/protoface-quickstart).

## Get Started

1. Copy `.env.example` for your local `.env` file and put in your Protoface API key, your LiveKit secrets, and your Vapi API key and assistant id.

```js
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
LIVEKIT_URL="wss://YOUR-LIVEKIT-PROJECT.livekit.cloud"
LIVEKIT_API_KEY="LIVEKIT-API-KEY"
LIVEKIT_API_SECRET="LIVEKIT-API-SECRET"

NEXT_PUBLIC_VAPI_API_KEY="VAPI-API-KEY"
NEXT_PUBLIC_VAPI_ASSISTANT_ID="VAPI-ASSISTANT-ID"
NEXT_PUBLIC_PROTOFACE_AVATAR_ID="av_stock_001" // Optional (defaults to av_stock_001)
```

1. Install the needed packages

```bash
npm install
```

1. Run the dev server and head to [the site](http://localhost:3000)

```bash
npm run dev
```

## How It Works

The app starts an Vapi conversation and a Protoface avatar session side by side:

1. The server route creates a Protoface session and returns the browser connection details.
2. `ProtofaceClient.start()` connects the browser to the avatar session.
3. The browser starts the Vapi assistant call with the Vapi Web SDK.
4. The app passes the realtime model speech to Protoface so the avatar speaks naturally.

Protoface is the visible and audible avatar output for the experience.

## Avatars

Find avatars you like or create your own on [the Protoface dashboard](https://app.protoface.com?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-vapi). Replace the `.env` value for `NEXT_PUBLIC_PROTOFACE_AVATAR_ID` to swap the stock avatar with one of your choosing.

Alternatively, find the API spec for creating, retrieving, and maintaing avatars at [docs.protoface.com](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-vapi).

## Protoface: More Quickstarts

Protoface integrates with popular voice AI platforms.

Clone a starter repo, add your keys to the environment file, and run.

If an SDK or plugin is available separately, we've linked to it instead.

| Platform | Link |
| --- | --- |
| LiveKit | [Plugin](https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-protoface) [Official Docs](https://docs.livekit.io/agents/models/avatar/plugins/protoface/)|
| Pipecat | [Plugin](https://github.com/protoface-ai/protoface-plugin-pipecat) [Official Docs](https://docs.pipecat.ai/api-reference/server/services/video/protoface)|
| Agora | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-agora) |
| Vapi | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-vapi) |
| ElevenLabs Agents | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-elevenlabs-agents) |
| OpenAI Realtime | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-openai-realtime) |
| VideoSDK | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-videosdk) |
| Python | [SDK](https://github.com/protoface-ai/protoface-sdk-python) |
| Node.js | [SDK](https://github.com/protoface-ai/protoface-sdk-node) |
