import OpenAI, { APIError, APIConnectionError } from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions/completions';
import dedent from 'dedent';
import { KnownError } from './error';
import { detectShell } from './os-detect';
import './replace-all-polyfill';
import i18n from './i18n';
import { stripRegexPatterns } from './strip-regex-patterns';
import readline from 'readline';

const explainInSecondRequest = true;

export type { ChatCompletionMessageParam };

function getApiClient(key: string, apiEndpoint: string) {
  // The `openai` SDK is used only as an OpenAI-compatible HTTP client;
  // the actual endpoint is whatever API_ENDPOINT points at.
  return new OpenAI({ apiKey: key, baseURL: apiEndpoint });
}

// The SDK retries nothing by default; keep failures fast and honest.
const requestOptions = { maxRetries: 0 } as const;

// Openai outputs markdown format for code blocks. It oftne uses
// a github style like: "```bash"
const shellCodeExclusions = [/```[a-zA-Z]*\n/gi, /```[a-zA-Z]*/gi, '\n'];

export async function getScriptAndInfo({
  prompt,
  key,
  model,
  apiEndpoint,
}: {
  prompt: string;
  key: string;
  model?: string;
  apiEndpoint: string;
}) {
  const fullPrompt = getFullPrompt(prompt);
  const stream = await generateCompletion({
    prompt: fullPrompt,
    number: 1,
    key,
    model,
    apiEndpoint,
  });
  return {
    readScript: readData(stream, ...shellCodeExclusions),
    readInfo: readData(stream, ...shellCodeExclusions),
  };
}

export async function generateCompletion({
  prompt,
  number = 1,
  key,
  model,
  apiEndpoint,
}: {
  prompt: string | ChatCompletionMessageParam[];
  number?: number;
  model?: string;
  key: string;
  apiEndpoint: string;
}) {
  const client = getApiClient(key, apiEndpoint);
  try {
    const completion = await client.chat.completions.create(
      {
        model: model || 'gpt-4o-mini',
        messages: Array.isArray(prompt)
          ? prompt
          : [{ role: 'user', content: prompt }],
        n: Math.min(number, 10),
        stream: true,
      },
      requestOptions
    );

    return completion;
  } catch (err) {
    if (err instanceof APIConnectionError) {
      throw new KnownError(
        `Error connecting to ${apiEndpoint}. Is the endpoint reachable and are you connected to the internet?\n${err.message}`
      );
    }

    if (err instanceof APIError) {
      const messageString = err.error
        ? JSON.stringify(err.error, null, 2)
        : err.message;
      if (err.status === 429) {
        throw new KnownError(
          dedent`
          Request failed with status 429 (rate limit or quota exceeded). This is usually due to an incorrect billing setup or excessive quota usage at your provider.

          Check your API key and plan at the provider configured in API_ENDPOINT.

          Full message from the API:
        ` +
            '\n\n' +
            messageString +
            '\n'
        );
      }
      const authHint =
        err.status === 401
          ? '\n' +
            'Your API key does not match this endpoint. The key may belong to a different provider.\n' +
            `Current endpoint: ${apiEndpoint}\n` +
            'Fix it with `ai config` (provider setup) or set API_ENDPOINT in ~/.ai-shell.'
          : '';
      throw new KnownError(
        dedent`
        Request to the API failed with status ${err.status}:
      ` +
          '\n\n' +
          messageString +
          authHint +
          '\n'
      );
    }

    throw err instanceof Error ? new KnownError(err.message) : err;
  }
}

// Minimal non-streaming completion used by `ai config test` and the wizard.
export async function testConnection(
  key: string,
  apiEndpoint: string,
  model: string
): Promise<void> {
  const client = getApiClient(key, apiEndpoint);
  try {
    await client.chat.completions.create(
      {
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      },
      requestOptions
    );
  } catch (err) {
    if (err instanceof APIError) {
      throw new KnownError(
        `HTTP ${err.status}: ${
          err.error ? JSON.stringify(err.error) : err.message
        }`
      );
    }
    if (err instanceof APIConnectionError) {
      throw new KnownError(`Could not reach ${apiEndpoint}: ${err.message}`);
    }
    throw err instanceof Error ? new KnownError(err.message) : err;
  }
}

export async function getExplanation({
  script,
  key,
  model,
  apiEndpoint,
}: {
  script: string;
  key: string;
  model?: string;
  apiEndpoint: string;
}) {
  const prompt = getExplanationPrompt(script);
  const stream = await generateCompletion({
    prompt,
    key,
    number: 1,
    model,
    apiEndpoint,
  });
  return { readExplanation: readData(stream) };
}

export async function getRevision({
  prompt,
  code,
  key,
  model,
  apiEndpoint,
}: {
  prompt: string;
  code: string;
  key: string;
  model?: string;
  apiEndpoint: string;
}) {
  const fullPrompt = getRevisionPrompt(prompt, code);
  const stream = await generateCompletion({
    prompt: fullPrompt,
    key,
    number: 1,
    model,
    apiEndpoint,
  });
  return {
    readScript: readData(stream, ...shellCodeExclusions),
  };
}

export const readData =
  (
    chunkStream: AsyncIterable<ChatCompletionChunk>,
    ...excluded: (RegExp | string | undefined)[]
  ) =>
  (writer: (data: string) => void): Promise<string> => {
    const { promise, resolve } = Promise.withResolvers<string>();

    (async () => {
      let stopTextStream = false;
      let data = '';
      let dataStart = false;
      let buffer = ''; // holds incoming content only until the start marker is detected

      const [excludedPrefix] = excluded;
      const stopTextStreamKeys = ['q', 'escape']; // keys that stop the text stream

      const rl = readline.createInterface({
        input: process.stdin,
      });

      process.stdin.setRawMode(true);

      process.stdin.on('keypress', (_key, keyData) => {
        if (stopTextStreamKeys.includes(keyData.name)) {
          stopTextStream = true;
        }
      });

      for await (const chunk of chunkStream) {
        if (stopTextStream) {
          break;
        }
        const content = chunk.choices[0]?.delta?.content ?? '';

        if (!dataStart) {
          buffer += content;
          if (buffer.match(excludedPrefix ?? '')) {
            dataStart = true;
            buffer = '';
            // The delta that completes the opening fence is not part of the
            // output. With no marker to wait for, write it through.
            if (excludedPrefix) continue;
          }
        }

        if (dataStart && content) {
          const contentWithoutExcluded = stripRegexPatterns(content, excluded);

          data += contentWithoutExcluded;
          writer(contentWithoutExcluded);
        }
      }

      rl.close();
      resolve(data);
    })();

    return promise;
  };

function getExplanationPrompt(script: string) {
  return dedent`
    ${explainScript} Please reply in ${i18n.getCurrentLanguagenName()}

    The script: ${script}
  `;
}

function getShellDetails() {
  const shellDetails = detectShell();

  return dedent`
      The target shell is ${shellDetails}
  `;
}
const shellDetails = getShellDetails();

const explainScript = dedent`
  Please provide a clear, concise description of the script, using minimal words. Outline the steps in a list format.
`;

function getOperationSystemDetails() {
  const os = require('@nexssp/os/legacy');
  return os.name();
}
const generationDetails = dedent`
    Only reply with the single line command surrounded by three backticks. It must be able to be directly run in the target shell. Do not include any other text.

    Make sure the command runs on ${getOperationSystemDetails()} operating system.
  `;

function getFullPrompt(prompt: string) {
  return dedent`
    Create a single line command that one can enter in a terminal and run, based on what is specified in the prompt.

    ${shellDetails}

    ${generationDetails}

    ${explainInSecondRequest ? '' : explainScript}

    The prompt is: ${prompt}
  `;
}

function getRevisionPrompt(prompt: string, code: string) {
  return dedent`
    Update the following script based on what is asked in the following prompt.

    The script: ${code}

    The prompt: ${prompt}

    ${generationDetails}
  `;
}

export async function getModels(
  key: string,
  apiEndpoint: string
): Promise<OpenAI.Model[]> {
  const client = getApiClient(key, apiEndpoint);
  const response = await client.models.list(requestOptions);

  return response.data.filter((model) => model.object === 'model');
}
