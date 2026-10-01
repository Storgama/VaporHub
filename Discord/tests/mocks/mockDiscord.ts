import { vi } from 'vitest';

export interface MockInteractionOptions {
    commandName?: string;
    user?: { id: string; username: string };
    guildId?: string;
    channelId?: string;
    options?: Record<string, unknown>;
}

export function createMockInteraction(opts: MockInteractionOptions = {}) {
    const replyFn = vi.fn().mockResolvedValue(undefined);
    const deferReplyFn = vi.fn().mockResolvedValue(undefined);
    const editReplyFn = vi.fn().mockResolvedValue(undefined);

    return {
        commandName: opts.commandName || 'test',
        guildId: opts.guildId || 'guild_123',
        channelId: opts.channelId || 'channel_456',
        user: opts.user || { id: 'user_789', username: 'TestUser' },
        options: {
            getString: vi.fn((name: string) => (opts.options?.[name] as string) || null),
            getInteger: vi.fn((name: string) => (opts.options?.[name] as number) || null),
            getBoolean: vi.fn((name: string) => (opts.options?.[name] as boolean) || null),
            getChannel: vi.fn((name: string) => opts.options?.[name] || null),
            getRole: vi.fn((name: string) => opts.options?.[name] || null)
        },
        reply: replyFn,
        deferReply: deferReplyFn,
        editReply: editReplyFn,
        replied: false,
        deferred: false
    };
}

export function createMockChannel(id: string = 'chan_1', name: string = 'annonces-live') {
    return {
        id,
        name,
        isTextBased: () => true,
        send: vi.fn().mockResolvedValue({ id: 'msg_sent_123' })
    };
}

