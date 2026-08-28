import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ini from 'ini';
import type { TiktokenModel } from '@dqbd/tiktoken';
import { commandName } from './constants';
import { KnownError, handleCliError } from './error';
import * as p from '@clack/prompts';
import { red } from 'kolorist';
import i18n from './i18n';
import { getModels } from './completion';
import { Model } from 'openai';
import { runProviderWizard } from './providers';

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: unknown, key: PropertyKey) =>
  hasOwnProperty.call(object, key);

const languagesOptions = Object.entries(i18n.languages).map(([key, value]) => ({
  value: key,
  label: value,
}));

const parseAssert = (name: string, condition: any, message: string) => {
  if (!condition) {
    throw new KnownError(
      `${i18n.t('Invalid config property')} ${name}: ${message}`
    );
  }
};

const configParsers = {
  API_KEY(key?: string) {
    if (!key) {
      throw new KnownError(
        i18n.t(
          'Please set your API key via `ai config set API_KEY=<your token>`'
        )
      );
    }

    return key;
  },
  MODEL(model?: string) {
    if (!model || model.length === 0) {
      return 'gpt-4o-mini';
    }

    return model as TiktokenModel;
  },
  SILENT_MODE(mode?: string) {
    return String(mode).toLowerCase() === 'true';
  },
  API_ENDPOINT(apiEndpoint?: string) {
    return apiEndpoint || 'https://api.openai.com/v1';
  },
  LANGUAGE(language?: string) {
    return language || 'en';
  },
  // Free-form label for the chosen provider (openai, nan, ollama...).
  PROVIDER(provider?: string) {
    return provider || '';
  },
  // Glyph style for the action selector: plain (default) or nerd (Nerd Font)
  ICONS(icons?: string) {
    return icons === 'nerd' ? 'nerd' : 'plain';
  },
} as const;

type ConfigKeys = keyof typeof configParsers;

type RawConfig = {
  [key in ConfigKeys | keyof typeof legacyKeyNames]?: string;
};

type ValidConfig = {
  [Key in ConfigKeys]: ReturnType<(typeof configParsers)[Key]>;
};

const configPath = path.join(os.homedir(), '.ai-shell');

// Legacy OpenAI-named INI keys, still read for compatibility (writes use the new names)
const legacyKeyNames = {
  OPENAI_KEY: 'API_KEY',
  OPENAI_API_ENDPOINT: 'API_ENDPOINT',
} as const;

// Raw, unparsed user file (with legacy names already mapped). Used by the
// provider wizard to pre-fill values without tripping over a missing key.
export const readUserConfig = async (): Promise<RawConfig> => readConfigFile();
const fileExists = (filePath: string) =>
  fs.lstat(filePath).then(
    () => true,
    () => false
  );

const readConfigFile = async (): Promise<RawConfig> => {
  const merged: Record<string, string | undefined> = Object.create(null);
  if (await fileExists(configPath)) {
    Object.assign(merged, ini.parse(await fs.readFile(configPath, 'utf8')));
  }

  const config: RawConfig = Object.create(null);
  // Current key names always win
  for (const key of Object.keys(configParsers) as ConfigKeys[]) {
    if (merged[key]) {
      config[key] = merged[key];
    }
  }
  // Legacy OPENAI_* names fill in what is still unset
  for (const [legacyKey, newKey] of Object.entries(legacyKeyNames)) {
    if (!config[newKey] && merged[legacyKey]) {
      config[newKey] = merged[legacyKey];
    }
  }
  return config;
};

export const getConfig = async (
  cliConfig?: RawConfig
): Promise<ValidConfig> => {
  const config = await readConfigFile();
  const parsedConfig: Record<string, unknown> = {};

  for (const key of Object.keys(configParsers) as ConfigKeys[]) {
    const parser = configParsers[key];
    const value = cliConfig?.[key] ?? config[key];
    parsedConfig[key] = parser(value);
  }

  return parsedConfig as ValidConfig;
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const config = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!hasOwn(configParsers, key)) {
      throw new KnownError(`${i18n.t('Invalid config property')}: ${key}`);
    }

    const parsed = configParsers[key as ConfigKeys](value);
    config[key as ConfigKeys] = String(parsed);
  }

  await fs.writeFile(configPath, ini.stringify(config), 'utf8');
};

export const showConfigUI = async () => {
  try {
    const config = await getConfig();
    const choice = (await p.select({
      message: i18n.t('Set config') + ':',
      options: [
        {
          label: i18n.t('Provider'),
          value: 'provider',
          hint: hasOwn(config, 'PROVIDER')
            ? config.PROVIDER
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('API Key'),
          value: 'API_KEY',
          hint: hasOwn(config, 'API_KEY')
            ? // Obfuscate the key
              'sk-...' + config.API_KEY.slice(-3)
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('API Endpoint'),
          value: 'API_ENDPOINT',
          hint: hasOwn(config, 'API_ENDPOINT')
            ? config.API_ENDPOINT
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Silent Mode'),
          value: 'SILENT_MODE',
          hint: hasOwn(config, 'SILENT_MODE')
            ? config.SILENT_MODE.toString()
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Model'),
          value: 'MODEL',
          hint: hasOwn(config, 'MODEL') ? config.MODEL : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Icons'),
          value: 'icons',
          hint: config.ICONS,
        },
        {
          label: i18n.t('Language'),
          value: 'LANGUAGE',
          hint: hasOwn(config, 'LANGUAGE')
            ? config.LANGUAGE
            : i18n.t('(not set)'),
        },
        {
          label: i18n.t('Cancel'),
          value: 'cancel',
          hint: i18n.t('Exit the program'),
        },
      ],
    })) as ConfigKeys | 'provider' | 'icons' | 'cancel' | symbol;

    if (p.isCancel(choice)) return;

    if (choice === 'provider') {
      await runProviderWizard();
      return;
    }

    if (choice === 'API_KEY') {
      const key = await p.text({
        message: i18n.t('Enter your API key'),
        validate: (value) => {
          if (!value) {
            return i18n.t('Please enter a key');
          }
        },
      });
      if (p.isCancel(key)) return;
      await setConfigs([['API_KEY', key]]);
    } else if (choice === 'API_ENDPOINT') {
      const apiEndpoint = await p.text({
        message: i18n.t('Enter your API Endpoint'),
      });
      if (p.isCancel(apiEndpoint)) return;
      await setConfigs([['API_ENDPOINT', apiEndpoint]]);
    } else if (choice === 'SILENT_MODE') {
      const silentMode = await p.confirm({
        message: i18n.t('Enable silent mode?'),
      });
      if (p.isCancel(silentMode)) return;
      await setConfigs([['SILENT_MODE', silentMode ? 'true' : 'false']]);
    } else if (choice === 'MODEL') {
      const { API_KEY: key, API_ENDPOINT: apiEndpoint } = await getConfig();
      const models = await getModels(key, apiEndpoint);
      const model = (await p.select({
        message: 'Pick a model.',
        options: models.map((m: Model) => {
          return { value: m.id, label: m.id };
        }),
      })) as string;

      if (p.isCancel(model)) return;
      await setConfigs([['MODEL', model]]);
    } else if (choice === 'icons') {
      const icons = (await p.select({
        message: i18n.t('Icon style for the action menu'),
        options: [
          {
            value: 'plain',
            label: 'Plain',
            hint: i18n.t('No glyphs; the cursor and color mark the selection'),
          },
          {
            value: 'nerd',
            label: 'Nerd Font',
            hint: i18n.t(
              'Requires a patched font (brew install font-jetbrainsmono-nerd-font)'
            ),
          },
        ],
      })) as string;
      if (p.isCancel(icons)) return;
      await setConfigs([['ICONS', icons]]);
    } else if (choice === 'LANGUAGE') {
      const language = (await p.select({
        message: i18n.t('Enter the language you want to use'),
        options: languagesOptions,
      })) as string;
      if (p.isCancel(language)) return;
      await setConfigs([['LANGUAGE', language]]);
      i18n.setLanguage(language);
    }
    if (choice === 'cancel') return;
    showConfigUI();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n${red('✖')} ${message}`);
    handleCliError(error);
    process.exit(1);
  }
};
