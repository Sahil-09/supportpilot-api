import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200', // Set to your frontend domain in production
  },
})
export class IngestGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  private logger = new Logger(IngestGateway.name);

  afterInit() {
    this.logger.log('WebSocket gateway initialized.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Target a specific socket client by ID
  emitUploadProgress(progress: {
    id: string;
    status: string;
    percentage: number;
    embedded: number;
    totalEmbed: number;
  }) {
    this.server.emit('uploadProgress', progress);
  }

  emitUploadComplete(socketId: string, payload: { id: string }) {
    this.server.to(socketId).emit('uploadComplete', payload);
  }

  emitUploadError(socketId: string, payload: { id: string; message: string }) {
    this.server.to(socketId).emit('uploadError', payload);
  }
}
