import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Request,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin')
  async createUser(@Body() body: CreateUserDto) {
    if (await this.usersService.findOne(body.username)) {
      throw new ConflictException('Username already exists');
    }

    return this.usersService.createUser(body);
  }

  @Get()
  @Roles('admin')
  async listUsers() {
    return this.usersService.findAllSafe();
  }

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.usersService.searchUsers(query.trim());
  }

  @Get('all')
  async getAllUsers() {
    return this.usersService.findAllSafe();
  }

  @Get(':username')
  async getUserByUsername(@Param('username') username: string) {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.usersService.findSafeById(user.userId);
  }

  @Patch(':username/role')
  @Roles('admin')
  async updateRole(
    @Param('username') username: string,
    @Body() body: UpdateUserRoleDto,
    @Request() request: { user: { username: string } },
  ) {
    if (username === request.user.username && body.role !== 'admin') {
      throw new BadRequestException('You cannot remove your own admin role');
    }

    const updated = await this.usersService.updateRole(username, body.role);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  @Delete(':username')
  @Roles('admin')
  async deleteUser(
    @Param('username') username: string,
    @Request() request: { user: { username: string } },
  ) {
    if (username === request.user.username) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const deleted = await this.usersService.deleteUser(username);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }

    return { success: true };
  }
}
