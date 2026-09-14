export type ChatPlatform = 'twitch' | 'youtube' | 'all' | 'system';

export interface ChatAuthor {
    id?: string;
    name: string;
    color?: string;
    avatar?: string;
    badges?: string[];
    isBanned?: boolean;
}

export interface ChatMessage {
    id: string;
    platform: ChatPlatform;
    author: ChatAuthor;
    content: string;
    timestamp: string;
    isDeleted?: boolean;
    gifUrl?: string;
}

export interface ResolvedBadge {
    label: string;
    imageUrl: string;
}

export type ParsedChatToken = 
    | { type: 'text'; text: string }
    | { type: 'emote'; code: string; url: string };

export interface SendMessagePayload {
    content: string;
    platform: ChatPlatform;
}

export interface TimeoutUserPayload {
    userId?: string;
    username: string;
    duration: number;
}

export interface BanUserPayload {
    userId?: string;
    username: string;
}
