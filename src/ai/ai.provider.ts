import { Provider } from '@nestjs/common';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const AI = 'GENKIT_AI';

export const AiProvider: Provider = {
  provide: AI,
  useFactory: () => {
    return genkit({
      plugins: [
        googleAI({
          apiKey: process.env.GOOGLE_API_KEY,
        }),
      ],
    });
  },
};
