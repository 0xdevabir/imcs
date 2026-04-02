import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Query,
  Request,
  Post,
  UseGuards,
  forwardRef,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';
import { EventsGateway } from '../events/events.gateway';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => EventsGateway)) private readonly eventsGateway: EventsGateway,
  ) {}

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

  @Public()
  @Get('all')
  async getAllUsers() {
    return this.usersService.findAllSafe();
  }

  @Get('contacts')
  async getContacts(@Request() req: { user: { userId: number } }) {
    return this.usersService.getContacts(req.user.userId);
  }

  @Post('contacts')
  async addContact(
    @Request() req: { user: { userId: number } },
    @Body() body: { contactUserId: number },
  ) {
    if (!body.contactUserId || !Number.isInteger(body.contactUserId)) {
      throw new BadRequestException('contactUserId is required');
    }
    const result = await this.usersService.addContact(req.user.userId, body.contactUserId);
    if (!result.success) throw new BadRequestException(result.message);
    return { success: true };
  }

  @Delete('contacts/:contactId')
  async removeContact(
    @Request() req: { user: { userId: number } },
    @Param('contactId') contactId: string,
  ) {
    const ok = await this.usersService.removeContact(req.user.userId, Number(contactId));
    if (!ok) throw new NotFoundException('Contact not found');
    return { success: true };
  }

  @Patch('me/username')
  async changeUsername(
    @Request() req: { user: { userId: number; username: string } },
    @Body() body: { newUsername: string },
  ) {
    if (!body.newUsername) throw new BadRequestException('newUsername is required');
    const oldUsername = req.user.username;
    const result = await this.usersService.updateUsername(req.user.userId, body.newUsername);
    if (!result.success) throw new ConflictException(result.message ?? 'Username update failed');
    this.eventsGateway.broadcastUsernameChanged(req.user.userId, oldUsername, result.username!);
    return result;
  }

  @Patch('me/profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'storage/uploads');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const randomName = randomBytes(18).toString('hex');
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `profile-${Date.now()}-${randomName}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedPattern = /^image\/(jpeg|jpg|png|gif|webp)$/i;
        if (!allowedPattern.test(file.mimetype)) {
          cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for profile pictures
      },
    }),
  )
  async updateProfilePicture(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: { user: { userId: number; username: string }; protocol: string; get: (name: string) => string | undefined },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Delete old profile picture if exists
    const oldPic = await this.usersService.getProfilePicture(req.user.userId);
    if (oldPic) {
      const oldPath = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'storage/uploads', oldPic);
      try {
        if (existsSync(oldPath)) {
          unlinkSync(oldPath);
        }
      } catch {
        // Ignore errors when deleting old file
      }
    }

    // Save new filename to DB
    await this.usersService.updateProfilePicture(req.user.userId, file.filename);

    // Build full URL
    const host = req.get('host') ?? 'localhost:3001';
    const protocol = req.protocol ?? 'http';
    const profilePictureUrl = `${protocol}://${host}/files/${file.filename}`;

    // Broadcast to all connected clients
    this.eventsGateway.broadcastProfilePictureChanged(req.user.userId, req.user.username, profilePictureUrl);

    return { profilePicture: profilePictureUrl };
  }

  @Delete('me/profile-picture')
  async removeProfilePicture(
    @Request() req: { user: { userId: number; username: string } },
  ) {
    const oldPic = await this.usersService.getProfilePicture(req.user.userId);
    if (oldPic) {
      const oldPath = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'storage/uploads', oldPic);
      try {
        if (existsSync(oldPath)) {
          unlinkSync(oldPath);
        }
      } catch {
        // Ignore errors when deleting old file
      }
    }

    await this.usersService.updateProfilePicture(req.user.userId, null);
    this.eventsGateway.broadcastProfilePictureChanged(req.user.userId, req.user.username, null);

    return { success: true };
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
