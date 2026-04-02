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
import { AddGroupUserDto } from './dto/add-group-user.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupsService } from './groups.service';

type RequestUser = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  createGroup(
    @Body() body: CreateGroupDto,
    @Request() request: { user: RequestUser },
  ) {
    return this.groupsService.createGroup({
      key: body.key,
      name: body.name,
      participantUsernames: body.participantUsernames,
      creator: request.user,
    });
  }

  @Get('mine')
  listMyGroups(@Request() request: { user: RequestUser }) {
    return this.groupsService.listGroupsForUser(request.user);
  }

  @Get(':key')
  getGroupByKey(
    @Param('key') key: string,
    @Request() request: { user: RequestUser },
  ) {
    return this.groupsService.getGroupByKey(key, request.user);
  }

  @Get(':key/participants')
  getParticipants(
    @Param('key') key: string,
    @Request() request: { user: RequestUser },
  ) {
    return this.groupsService.getParticipants(key, request.user);
  }

  @Post(':key/users')
  addUser(
    @Param('key') key: string,
    @Body() body: AddGroupUserDto,
    @Request() request: { user: RequestUser },
  ) {
    return this.groupsService.addUserToGroup({
      roomKey: key,
      username: body.username,
      actor: request.user,
    });
  }

  @Delete(':key/users/:username')
  removeUser(
    @Param('key') key: string,
    @Param('username') username: string,
    @Request() request: { user: RequestUser },
  ) {
    return this.groupsService.removeUserFromGroup({
      roomKey: key,
      username,
      actor: request.user,
    });
  }
}
