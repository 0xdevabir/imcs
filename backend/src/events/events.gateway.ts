import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

type SocketJwtPayload = {
  sub: number;
  username: string;
};

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

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

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }
}
