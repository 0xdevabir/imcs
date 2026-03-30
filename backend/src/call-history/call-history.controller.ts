import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallHistoryService } from './call-history.service';
import { CreateCallHistoryDto } from './dto/create-call-history.dto';

type RequestUser = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

@Controller('call-history')
@UseGuards(JwtAuthGuard)
export class CallHistoryController {
  constructor(private readonly callHistoryService: CallHistoryService) {}

  @Post()
  saveCallHistory(
    @Body() body: CreateCallHistoryDto,
    @Request() request: { user: RequestUser },
  ) {
    return this.callHistoryService.saveCallHistory(request.user, body);
  }

  @Get()
  getCallHistory(@Request() request: { user: RequestUser }) {
    return this.callHistoryService.getCallHistory(request.user);
  }

  @Delete(':id')
  deleteCallHistory(
    @Param('id') id: string,
    @Request() request: { user: RequestUser },
  ) {
    return this.callHistoryService.deleteCallHistory(request.user, id);
  }

  @Delete()
  clearCallHistory(@Request() request: { user: RequestUser }) {
    return this.callHistoryService.clearCallHistory(request.user);
  }
}
