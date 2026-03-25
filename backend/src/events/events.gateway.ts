import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { parse as parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { CommunicationService } from '../communication/communication.service';
import { EventsService } from './events.service';
import { UsersService } from '../users/users.service';

type SocketJwtPayload = {
  sub: number;
  username: string;
  role: 'admin' | 'user';
};

type AuthenticatedUser = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

type OnlineUser = {
  userId: number;
  username: string;
};

const allowedFrontendOrigins = [
  /^https?:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1:\d+$/,
  /^https?:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/,
  /^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(app|dev)$/i,
];

@WebSocketGateway({
  cors: {
    origin: allowedFrontendOrigins,
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly socketsByUserId = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventsService: EventsService,
    private readonly communicationService: CommunicationService,
    private readonly usersService: UsersService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.emit('error', 'Missing token');
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<SocketJwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'dev_secret_change_me',
      });

      client.data.user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      };

      this.trackSocket(payload.sub, client.id);
      client.emit('connected', client.data.user);
      this.emitOnlineUsers();
    } catch {
      client.emit('error', 'Unauthorized');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user) {
      return;
    }

    this.untrackSocket(user.userId, client.id);
    this.emitOnlineUsers();
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomKey?: string; roomName?: string },
  ) {
    const roomKey = body?.roomKey?.trim();
    if (!roomKey) {
      client.emit('error', 'roomKey is required');
      return;
    }

    const user = this.getUser(client);
    const room = await this.eventsService.getRoomByKey(roomKey);
    if (!room) {
      client.emit('error', 'Group not found');
      return;
    }

    const hasAccess = await this.eventsService.userHasRoomAccess({
      roomKey,
      userId: user.userId,
    });
    if (!hasAccess && user.role !== 'admin') {
      client.emit('error', 'Unauthorized group access');
      return;
    }

    await client.join(room.key);
    const messages = await this.eventsService.getRecentMessages(room.key);

    client.emit('room_joined', { room: { key: room.key, name: room.name }, messages });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomKey?: string; content?: string; replyToMessageId?: string },
  ) {
    const roomKey = body?.roomKey?.trim();
    const content = body?.content?.trim();
    if (!roomKey || !content) {
      client.emit('error', 'roomKey and content are required');
      return;
    }

    const user = this.getUser(client);
    const room = await this.eventsService.getRoomByKey(roomKey);
    if (!room) {
      client.emit('error', 'Group not found');
      return;
    }

    const hasAccess = await this.eventsService.userHasRoomAccess({
      roomKey,
      userId: user.userId,
    });
    if (!hasAccess && user.role !== 'admin') {
      client.emit('error', 'Unauthorized room access');
      return;
    }

    const participants = await this.eventsService.getRoomParticipantUsernames(roomKey);
    for (const participantUsername of participants) {
      if (participantUsername === user.username) {
        continue;
      }

      const allowed = await this.communicationService.canUsersCommunicate(
        user.username,
        participantUsername,
      );
      if (!allowed) {
        client.emit('error', `Messaging is blocked between ${user.username} and ${participantUsername}`);
        return;
      }
    }

    const message = await this.eventsService.createMessage({
      roomKey,
      content,
      sender: user,
      replyToMessageId: body.replyToMessageId?.trim(),
    });

    this.server.to(roomKey).emit('receive_message', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomKey?: string; isTyping?: boolean },
  ) {
    const roomKey = body?.roomKey?.trim();
    if (!roomKey) {
      return;
    }

    client.to(roomKey).emit('typing', {
      roomKey,
      isTyping: Boolean(body?.isTyping),
      user: this.getUser(client),
    });
  }

  @SubscribeMessage('read_receipt')
  async handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId?: string; status?: 'DELIVERED' | 'READ' },
  ) {
    const messageId = body?.messageId?.trim();
    if (!messageId || !body?.status) {
      return;
    }

    const receipt = await this.eventsService.acknowledgeReceipt({
      messageId,
      status: body.status,
      user: this.getUser(client),
    });

    this.server.to(receipt.roomKey).emit('read_receipt', receipt);
  }

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId?: string; emoji?: string },
  ) {
    const messageId = body?.messageId?.trim();
    const emoji = body?.emoji?.trim();
    if (!messageId || !emoji) {
      return;
    }

    const updated = await this.eventsService.toggleReaction({
      messageId,
      emoji,
      user: this.getUser(client),
    });

    if (!updated) {
      client.emit('error', 'Unable to add reaction');
      return;
    }

    this.server.to(updated.roomKey).emit('reaction_update', {
      messageId: updated.messageId,
      reactions: updated.reactions,
    });
  }

  @SubscribeMessage('call_user')
  async handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { targetUserId?: number; targetUsername?: string; roomKey?: string; callType?: 'voice' | 'video' },
  ) {
    const from = this.getUser(client);
    let targetUserId: number | undefined;
    let targetUsername: string | undefined;

    if (body?.targetUserId) {
      targetUserId = Number(body.targetUserId);
      const targetUser = this.usersService.findOneById(targetUserId);
      targetUsername = targetUser?.username;
    } else if (body?.targetUsername) {
      targetUsername = body.targetUsername.trim();
      const targetUser = this.usersService.findByUsername(targetUsername);
      targetUserId = targetUser?.userId;
    }

    if (!targetUserId || !targetUsername) {
      client.emit('error', 'Target user not found');
      return;
    }

    if (targetUserId === from.userId) {
      client.emit('error', 'Cannot call yourself');
      return;
    }

    const targetSocketIds = this.getSocketIds(targetUserId);
    if (targetSocketIds.length === 0) {
      client.emit('reject_call', { byUserId: targetUserId, reason: 'User is offline' });
      return;
    }

    const targetSocket = this.server.sockets.sockets.get(targetSocketIds[0]);
    const targetUser = targetSocket?.data?.user as AuthenticatedUser | undefined;
    if (!targetUser) {
      client.emit('reject_call', { byUserId: targetUserId, reason: 'Target user unavailable' });
      return;
    }

    const allowed = await this.communicationService.canUsersCommunicate(
      from.username,
      targetUser.username,
    );
    if (!allowed) {
      client.emit('reject_call', {
        byUserId: targetUserId,
        reason: `Calling is blocked between ${from.username} and ${targetUser.username}`,
      });
      return;
    }

    const payload = {
      fromUserId: from.userId,
      fromUsername: from.username,
      roomKey: body?.roomKey?.trim() ?? '',
      callType: body?.callType === 'voice' ? 'voice' : 'video',
    };

    for (const socketId of targetSocketIds) {
      this.server.to(socketId).emit('receive_call', payload);
    }
  }

  @SubscribeMessage('accept_call')
  handleAcceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { targetUserId?: number },
  ) {
    this.forwardToUser(body?.targetUserId, 'accept_call', {
      fromUserId: this.getUser(client).userId,
    });
  }

  @SubscribeMessage('reject_call')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { targetUserId?: number; reason?: string },
  ) {
    this.forwardToUser(body?.targetUserId, 'reject_call', {
      fromUserId: this.getUser(client).userId,
      reason: body?.reason ?? 'Call rejected',
    });
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { targetUserId?: number; sdp?: Record<string, unknown> },
  ) {
    if (!body?.sdp) {
      return;
    }

    this.forwardToUser(body?.targetUserId, 'offer', {
      fromUserId: this.getUser(client).userId,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { targetUserId?: number; sdp?: Record<string, unknown> },
  ) {
    if (!body?.sdp) {
      return;
    }

    this.forwardToUser(body?.targetUserId, 'answer', {
      fromUserId: this.getUser(client).userId,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { targetUserId?: number; candidate?: Record<string, unknown> },
  ) {
    if (!body?.candidate) {
      return;
    }

    this.forwardToUser(body?.targetUserId, 'ice_candidate', {
      fromUserId: this.getUser(client).userId,
      candidate: body.candidate,
    });
  }

  private getUser(client: Socket): AuthenticatedUser {
    return client.data.user as AuthenticatedUser;
  }

  private trackSocket(userId: number, socketId: string) {
    const existing = this.socketsByUserId.get(userId);
    if (!existing) {
      this.socketsByUserId.set(userId, new Set([socketId]));
      return;
    }

    existing.add(socketId);
  }

  private untrackSocket(userId: number, socketId: string) {
    const existing = this.socketsByUserId.get(userId);
    if (!existing) {
      return;
    }

    existing.delete(socketId);
    if (existing.size === 0) {
      this.socketsByUserId.delete(userId);
    }
  }

  private getSocketIds(userId: number): string[] {
    const ids = this.socketsByUserId.get(userId);
    return ids ? [...ids] : [];
  }

  private emitOnlineUsers() {
    const onlineUsers: OnlineUser[] = [];

    for (const [userId, socketIds] of this.socketsByUserId.entries()) {
      if (socketIds.size === 0) {
        continue;
      }

      const firstSocketId = [...socketIds][0];
      const socket = this.server.sockets.sockets.get(firstSocketId);
      const user = socket?.data?.user as AuthenticatedUser | undefined;
      if (!user) {
        continue;
      }

      onlineUsers.push({
        userId,
        username: user.username,
      });
    }

    onlineUsers.sort((a, b) => a.username.localeCompare(b.username));
    this.server.emit('online_users', { users: onlineUsers });
  }

  private forwardToUser(targetUserId: number | undefined, event: string, payload: Record<string, unknown>) {
    const userId = Number(targetUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    const targetSocketIds = this.getSocketIds(userId);
    for (const socketId of targetSocketIds) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  private extractTokenFromCookie(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) {
      return null;
    }

    const cookies = parseCookie(cookieHeader);
    const cookieName = process.env.AUTH_COOKIE_NAME ?? 'imcs_auth';
    const token = cookies[cookieName];
    if (!token) {
      return null;
    }

    return token;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return this.extractTokenFromCookie(client);
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { message?: string },
  ) {
    return {
      event: 'pong',
      data: {
        message: body?.message ?? 'pong',
        user: client.data.user,
      },
    };
  }
}
