import * as p from '@clack/prompts';
import { cyan, dim, green, red } from 'kolorist';
import { setConfigs, readUserConfig } from './config';
import { KnownError } from './error';
import i18n from './i18n';
import { getModels, testConnection } from './completion';

export type ProviderPreset = {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  // where to get a key; null means the provider does not check it (local servers)
  keyHint: string | null;
};

// All OpenAI-compatible. `model` is only a suggestion: the wizard lists the
// real models from GET /v1/models when the endpoint exposes them.
export const presets: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHint: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'nan',
    label: 'NaN Builders',
    endpoint: 'https://api.nan.builders/v1',
    model: 'qwen3.8-flash',
    keyHint: 'https://cloud.nan.builders/',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
    keyHint: 'https://openrouter.ai/keys',
  },
  {
    id: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyHint: 'https://console.groq.com/keys',
  },
  {
    id: 'together',
    label: 'Together AI',
    endpoint: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    keyHint: 'https://api.together.xyz/settings/api-keys',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    endpoint: 'http://localhost:11434/v1',
    model: 'llama3.2',
    keyHint: null,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    endpoint: 'http://localhost:1234/v1',
    model: 'local-model',
    keyHint: null,
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp server (local)',
    endpoint: 'http://localhost:8080/v1',
    model: 'qwen2.5',
    keyHint: null,
  },
  {
    id: 'custom',
    label: 'Custom / other endpoint',
    endpoint: '',
    model: '',
    keyHint: null,
  },
];

export const findPreset = (id: string): ProviderPreset | undefined =>
  presets.find((preset) => preset.id === id);

const cancel = () => p.cancel(i18n.t('Goodbye!'));

export const runProviderWizard = async (): Promise<void> => {
  p.intro(cyan(i18n.t('Provider setup')));

  const providerId = (await p.select({
    message: i18n.t('Who is powering your AI Shell?'),
    options: presets.map((preset) => ({
      value: preset.id,
      label: preset.label,
      hint: preset.endpoint || undefined,
    })),
  })) as string | symbol;
  if (p.isCancel(providerId)) return cancel();
  const preset = findPreset(providerId as string)!;

  const endpointInput = (await p.text({
    message: i18n.t('Enter your API Endpoint'),
    initialValue: preset.endpoint || undefined,
    placeholder: 'https://my-proxy.example.com/v1',
    validate: (value) => {
      if (!value) return i18n.t('Please enter an endpoint');
      if (!/^https?:\/\//.test(value))
        return i18n.t('The endpoint must start with http:// or https://');
    },
  })) as string | symbol;
  if (p.isCancel(endpointInput)) return cancel();
  const endpoint = endpointInput as string;

  // pre-fill the saved key so switching provider does not lose it
  const saved = await readUserConfig();
  let key: string | symbol;
  if (preset.keyHint === null) {
    key = (await p.text({
      message: i18n.t('Enter your API key'),
      placeholder: i18n.t('Local server: any value works, e.g. "local"'),
      initialValue: saved.API_KEY || 'local',
    })) as string | symbol;
  } else {
    key = (await p.text({
      message: i18n.t('Enter your API key'),
      placeholder: preset.keyHint || undefined,
      initialValue: saved.API_KEY || undefined,
      validate: (value) => {
        if (!value) return i18n.t('Please enter a key');
      },
    })) as string | symbol;
  }

  // list real models from the endpoint; fall back to manual entry
  const models = await (async () => {
    const spin = p.spinner();
    spin.start(i18n.t('Loading models...'));
    try {
      const result = await getModels(key as string, endpoint);
      spin.stop(i18n.t('Models loaded'));
      return result.map((model) => model.id).sort();
    } catch {
      spin.stop(dim(i18n.t('Endpoint does not list models')));
      return null;
    }
  })();

  let model: string | symbol;
  if (models && models.length > 0) {
    model = (await p.select({
      message: i18n.t('Pick a model'),
      options: models.map((id) => ({ value: id, label: id })),
    })) as string | symbol;
  } else {
    model = (await p.text({
      message: i18n.t('Model id'),
      initialValue: preset.model || undefined,
      validate: (value) => {
        if (!value) return i18n.t('Please enter a model id');
      },
    })) as string | symbol;
  }
  if (p.isCancel(model)) return cancel();

  const spin = p.spinner();
  spin.start(i18n.t('Testing the connection...'));
  let testedOk = false;
  try {
    await testConnection(key as string, endpoint, model as string);
    spin.stop(green(`✓ ${i18n.t('Connection OK')}`));
    testedOk = true;
  } catch (error) {
    spin.stop(red(`✖ ${i18n.t('Connection test failed')}`));
    const message = error instanceof Error ? error.message : String(error);
    console.error(dim(message.split('\n').slice(0, 6).join('\n')));
    const keep = await p.confirm({
      message: i18n.t('Save this configuration anyway?'),
      initialValue: false,
    });
    if (p.isCancel(keep) || !keep) {
      return p.cancel(i18n.t('Nothing was saved.'));
    }
  }

  await setConfigs([
    ['PROVIDER', preset.id],
    ['API_ENDPOINT', endpoint],
    ['API_KEY', key as string],
    ['MODEL', model as string],
  ]);

  p.outro(
    `${green('✓')} ${preset.label} · ${endpoint} · ${model}${
      testedOk ? '' : dim(` (${i18n.t('not tested')})`)
    }`
  );
  console.log(dim(i18n.t('Saved to ~/.ai-shell')));
};

export const testCurrentConfig = async (): Promise<void> => {
  const saved = await readUserConfig();
  if (!saved.API_KEY) {
    throw new KnownError(
      i18n.t('No API key configured. Run `ai config` first.')
    );
  }
  const spin = p.spinner();
  spin.start(i18n.t('Testing the connection...'));
  try {
    await testConnection(
      saved.API_KEY,
      saved.API_ENDPOINT || 'https://api.openai.com/v1',
      saved.MODEL || 'gpt-4o-mini'
    );
    spin.stop(green(`✓ ${i18n.t('Connection OK')}`));
    console.log(
      dim(
        `${saved.PROVIDER || 'custom'} · ${
          saved.API_ENDPOINT || 'https://api.openai.com/v1'
        } · ${saved.MODEL || 'gpt-4o-mini'}`
      )
    );
  } catch (error) {
    spin.stop(red(`✖ ${i18n.t('Connection test failed')}`));
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
};
