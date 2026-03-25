import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SetCommunicationRuleDto } from './dto/set-communication-rule.dto';
import { CommunicationService } from './communication.service';

@Controller('communication-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get()
  listRules() {
    return this.communicationService.listRules();
  }

  @Post()
  setRule(@Body() body: SetCommunicationRuleDto) {
    return this.communicationService.setRule({
      fromUsername: body.fromUsername,
      toUsername: body.toUsername,
      allowed: body.allowed,
      bidirectional: body.bidirectional,
    });
  }

  @Delete(':id')
  deleteRule(@Param('id') id: string) {
    return this.communicationService.deleteRule(id);
  }
}
