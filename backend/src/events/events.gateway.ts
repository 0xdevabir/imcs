import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { parse as parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { EventsService } from './events.service';

type SocketJwtPayload = {
  sub: number;
  username: string;
};

type AuthenticatedUser = {
  userId: number;
  username: string;
};

@WebSocketGateway({
  cors: {
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventsService: EventsService,
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

      client.data.user = { userId: payload.sub, username: payload.username };
      client.emit('connected', client.data.user);
    } catch {
      client.emit('error', 'Unauthorized');
      client.disconnect();
    }
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

    const room = await this.eventsService.ensureRoom(roomKey, body?.roomName);
    await client.join(room.key);
    const messages = await this.eventsService.getRecentMessages(room.key);

    client.emit('room_joined', { room: { key: room.key, name: room.name }, messages });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomKey?: string; content?: string },
  ) {
    const roomKey = body?.roomKey?.trim();
    const content = body?.content?.trim();
    if (!roomKey || !content) {
      client.emit('error', 'roomKey and content are required');
      return;
    }

    const message = await this.eventsService.createMessage({
      roomKey,
      content,
      sender: this.getUser(client),
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

  private getUser(client: Socket): AuthenticatedUser {
    return client.data.user as AuthenticatedUser;
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
