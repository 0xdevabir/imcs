import { Body, ConflictException, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin')
  async createUser(@Body() body: CreateUserDto) {
    if (this.usersService.findOne(body.username)) {
      throw new ConflictException('Username already exists');
    }

    return this.usersService.createUser(body);
  }

  @Get()
  @Roles('admin')
  listUsers() {
    return this.usersService.findAllSafe();
  }
}
