import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatIntent } from '../types/chatbot.types';
import { EntityExtraction } from './intent-router.service';
import { PendingAction } from '../types/chatbot.types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  conversationId: string;
  lastIntent: ChatIntent | null;
  entities: EntityExtraction;
  recentMessages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  pendingAction?: PendingAction | null;
}

export interface ConversationUpdate {
  lastIntent: ChatIntent;
  entities: EntityExtraction;
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: PendingAction | null;
}

const MAX_MESSAGES = 10;
const EXPIRATION_MS = 60 * 60 * 1000; // 60 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

@Injectable()
export class ConversationService implements OnModuleDestroy {
  private readonly logger = new Logger(ConversationService.name);
  private readonly conversations = new Map<string, Conversation>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Load an existing conversation if a valid conversationId is supplied,
   * otherwise create a new one with a generated UUID.
   */
  async getOrCreateConversation(conversationId?: string): Promise<Conversation> {
    if (conversationId && this.conversations.has(conversationId)) {
      const conversation = this.conversations.get(conversationId) as Conversation;
      conversation.updatedAt = new Date();
      return conversation;
    }

    const now = new Date();
    const convId = conversationId ?? randomUUID();
    const newConversation: Conversation = {
      conversationId: convId,
      lastIntent: null,
      entities: {},
      recentMessages: [],
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(convId, newConversation);
    this.logger.log(
      `Created new conversation: ${newConversation.conversationId} at ${now.toISOString()}`,
    );
    return newConversation;
  }

  /**
   * Merge newly extracted entities into the existing conversation context.
   * - Explicit values replace old values.
   * - Missing values do not erase existing values.
   * - Symptoms merge uniquely.
   * - Preserve specialty, disease, doctorName, timePreference unless explicitly replaced.
   */
  private mergeEntities(
    existing: EntityExtraction,
    incoming: EntityExtraction,
  ): EntityExtraction {
    const merged: EntityExtraction = { ...existing };

    if (Array.isArray(incoming.symptoms)) {
      const symptomSet = new Set<string>(merged.symptoms ?? []);
      for (const symptom of incoming.symptoms) {
        symptomSet.add(symptom);
      }
      merged.symptoms = Array.from(symptomSet);
    }

    if (incoming.disease !== undefined) merged.disease = incoming.disease;
    if (incoming.specialty !== undefined) merged.specialty = incoming.specialty;
    if (incoming.doctorName !== undefined) merged.doctorName = incoming.doctorName;
    if (incoming.timePreference !== undefined) {
      merged.timePreference = incoming.timePreference;
    }
    if (incoming.latitude !== undefined) merged.latitude = incoming.latitude;
    if (incoming.longitude !== undefined) merged.longitude = incoming.longitude;

    return merged;
  }

  /**
   * Update an existing conversation with new intent, entities, and a chat message.
   */
  async updateConversation(
    conversationId: string,
    update: ConversationUpdate,
  ): Promise<void> {
    const conversation = await this.getOrCreateConversation(conversationId);
    conversation.entities = this.mergeEntities(conversation.entities, update.entities);
    conversation.lastIntent = update.lastIntent;
    conversation.updatedAt = new Date();

    if (update.pendingAction !== undefined) {
      conversation.pendingAction = update.pendingAction;
    }

    conversation.recentMessages.push({
      role: update.role,
      content: update.content,
      timestamp: new Date(),
    });

    if (conversation.recentMessages.length > MAX_MESSAGES) {
      conversation.recentMessages = conversation.recentMessages.slice(-MAX_MESSAGES);
    }
  }

  async setPendingAction(
    conversationId: string,
    pendingAction: PendingAction,
  ): Promise<void> {
    const conversation = await this.getOrCreateConversation(conversationId);
    conversation.pendingAction = {
      ...pendingAction,
      expiresAt: pendingAction.expiresAt,
    };
  }

  async clearPendingAction(conversationId: string): Promise<void> {
    const conversation = await this.getOrCreateConversation(conversationId);
    conversation.pendingAction = null;
  }

  async getPendingAction(conversationId: string): Promise<PendingAction | null> {
    const conversation = await this.getOrCreateConversation(conversationId);
    const action = conversation.pendingAction;
    if (!action) return null;
    if (action.expiresAt && action.expiresAt.getTime() < Date.now()) {
      conversation.pendingAction = null;
      return null;
    }
    return action;
  }

  /**
   * Start periodic cleanup of expired conversations.
   */
  startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Remove conversations that have been inactive for longer than the expiration window.
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [id, conversation] of this.conversations.entries()) {
      if (now - conversation.updatedAt.getTime() > EXPIRATION_MS) {
        this.conversations.delete(id);
        this.logger.log(`Expired conversation: ${id}`);
      }
    }
  }

  /**
   * Stop the periodic cleanup interval.
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  onModuleDestroy(): void {
    this.stopCleanup();
  }
}
