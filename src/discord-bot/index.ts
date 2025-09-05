import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction } from 'discord.js';
import { handleStart } from './handlers/start';
import { handleHelp } from './handlers/help';
import { handleLinkSleeper } from './handlers/link-sleeper';
import { handleLeagues } from './handlers/leagues';
import { handleToday } from './handlers/today';
import { handleTimezone } from './handlers/timezone';
import { handleFeedback } from './handlers/feedback';
import { handleLanguage } from './handlers/language';
import { t } from '../i18n';
import pino from 'pino';

const logger = pino({ name: 'discord-bot' });

export class DiscordBot {
  private client: Client;
  private readonly token: string;
  private readonly clientId: string;

  constructor(token: string, clientId: string) {
    this.token = token;
    this.clientId = clientId;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
    });
    
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.client.on('ready', () => {
      logger.info(`Discord bot logged in as ${this.client.user?.tag}!`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        switch (interaction.commandName) {
          case 'start':
            await handleStart(interaction);
            break;
          case 'help':
            await handleHelp(interaction);
            break;
          case 'link_sleeper':
            await handleLinkSleeper(interaction);
            break;
          case 'leagues':
            await handleLeagues(interaction);
            break;
          case 'today':
            await handleToday(interaction);
            break;
          case 'timezone':
            await handleTimezone(interaction);
            break;
          case 'feedback':
            await handleFeedback(interaction);
            break;
          case 'lang':
            await handleLanguage(interaction);
            break;
          default:
            await interaction.reply({
              content: t('error_generic', {}, 'en'),
              ephemeral: true,
            });
        }
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : error,
          userId: interaction.user.id,
          guildId: interaction.guildId,
          command: interaction.commandName,
        }, 'Discord command error');

        const content = t('error_generic', {}, 'en');
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      }
    });

    logger.info('Discord bot handlers setup completed');
  }

  private setupErrorHandling(): void {
    this.client.on('error', (error) => {
      logger.error({
        error: error.message,
        stack: error.stack,
      }, 'Discord client error');
    });

    // Handle process errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        reason,
        promise,
      }, 'Unhandled rejection in Discord bot');
    });

    process.on('uncaughtException', (error) => {
      logger.error({
        error: error.message,
        stack: error.stack,
      }, 'Uncaught exception in Discord bot');
      
      // Graceful shutdown
      this.stop().then(() => {
        process.exit(1);
      });
    });
  }

  /**
   * Register slash commands
   */
  async registerCommands(): Promise<void> {
    const commands = [
      new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start using the bot'),
        
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information'),
        
      new SlashCommandBuilder()
        .setName('link_sleeper')
        .setDescription('Link your Sleeper account')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('Your Sleeper username')
            .setRequired(true)
        ),
        
      new SlashCommandBuilder()
        .setName('leagues')
        .setDescription('Show your leagues and settings'),
        
      new SlashCommandBuilder()
        .setName('today')
        .setDescription('Get current week digest'),
        
      new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Set your timezone')
        .addStringOption(option =>
          option.setName('timezone')
            .setDescription('Your timezone (e.g., Europe/Kiev, America/New_York)')
            .setRequired(false)
        ),
        
      new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send feedback to developers')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Your feedback message')
            .setRequired(true)
        ),
        
      new SlashCommandBuilder()
        .setName('lang')
        .setDescription('Change language')
        .addStringOption(option =>
          option.setName('language')
            .setDescription('Choose language')
            .setRequired(false)
            .addChoices(
              { name: 'English', value: 'en' },
              { name: 'Українська', value: 'uk' }
            )
        ),
    ];

    const rest = new REST().setToken(this.token);

    try {
      logger.info('Started refreshing Discord application (/) commands.');

      await rest.put(
        Routes.applicationCommands(this.clientId),
        { body: commands }
      );

      logger.info('Successfully reloaded Discord application (/) commands.');
    } catch (error) {
      logger.error('Error registering Discord commands:', error);
      throw error;
    }
  }

  /**
   * Start Discord bot
   */
  async start(): Promise<void> {
    try {
      await this.client.login(this.token);
      logger.info('Discord bot started successfully');
    } catch (error) {
      logger.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  /**
   * Stop Discord bot gracefully
   */
  async stop(): Promise<void> {
    try {
      this.client.destroy();
      logger.info('Discord bot stopped gracefully');
    } catch (error) {
      logger.error('Error stopping Discord bot:', error);
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(userId: string, message: string, options?: any): Promise<void> {
    try {
      const user = await this.client.users.fetch(userId);
      await user.send({ content: message, ...options });
    } catch (error) {
      logger.error({
        userId,
        message: message.substring(0, 100),
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send Discord message');
      throw error;
    }
  }

  /**
   * Send digest messages to user
   */
  async sendDigestToUser(userId: string, digests: Array<{ message: string }>): Promise<void> {
    try {
      const user = await this.client.users.fetch(userId);
      
      for (const digest of digests) {
        await user.send({ content: digest.message });
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info({
        userId,
        digestsCount: digests.length,
      }, 'Discord digest sent to user');

    } catch (error) {
      logger.error({
        userId,
        digestsCount: digests.length,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send Discord digest to user');
    }
  }

  /**
   * Get bot info
   */
  getBotInfo(): any {
    return {
      id: this.client.user?.id,
      username: this.client.user?.username,
      tag: this.client.user?.tag,
    };
  }
}